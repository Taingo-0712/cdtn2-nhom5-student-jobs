const { createHash } = require('node:crypto');
const { readdir, readFile } = require('node:fs/promises');
const path = require('node:path');
const { Client } = require('pg');

// Shared by every migration process on the same database; held across commits.
const MIGRATION_LOCK = [20261106, 5];
const DEFAULT_MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

function createDatabaseClient(env = process.env) {
  if (!env.DB_URL) throw new Error('Thiếu DB_URL trong cấu hình backend.');
  const url = new URL(env.DB_URL);
  if (env.DB_USERNAME) url.username = env.DB_USERNAME;
  if (env.DB_PASSWORD) url.password = env.DB_PASSWORD;
  return new Client({
    connectionString: url.href,
    connectionTimeoutMillis: 5000,
    application_name: 'student-jobs-migrate',
  });
}

async function readMigrations(directory) {
  const filenames = (await readdir(directory)).filter((name) => name.endsWith('.sql'));
  if (!filenames.length) throw new Error('Không tìm thấy migration SQL.');
  const migrations = [];
  const versions = new Set();
  for (const filename of filenames) {
    const match = /^V([0-9]{3})__[a-z0-9_]+\.sql$/.exec(filename);
    if (!match) throw new Error(`Tên migration không hợp lệ: ${filename}`);
    const version = match[1];
    if (versions.has(version)) throw new Error(`Trùng phiên bản migration: V${version}`);
    versions.add(version);
    const content = await readFile(path.join(directory, filename));
    migrations.push({
      version,
      filename,
      checksum: createHash('sha256').update(content).digest('hex'),
      sql: content.toString('utf8'),
    });
  }
  return migrations.sort((a, b) => a.version.localeCompare(b.version));
}

// The caller owns the connected client. Never use a pool across these queries.
async function runMigrations(client, { directory = DEFAULT_MIGRATIONS_DIR, log = console.log } = {}) {
  const migrations = await readMigrations(directory);
  const { rows: [database] } = await client.query('SELECT current_database() AS name');
  log(`Database: ${database.name}`);
  await client.query('SELECT pg_advisory_lock($1, $2)', MIGRATION_LOCK);
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version VARCHAR(3) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const { rows: history } = await client.query(
      'SELECT version, filename, checksum FROM public.schema_migrations ORDER BY version',
    );
    // Validate the complete history before applying any new file.
    for (const applied of history) {
      const migration = migrations.find((item) => item.version === applied.version);
      if (!migration) throw new Error(`Thiếu migration đã áp dụng: ${applied.filename}`);
      if (migration.filename !== applied.filename || migration.checksum !== applied.checksum) {
        throw new Error(`Tên file hoặc checksum không khớp: ${applied.filename}. Giữ nguyên migration đã áp dụng.`);
      }
    }
    const appliedVersions = new Set(history.map((item) => item.version));
    const latestVersion = history.at(-1)?.version;
    if (migrations.some((item) => !appliedVersions.has(item.version) && latestVersion && item.version < latestVersion)) {
      throw new Error('Migration mới có phiên bản thấp hơn lịch sử đã áp dụng.');
    }
    const result = { database: database.name, applied: [], skipped: [] };
    for (const migration of migrations) {
      if (appliedVersions.has(migration.version)) {
        log(`Bỏ qua: ${migration.filename} (checksum khớp)`);
        result.skipped.push(migration.filename);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO public.schema_migrations (version, filename, checksum) VALUES ($1, $2, $3)',
          [migration.version, migration.filename, migration.checksum],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${migration.filename} thất bại: ${error.message}`, { cause: error });
      }
      log(`Đã áp dụng: ${migration.filename}`);
      result.applied.push(migration.filename);
    }
    log(`Kết quả: áp dụng ${result.applied.length}, bỏ qua ${result.skipped.length}.`);
    return result;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1, $2)', MIGRATION_LOCK);
  }
}

async function main() {
  const client = createDatabaseClient();
  try {
    await client.connect();
    await runMigrations(client);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Không thể chạy migration: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { createDatabaseClient, readMigrations, runMigrations, MIGRATION_LOCK };
