const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { promisify } = require('node:util');
const test = require('node:test');
const bcrypt = require('bcryptjs');
const { createDatabaseClient, runMigrations } = require('../scripts/migrate');
const { seedDemo } = require('../scripts/seed-demo');
const { DEMO_PASSWORD, accounts, categories } = require('../seeds/demo');

const execFileAsync = promisify(execFile);

test('T02: seed demo trên PostgreSQL test riêng', {
  skip: process.env.RUN_DB_TESTS !== '1' && 'Đặt RUN_DB_TESTS=1 và nạp backend/.env để chạy PostgreSQL test.',
  timeout: 60000,
}, async (t) => {
  const databaseName = `student_jobs_nhom5_t02_seed_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const url = new URL('postgresql://localhost:5432/postgres');
  const admin = createDatabaseClient({ ...process.env, DB_URL: url.href });
  t.after(() => admin.end());
  await admin.connect();
  assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'postgres');
  assert.match(databaseName, /^student_jobs_nhom5_t02_seed_[0-9]+_[0-9a-f]{8}$/);
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  url.pathname = `/${databaseName}`;
  const testEnv = { ...process.env, DB_URL: url.href };
  const client = createDatabaseClient(testEnv);
  t.after(() => client.end());
  await client.connect();
  assert.equal((await client.query('SELECT current_database() AS name')).rows[0].name, databaseName);
  assert.equal((await client.query("SELECT 1 FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")).rowCount, 0);
  t.diagnostic(`current_database(): ${databaseName}; đã xác nhận DB test trống.`);
  await runMigrations(client, { log: () => {} });

  async function snapshot() {
    const result = {};
    for (const [table, order] of [
      ['users', 'user_id'], ['student_profiles', 'user_id'],
      ['employer_profiles', 'user_id'], ['job_categories', 'category_id'],
    ]) result[table] = (await client.query(`SELECT * FROM public.${table} ORDER BY ${order}`)).rows;
    return result;
  }
  const runCli = () => execFileAsync(process.execPath, ['scripts/seed-demo.js'], {
    cwd: path.join(__dirname, '..'), env: testEnv, timeout: 20000, encoding: 'utf8',
  });
  let initial;
  await t.test('Lần đầu tạo 2 NTD, 3 SV, hồ sơ đúng vai trò và 3 danh mục', async () => {
    const { stdout } = await runCli();
    assert.match(stdout, /Tài khoản: tạo 5, giữ 0; hồ sơ: tạo 5, giữ 0; danh mục: tạo 3, giữ 0/);
    initial = await snapshot();
    assert.equal(initial.users.length, 5);
    assert.equal(initial.employer_profiles.length, 2);
    assert.equal(initial.student_profiles.length, 3);
    assert.deepEqual(initial.job_categories.map((row) => row.name).sort(), [...categories].sort());
    for (const account of accounts) {
      const user = initial.users.find((row) => row.email === account.email);
      assert.ok(user);
      assert.equal(user.role, account.role);
      const employer = account.role === 'EMPLOYER';
      const profiles = employer ? initial.employer_profiles : initial.student_profiles;
      const opposite = employer ? initial.student_profiles : initial.employer_profiles;
      assert.equal(profiles.filter((row) => row.user_id === user.user_id).length, 1);
      assert.equal(opposite.filter((row) => row.user_id === user.user_id).length, 0);
    }
  });
  await t.test('Mật khẩu chỉ lưu bcrypt hash và xác minh được mật khẩu demo', async () => {
    for (const user of initial.users) {
      assert.notEqual(user.password_hash, DEMO_PASSWORD);
      assert.equal(bcrypt.getRounds(user.password_hash), 12);
      assert.ok(await bcrypt.compare(DEMO_PASSWORD, user.password_hash));
    }
  });
  await t.test('Lần hai không nhân đôi, không đổi ID, hash hoặc thời gian/hồ sơ', async () => {
    const { stdout } = await runCli();
    assert.match(stdout, /Tài khoản: tạo 0, giữ 5; hồ sơ: tạo 0, giữ 5; danh mục: tạo 0, giữ 3/);
    assert.deepEqual(await snapshot(), initial);
    for (const table of ['job_posts', 'applications', 'reviews']) {
      assert.equal((await client.query(`SELECT count(*)::int AS count FROM public.${table}`)).rows[0].count, 0);
    }
  });
  await t.test('Chạy lại giữ nguyên mật khẩu và hồ sơ demo đã chỉnh', async () => {
    const student = initial.users.find((row) => row.role === 'STUDENT');
    const changedHash = await bcrypt.hash('ChangedDemo1@Nhom5', 10);
    await client.query('UPDATE public.users SET password_hash = $1 WHERE user_id = $2', [changedHash, student.user_id]);
    await client.query("UPDATE public.student_profiles SET full_name = 'Hồ sơ đã chỉnh' WHERE user_id = $1", [student.user_id]);
    const changed = await snapshot();
    const result = await seedDemo(client, { log: () => {} });
    assert.equal(result.createdUsers, 0);
    assert.deepEqual(await snapshot(), changed);
    // Restore only this test's own values so the retained DB uses documented demo credentials.
    await client.query('UPDATE public.users SET password_hash = $1 WHERE user_id = $2', [student.password_hash, student.user_id]);
    const profile = initial.student_profiles.find((row) => row.user_id === student.user_id);
    await client.query('UPDATE public.student_profiles SET full_name = $1 WHERE user_id = $2', [profile.full_name, student.user_id]);
  });
  await t.test('Xung đột vai trò dừng seed và rollback tài khoản đã tạo trước đó', async () => {
    // Free the first demo email without deleting any existing user/profile.
    const first = initial.users.find((row) => row.email === accounts[0].email);
    const conflict = initial.users.find((row) => row.email === accounts[1].email);
    await client.query("UPDATE public.users SET email = 'saved-first@t02.test' WHERE user_id = $1", [first.user_id]);
    await client.query("UPDATE public.users SET role = 'STUDENT' WHERE user_id = $1", [conflict.user_id]);
    const before = await snapshot();
    try {
      await assert.rejects(seedDemo(client, { log: () => {} }), /Vai trò tài khoản .* khác seed/);
      assert.deepEqual(await snapshot(), before);
    } finally {
      await client.query('UPDATE public.users SET email = $1 WHERE user_id = $2', [first.email, first.user_id]);
      await client.query('UPDATE public.users SET role = $1 WHERE user_id = $2', [conflict.role, conflict.user_id]);
    }
  });
  t.diagnostic(`Giữ lại ${databaseName}: 5 tài khoản, 2 hồ sơ NTD, 3 hồ sơ SV, 3 danh mục; không có CV thật.`);
});
