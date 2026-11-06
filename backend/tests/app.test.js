const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const app = require('../src/app');

test('Express trả health, header CORS và lỗi JSON cho đường dẫn sai', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const origin = 'http://localhost:5173';
  const health = await fetch(`${baseUrl}/health`, {
    headers: { Origin: origin },
  });

  assert.equal(health.status, 200);
  assert.equal(health.headers.get('access-control-allow-origin'), origin);
  assert.deepEqual(await health.json(), { data: { status: 'ok' } });

  const missing = await fetch(`${baseUrl}/missing-route`);
  const payload = await missing.json();
  assert.equal(missing.status, 404);
  assert.equal(payload.error.code, 'NOT_FOUND');
  assert.deepEqual(payload.error.details, []);
  assert.ok(payload.trace_id);
});
