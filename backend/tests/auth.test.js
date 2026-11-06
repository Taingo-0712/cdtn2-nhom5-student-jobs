const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomBytes, randomUUID } = require('node:crypto');
const test = require('node:test');
const jwt = require('jsonwebtoken');
const { createDatabaseClient, runMigrations } = require('../scripts/migrate');
const { seedDemo } = require('../scripts/seed-demo');
const { accounts, DEMO_PASSWORD } = require('../seeds/demo');

// The app captures this URL when creating its Pool. Never use the development DB.
const databaseName = `student_jobs_nhom5_t03_test_${Date.now()}_${randomUUID().slice(0, 8)}`;
const testUrl = new URL(process.env.DB_URL || 'postgresql://localhost:5432/student_jobs_nhom5');
testUrl.pathname = `/${databaseName}`;
process.env.DB_URL = testUrl.href;
process.env.JWT_SECRET = randomBytes(32).toString('hex');
const app = require('../src/app');
const pool = require('../src/config/db');

async function serve(t) {
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}/api/auth/login`;
}

async function post(url, body) {
  return fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

async function expectError(response, status, code) {
  assert.equal(response.status, status);
  const payload = await response.json();
  assert.equal(payload.error.code, code);
  assert.deepEqual(payload.error.details, []);
  assert.ok(payload.trace_id);
  assert.equal(payload.data, undefined);
  if (status === 401) assert.equal(response.headers.get('www-authenticate'), 'Bearer');
  return payload;
}

test('API-02: kiểm tra request trước khi truy vấn DB', async (t) => {
  const url = await serve(t);
  await t.test('Content-Type không phải JSON trả 415', async () => {
    await expectError(await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'hello' }), 415, 'UNSUPPORTED_MEDIA_TYPE');
  });
  await t.test('JSON hỏng trả 400', async () => {
    await expectError(await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }), 400, 'VALIDATION_ERROR');
  });
  const invalid = [
    ['body là mảng', [], 'VALIDATION_ERROR'],
    ['thiếu trường', {}, 'VALIDATION_ERROR'],
    ['trường role ngoài contract', { email: accounts[0].email, password: DEMO_PASSWORD, role: 'ADMIN' }, 'FIELD_NOT_ALLOWED'],
    ['email sai định dạng', { email: 'invalid', password: DEMO_PASSWORD }, 'VALIDATION_ERROR'],
    ['email quá dài', { email: 'a'.repeat(250) + '@t.test', password: DEMO_PASSWORD }, 'VALIDATION_ERROR'],
    ['email không phải chuỗi', { email: 1, password: DEMO_PASSWORD }, 'VALIDATION_ERROR'],
    ['password không phải chuỗi', { email: accounts[0].email, password: null }, 'VALIDATION_ERROR'],
    ['password rỗng', { email: accounts[0].email, password: '' }, 'VALIDATION_ERROR'],
    ['password quá dài', { email: accounts[0].email, password: 'a'.repeat(129) }, 'VALIDATION_ERROR'],
  ];
  for (const [name, body, code] of invalid) {
    await t.test(name, async () => expectError(await post(url, body), 400, code));
  }
});

test('API-02: đăng nhập thật trên PostgreSQL test riêng', {
  skip: process.env.RUN_DB_TESTS !== '1' && 'Bật RUN_DB_TESTS=1 và nạp .env để kiểm thử đăng nhập với DB test.',
  timeout: 60000,
}, async (t) => {
  t.after(() => pool.end());
  const adminUrl = new URL(testUrl);
  adminUrl.pathname = '/postgres';
  const admin = createDatabaseClient({ ...process.env, DB_URL: adminUrl.href });
  t.after(() => admin.end());
  await admin.connect();
  assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'postgres');
  assert.match(databaseName, /^student_jobs_nhom5_t03_test_[0-9]+_[0-9a-f]{8}$/);
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  const client = await pool.connect();
  try {
    assert.equal((await client.query('SELECT current_database() AS name')).rows[0].name, databaseName);
    assert.equal((await client.query("SELECT 1 FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")).rowCount, 0);
    await runMigrations(client, { log: () => {} });
    await seedDemo(client, { log: () => {} });
    // Synthetic ADMIN account only in this new test database.
    await client.query(`INSERT INTO public.users (email, password_hash, role)
      SELECT 'admin@t03.test', password_hash, 'ADMIN' FROM public.users WHERE email = $1`, [accounts[0].email]);
  } finally {
    client.release();
  }
  t.diagnostic(`current_database(): ${databaseName}; đã xác nhận DB trống rồi chạy migration/seed.`);
  const url = await serve(t);
  for (const account of accounts) {
    await t.test(`Đăng nhập ${account.role}: ${account.email}`, async () => {
      const response = await post(url, { email: `  ${account.email.toUpperCase()}  `, password: DEMO_PASSWORD });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const { data } = await response.json();
      assert.equal(data.token_type, 'Bearer');
      assert.equal(data.expires_in, 3600);
      assert.equal(data.user.email, account.email);
      assert.equal(data.user.role, account.role);
      assert.equal(typeof data.user.user_id, 'string');
      assert.ok(!Number.isNaN(Date.parse(data.user.created_at)));
      assert.deepEqual(Object.keys(data.user).sort(), ['created_at', 'email', 'role', 'user_id']);
      const verified = jwt.verify(data.access_token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      assert.equal(verified.sub, data.user.user_id);
      assert.equal(verified.role, account.role);
      assert.equal(verified.exp - verified.iat, 3600);
      assert.deepEqual(Object.keys(verified).sort(), ['exp', 'iat', 'role', 'sub']);
    });
  }
  await t.test('Sai email và sai mật khẩu trả cùng lỗi 401', async () => {
    const missing = await expectError(await post(url, { email: 'missing@t03.test', password: DEMO_PASSWORD }), 401, 'INVALID_CREDENTIALS');
    const wrong = await expectError(await post(url, { email: accounts[0].email, password: 'wrong-password' }), 401, 'INVALID_CREDENTIALS');
    assert.deepEqual(missing.error, wrong.error);
  });
  await t.test('Không trim mật khẩu', async () => {
    await expectError(await post(url, { email: accounts[0].email, password: `${DEMO_PASSWORD} ` }), 401, 'INVALID_CREDENTIALS');
  });
  await t.test('ADMIN bị từ chối trong Demo 1', async () => {
    await expectError(await post(url, { email: 'admin@t03.test', password: DEMO_PASSWORD }), 401, 'INVALID_CREDENTIALS');
  });
  await t.test('Thiếu secret trả lỗi hệ thống và không lộ chi tiết', async () => {
    const secret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      const payload = await expectError(await post(url, { email: accounts[0].email, password: DEMO_PASSWORD }), 500, 'INTERNAL_ERROR');
      assert.equal(payload.error.message, 'Đã xảy ra lỗi hệ thống.');
    } finally {
      process.env.JWT_SECRET = secret;
    }
  });
});
