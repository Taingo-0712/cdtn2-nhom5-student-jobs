const bcrypt = require('bcryptjs');
const { createDatabaseClient, MIGRATION_LOCK } = require('./migrate');
const { DEMO_PASSWORD, accounts, categories } = require('../seeds/demo');

// Caller owns a connected client that is not already inside a transaction.
async function seedDemo(client, { log = console.log } = {}) {
  const { rows: [database] } = await client.query('SELECT current_database() AS name');
  log(`Database seed: ${database.name}`);
  const result = {
    database: database.name,
    createdUsers: 0, existingUsers: 0,
    createdProfiles: 0, existingProfiles: 0,
    createdCategories: 0, existingCategories: 0,
  };
  await client.query('BEGIN');
  try {
    // Serializes seeds and prevents overlap with this repo's migration runner.
    await client.query('SELECT pg_advisory_xact_lock($1, $2)', MIGRATION_LOCK);
    const history = await client.query('SELECT version FROM public.schema_migrations ORDER BY version');
    const versions = new Set(history.rows.map((row) => row.version));
    if (['001', '002', '003', '004', '005'].some((version) => !versions.has(version))) {
      throw new Error('Cần chạy đủ V001–V005 bằng npm run db:migrate trước khi seed.');
    }

    for (const account of accounts) {
      const email = account.email.trim().toLowerCase();
      let existing = (await client.query(
        'SELECT user_id, role FROM public.users WHERE email = $1 FOR UPDATE', [email],
      )).rows[0];
      if (!existing) {
        const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
        const inserted = await client.query(
          `INSERT INTO public.users (email, password_hash, role) VALUES ($1, $2, $3)
           ON CONFLICT (email) DO NOTHING RETURNING user_id, role`,
          [email, passwordHash, account.role],
        );
        if (inserted.rowCount) {
          existing = inserted.rows[0];
          result.createdUsers++;
        } else {
          existing = (await client.query(
            'SELECT user_id, role FROM public.users WHERE email = $1 FOR UPDATE', [email],
          )).rows[0];
          result.existingUsers++;
        }
      } else {
        result.existingUsers++;
      }
      if (existing.role !== account.role) {
        throw new Error(`Vai trò tài khoản ${email} khác seed; dừng và giữ nguyên dữ liệu.`);
      }
      const employer = account.role === 'EMPLOYER';
      const profileTable = employer ? 'employer_profiles' : 'student_profiles';
      const oppositeTable = employer ? 'student_profiles' : 'employer_profiles';
      const nameColumn = employer ? 'display_name' : 'full_name';
      const opposite = await client.query(`SELECT 1 FROM public.${oppositeTable} WHERE user_id = $1`, [existing.user_id]);
      if (opposite.rowCount) throw new Error(`Tài khoản ${email} có hồ sơ sai vai trò; dừng và giữ nguyên dữ liệu.`);
      // Table and column names come only from the fixed role mapping above.
      const profile = await client.query(
        `INSERT INTO public.${profileTable} (user_id, ${nameColumn}) VALUES ($1, $2)
         ON CONFLICT (user_id) DO NOTHING RETURNING user_id`,
        [existing.user_id, account.name],
      );
      if (profile.rowCount) result.createdProfiles++;
      else result.existingProfiles++;
    }
    for (const name of categories) {
      const category = await client.query(
        'INSERT INTO public.job_categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING category_id',
        [name],
      );
      if (category.rowCount) result.createdCategories++;
      else result.existingCategories++;
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
  log(`Tài khoản: tạo ${result.createdUsers}, giữ ${result.existingUsers}; hồ sơ: tạo ${result.createdProfiles}, giữ ${result.existingProfiles}; danh mục: tạo ${result.createdCategories}, giữ ${result.existingCategories}.`);
  return result;
}

async function main() {
  const client = createDatabaseClient();
  try {
    await client.connect();
    await seedDemo(client);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Không thể seed demo: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { seedDemo };
