const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const requireAuth = require('../src/middleware/requireAuth');
const { errorHandler } = require('../src/middleware/errorHandler');

async function serve(t, application) {
  const server = application.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => {
    server.close((err) => err ? reject(err) : resolve());
    server.closeAllConnections();
  }));
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}

function checkError(body, code) {
  assert.equal(body.error.code, code);
  assert.equal(typeof body.error.message, 'string');
  assert.deepEqual(body.error.details, []);
  assert.match(body.trace_id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
}

test('GET /health trả trạng thái ok và CORS cho frontend', async (t) => {
  const url = await serve(t, app);
  const response = await fetch(`${url}/health`, {
    headers: { Origin: 'http://localhost:5173' },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'),
    process.env.CORS_ORIGIN || 'http://localhost:5173');
  assert.deepEqual(await response.json(), { data: { status: 'ok' } });
});

test('Đường dẫn không tồn tại trả lỗi JSON 404', async (t) => {
  const url = await serve(t, app);
  const response = await fetch(`${url}/missing`);
  assert.equal(response.status, 404);
  checkError(await response.json(), 'NOT_FOUND');
});

test('JSON sai trả lỗi validation 400', async (t) => {
  const url = await serve(t, app);
  const response = await fetch(`${url}/health`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
  assert.equal(response.status, 400);
  checkError(await response.json(), 'VALIDATION_ERROR');
});

test('requireAuth kiểm tra chữ ký, thuật toán, claims và hạn JWT', async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  const secret = 'foundation-test-secret-only';
  process.env.JWT_SECRET = secret;
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  const protectedApp = express();
  protectedApp.get('/protected', requireAuth, (req, res) => {
    res.json({ data: { user_id: req.auth.sub } });
  });
  protectedApp.use(errorHandler);
  const url = await serve(t, protectedApp);
  const sign = (claims, options = {}, key = secret) =>
    jwt.sign(claims, key, { algorithm: 'HS256', ...options });

  const cases = [
    ['thiếu header', undefined, 'AUTH_REQUIRED'],
    ['sai định dạng', 'Basic token', 'INVALID_TOKEN'],
    ['token hỏng', 'Bearer broken', 'INVALID_TOKEN'],
    ['sai chữ ký', `Bearer ${sign({ sub: '1' }, { expiresIn: 60 }, 'wrong-secret')}`, 'INVALID_TOKEN'],
    ['hết hạn', `Bearer ${sign({ sub: '1' }, { expiresIn: -1 })}`, 'INVALID_TOKEN'],
    ['sai thuật toán', `Bearer ${sign({ sub: '1' }, { algorithm: 'HS384', expiresIn: 60 })}`, 'INVALID_TOKEN'],
    ['thiếu sub', `Bearer ${sign({}, { expiresIn: 60 })}`, 'INVALID_TOKEN'],
    ['sub không phải chuỗi', `Bearer ${sign({ sub: 1 }, { expiresIn: 60 })}`, 'INVALID_TOKEN'],
    ['thiếu exp', `Bearer ${sign({ sub: '1' })}`, 'INVALID_TOKEN'],
  ];
  for (const [name, authorization, code] of cases) {
    await t.test(name, async () => {
      const response = await fetch(`${url}/protected`, {
        headers: authorization ? { Authorization: authorization } : {},
      });
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('www-authenticate'), 'Bearer');
      checkError(await response.json(), code);
    });
  }
  await t.test('JWT HS256 hợp lệ đi tiếp và gắn req.auth', async () => {
    const response = await fetch(`${url}/protected`, {
      headers: { Authorization: `Bearer ${sign({ sub: '1' }, { expiresIn: 60 })}` },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: { user_id: '1' } });
  });
  await t.test('thiếu JWT_SECRET trả lỗi 500 và không lộ chi tiết', async () => {
    delete process.env.JWT_SECRET;
    const response = await fetch(`${url}/protected`, {
      headers: { Authorization: 'Bearer token' },
    });
    assert.equal(response.status, 500);
    const body = await response.json();
    checkError(body, 'INTERNAL_ERROR');
    assert.equal(JSON.stringify(body).includes('JWT_SECRET'), false);
  });
});
