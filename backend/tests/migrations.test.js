const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { mkdtemp, cp, appendFile, writeFile, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');
const test = require('node:test');
const { createDatabaseClient, runMigrations, MIGRATION_LOCK } = require('../scripts/migrate');

const execFileAsync = promisify(execFile);
const backendDirectory = path.join(__dirname, '..');

test('T02: migration trên PostgreSQL test riêng', {
  skip: process.env.RUN_DB_TESTS !== '1' && 'Đặt RUN_DB_TESTS=1 và nạp backend/.env để chạy PostgreSQL test.',
  timeout: 60000,
}, async (t) => {
  const testUrl = new URL('postgresql://localhost:5432/student_jobs_nhom5_t02_test');
  const adminUrl = new URL(testUrl);
  adminUrl.pathname = '/postgres';
  const admin = createDatabaseClient({ ...process.env, DB_URL: adminUrl.href });
  t.after(() => admin.end());
  await admin.connect();
  assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'postgres');

  let databaseName = testUrl.pathname.slice(1);
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
  if (exists.rowCount) {
    const previous = createDatabaseClient({ ...process.env, DB_URL: testUrl.href });
    try {
      await previous.connect();
      assert.equal((await previous.query('SELECT current_database() AS name')).rows[0].name, databaseName);
      const tables = await previous.query(
        "SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')",
      );
      if (tables.rowCount) {
        t.diagnostic(`${databaseName} đã có ${tables.rowCount} bảng; giữ nguyên và dùng DB test mới.`);
        databaseName += `_${Date.now()}_${randomUUID().slice(0, 8)}`;
      }
    } finally {
      await previous.end();
    }
  }
  if (!exists.rowCount || databaseName !== testUrl.pathname.slice(1)) {
    assert.match(databaseName, /^student_jobs_nhom5_t02_test(?:_[0-9]+_[0-9a-f]{8})?$/);
    await admin.query(`CREATE DATABASE "${databaseName}"`);
  }
  testUrl.pathname = `/${databaseName}`;
  const testEnv = { ...process.env, DB_URL: testUrl.href };
  const client = createDatabaseClient(testEnv);
  t.after(() => client.end());
  await client.connect();
  const identity = await client.query('SELECT current_database() AS name, version() AS version');
  assert.equal(identity.rows[0].name, databaseName);
  t.diagnostic(`current_database(): ${identity.rows[0].name}; ${identity.rows[0].version}`);
  const initialTables = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')",
  );
  assert.equal(initialTables.rowCount, 0, 'Database test phải trống trước migration');
  t.diagnostic('Đã xác nhận database test trống trước khi chạy migration.');

  const runCli = () => execFileAsync(process.execPath, ['scripts/migrate.js'], {
    cwd: backendDirectory, env: testEnv, timeout: 15000, encoding: 'utf8',
  });
  let originalHistory;
  await t.test('Lần đầu: 7 bảng nghiệp vụ, 5 dòng lịch sử và đủ 7 index', async () => {
    const { stdout } = await runCli();
    assert.match(stdout, /áp dụng 5, bỏ qua 0/);
    const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    assert.deepEqual(tables.rows.map((row) => row.tablename), [
      'applications', 'employer_profiles', 'job_categories', 'job_posts',
      'reviews', 'schema_migrations', 'student_profiles', 'users',
    ]);
    originalHistory = (await client.query('SELECT * FROM public.schema_migrations ORDER BY version')).rows;
    assert.deepEqual(originalHistory.map((row) => row.version), ['001', '002', '003', '004', '005']);
    for (const row of originalHistory) {
      assert.match(row.checksum, /^[0-9a-f]{64}$/);
      assert.ok(row.filename.startsWith(`V${row.version}__`));
    }
    const indexes = await client.query("SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%'");
    assert.deepEqual(indexes.rows.map((row) => row.indexname).sort(), [
      'idx_apps_job_status', 'idx_apps_student_applied', 'idx_jobs_category',
      'idx_jobs_employer_created', 'idx_jobs_status_created', 'idx_reviews_reviewee', 'idx_reviews_reviewer',
    ]);
  });
  await t.test('Lần hai: bỏ qua đủ 5 file và không đổi lịch sử', async () => {
    const { stdout } = await runCli();
    assert.match(stdout, /áp dụng 0, bỏ qua 5/);
    assert.deepEqual((await client.query('SELECT * FROM public.schema_migrations ORDER BY version')).rows, originalHistory);
  });

  await client.query('BEGIN');
  try {
    const employer = (await client.query("INSERT INTO public.users (email, password_hash, role) VALUES ('employer@t02.test', 'test-hash', 'EMPLOYER') RETURNING user_id")).rows[0].user_id;
    await client.query("INSERT INTO public.employer_profiles (user_id, display_name) VALUES ($1, 'NTD test')", [employer]);
    const student = (await client.query("INSERT INTO public.users (email, password_hash, role) VALUES ('student@t02.test', 'test-hash', 'STUDENT') RETURNING user_id")).rows[0].user_id;
    await client.query("INSERT INTO public.student_profiles (user_id, full_name) VALUES ($1, 'SV test')", [student]);
    const category = (await client.query("INSERT INTO public.job_categories (name) VALUES ('Danh mục test') RETURNING category_id")).rows[0].category_id;
    const insertJob = `INSERT INTO public.job_posts
      (employer_id, category_id, title, description, work_time, salary_min, salary_max, salary_unit, city, location_detail)
      VALUES ($1, $2, 'Tin test', 'Mô tả test', 'Ca sáng', $3, $4, 'HOUR', 'TP.HCM', 'Địa chỉ test') RETURNING job_id`;
    const job = (await client.query(insertJob, [employer, category, 25000, 35000])).rows[0].job_id;
    const insertApplication = `INSERT INTO public.applications
      (job_id, student_id, cv_storage_key, cv_original_name, cv_mime_type, cv_size_bytes)
      VALUES ($1, $2, $3, 'test.pdf', 'application/pdf', 100)`;
    async function rejectsWithCode(sql, params, code, constraint) {
      await client.query('SAVEPOINT invalid_data');
      try {
        await assert.rejects(client.query(sql, params), (error) => {
          assert.equal(error.code, code);
          if (constraint) assert.equal(error.constraint, constraint);
          return true;
        });
      } finally {
        await client.query('ROLLBACK TO SAVEPOINT invalid_data');
        await client.query('RELEASE SAVEPOINT invalid_data');
      }
    }
    await t.test('FK chặn student_id không tồn tại (23503)', () =>
      rejectsWithCode(insertApplication, [job, '9223372036854775807', 'missing-student.pdf'], '23503', 'applications_student_id_fkey'));
    await client.query(insertApplication, [job, student, 'first-cv.pdf']);
    await t.test('UNIQUE chặn trùng SV/tin với hai khóa CV khác nhau (23505)', () =>
      rejectsWithCode(insertApplication, [job, student, 'second-cv.pdf'], '23505', 'uq_applications_student_job'));
    await t.test('CHECK chặn salary_max nhỏ hơn salary_min (23514)', () =>
      rejectsWithCode(insertJob, [employer, category, 35000, 25000], '23514'));
  } finally {
    await client.query('ROLLBACK');
  }

  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'cdtn2-t02-migrations-'));
  // Only this newly-created temporary directory is removed; never a database or source migration.
  t.after(() => {
    assert.equal(path.dirname(path.resolve(tempDirectory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(tempDirectory).startsWith('cdtn2-t02-migrations-'));
    return rm(tempDirectory, { recursive: true, force: true });
  });
  await cp(path.join(backendDirectory, 'migrations'), tempDirectory, { recursive: true });
  await t.test('Checksum lệch bị từ chối, không thay đổi lịch sử', async () => {
    const target = path.join(tempDirectory, 'V005__add_demo_indexes.sql');
    await appendFile(target, '\n-- checksum test only\n');
    await assert.rejects(runMigrations(client, { directory: tempDirectory, log: () => {} }), /checksum không khớp/);
    assert.deepEqual((await client.query('SELECT * FROM public.schema_migrations ORDER BY version')).rows, originalHistory);
    await cp(path.join(backendDirectory, 'migrations', 'V005__add_demo_indexes.sql'), target);
  });
  await t.test('SQL lỗi rollback cả DDL và dòng lịch sử của file', async () => {
    await writeFile(path.join(tempDirectory, 'V006__rollback_test.sql'),
      'CREATE TABLE public.t02_rollback_probe (id INTEGER); SELECT * FROM public.t02_missing_table;');
    await assert.rejects(runMigrations(client, { directory: tempDirectory, log: () => {} }), /V006__rollback_test.sql thất bại/);
    assert.equal((await client.query("SELECT to_regclass('public.t02_rollback_probe') AS name")).rows[0].name, null);
    assert.deepEqual((await client.query('SELECT * FROM public.schema_migrations ORDER BY version')).rows, originalHistory);
  });
  await t.test('Tiến trình thứ hai đợi khóa migration đến khi tiến trình đầu nhả khóa', async () => {
    const other = createDatabaseClient(testEnv);
    await other.connect();
    let locked = false;
    let pending;
    try {
      const otherPid = (await other.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      await client.query('SELECT pg_advisory_lock($1, $2)', MIGRATION_LOCK);
      locked = true;
      pending = runMigrations(other, { log: () => {} });
      // Observe the actual PostgreSQL lock wait, rather than relying on a fixed sleep.
      const deadline = Date.now() + 5000;
      let waiting = false;
      while (Date.now() < deadline) {
        const result = await client.query('SELECT $1::int = ANY(pg_blocking_pids($2)) AS waiting', [client.processID, otherPid]);
        if (result.rows[0].waiting) { waiting = true; break; }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      assert.ok(waiting, 'Runner thứ hai phải bị khóa bởi runner thứ nhất');
      await client.query('SELECT pg_advisory_unlock($1, $2)', MIGRATION_LOCK);
      locked = false;
      const result = await pending;
      assert.equal(result.applied.length, 0);
      assert.equal(result.skipped.length, 5);
    } finally {
      if (locked) await client.query('SELECT pg_advisory_unlock($1, $2)', MIGRATION_LOCK);
      if (pending) await pending.catch(() => {});
      await other.end();
    }
  });
  t.diagnostic(`Giữ lại database ${databaseName} để xem 7 bảng nghiệp vụ và 5 dòng lịch sử; dữ liệu thử đã rollback.`);
});
