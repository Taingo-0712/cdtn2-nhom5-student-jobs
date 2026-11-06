const assert = require('node:assert/strict');
const { once } = require('node:events');
const test = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.DB_URL ||= 'postgresql://localhost:5432/student_jobs_nhom5_t03_test';
const pool = require('../src/config/db');
const requireAuth = require('../src/middleware/requireAuth');
const requireRole = require('../src/middleware/requireRole');
const { errorHandler } = require('../src/middleware/errorHandler');

test('T-02/T-03: đối chiếu tài khoản và phân quyền qua HTTP (giả lập truy vấn DB)', async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  const secret = 'authorization-test-secret-only';
  process.env.JWT_SECRET = secret;
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  t.mock.method(pool, 'query', async (sql, params) => {
    assert.equal(sql, 'SELECT role FROM users WHERE user_id = $1');
    assert.equal(typeof params[0], 'string');
    if (params[0] === '5') throw new Error('private-postgres-test-error');
    const role = { '1': 'STUDENT', '2': 'EMPLOYER', '4': 'STUDENT', '9223372036854775807': 'EMPLOYER' }[params[0]];
    return { rows: role ? [{ role }] : [] };
  });
  let handlerCalls = 0;
  const handler = (req, res) => {
    handlerCalls++;
    res.json({ data: { user_id: req.auth.sub, role: req.auth.role } });
  };
  const app = express();
  app.get('/employer', requireAuth, requireRole('EMPLOYER'), handler);
  app.get('/both', requireAuth, requireRole('STUDENT', 'EMPLOYER'), handler);
  app.get('/role-only', requireRole('EMPLOYER'), handler);
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const sign = (sub, role, options = {}, key = secret) =>
    jwt.sign({ role }, key, { subject: sub, expiresIn: 60, algorithm: 'HS256', ...options });
  async function request(route, token) {
    return fetch(`${base}${route}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  }
  const rejected = [
    ['Thiếu Authorization', '/employer', null, 401, 'AUTH_REQUIRED'],
    ['Sai chữ ký', '/employer', sign('2', 'EMPLOYER', {}, 'wrong-secret'), 401, 'INVALID_TOKEN'],
    ['Hết hạn', '/employer', sign('2', 'EMPLOYER', { expiresIn: -1 }), 401, 'INVALID_TOKEN'],
    ['Tài khoản không còn', '/employer', sign('3', 'STUDENT'), 401, 'INVALID_TOKEN'],
    ['Vai trò DB đã đổi', '/employer', sign('4', 'EMPLOYER'), 401, 'INVALID_TOKEN'],
    ['SV gọi route NTD', '/employer', sign('1', 'STUDENT'), 403, 'ROLE_FORBIDDEN'],
    ['requireRole thiếu req.auth', '/role-only', null, 401, 'AUTH_REQUIRED'],
    ['PostgreSQL lỗi trả 500', '/employer', sign('5', 'EMPLOYER'), 500, 'INTERNAL_ERROR'],
  ];
  for (const [name, route, token, status, code] of rejected) {
    await t.test(name, async () => {
      const before = handlerCalls;
      const response = await request(route, token);
      assert.equal(response.status, status);
      const payload = await response.json();
      assert.equal(payload.error.code, code);
      assert.deepEqual(payload.error.details, []);
      assert.ok(payload.trace_id);
      assert.equal(payload.data, undefined);
      assert.equal(JSON.stringify(payload).includes('private-postgres-test-error'), false);
      assert.equal(response.headers.get('www-authenticate'), status === 401 ? 'Bearer' : null);
      assert.equal(handlerCalls, before, 'Request bị từ chối không được chạy handler');
    });
  }
  const accepted = [
    ['NTD gọi route NTD', '/employer', '2', 'EMPLOYER'],
    ['SV gọi route cho phép hai vai trò', '/both', '1', 'STUDENT'],
    ['ID BIGINT lớn nhất vẫn là chuỗi', '/employer', '9223372036854775807', 'EMPLOYER'],
  ];
  for (const [name, route, sub, role] of accepted) {
    await t.test(name, async () => {
      const before = handlerCalls;
      const response = await request(route, sign(sub, role));
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { data: { user_id: sub, role } });
      assert.equal(handlerCalls, before + 1);
    });
  }
});
