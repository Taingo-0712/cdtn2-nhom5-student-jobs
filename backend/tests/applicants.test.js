const assert = require('node:assert/strict');
const { test } = require('node:test');
const express = require('express');
const { once } = require('node:events');
const { createApplicationService } = require('../src/services/applicationService');
const { createApplicationRepository } = require('../src/repositories/applicationRepository');
const { createApplicationRouter } = require('../src/routes/applicationRoutes');
const { ApiError, errorHandler } = require('../src/middleware/errorHandler');
const requireAuth = require('../src/middleware/requireAuth');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');

const row = (id = '1001', studentId = '101') => ({
  application_id: id, job_id: '301', student_id: studentId, status: 'PENDING',
  full_name: `Sinh viên ${studentId}`, employer_id: '201', job_title: 'Việc part-time',
  job_status: 'RECRUITING', cv_original_name: `cv-${id}.pdf`,
  cv_mime_type: 'application/pdf', cv_size_bytes: 123,
  applied_at: new Date('2026-11-01T10:00:00Z'), decided_at: null,
  cv_storage_key: 'private/not-for-client', email: 'private@example.test',
  phone: '0900000000', introduction: 'private', password_hash: 'private',
});

function fixture() {
  const calls = [];
  const rows = [row('1002', '102'), row()];
  return {
    calls,
    async findJobOwner(id) {
      calls.push(['owner', id]);
      return ['301', '302'].includes(id) ? { employer_id: '201' } : null;
    },
    async listByJob(id, { size, offset }) {
      calls.push(['list', id, size, offset]);
      return { rows: id === '302' ? [] : rows.slice(offset, offset + size), total: id === '302' ? 0 : 2 };
    },
    async findDetail(id) {
      calls.push(['detail', id]);
      return rows.find((item) => item.application_id === id) || null;
    },
  };
}

async function setup(t, repository = fixture()) {
  const app = express();
  // Test-only authentication boundary, not a replacement for T03/JWT.
  const users = {
    employerA: { user_id: '201', role: 'EMPLOYER' },
    employerB: { user_id: '202', role: 'EMPLOYER' },
    studentA: { user_id: '101', role: 'STUDENT' },
    studentB: { user_id: '103', role: 'STUDENT' },
    admin: { user_id: '1', role: 'ADMIN' },
  };
  app.use(createApplicationRouter({
    service: createApplicationService(repository),
    authenticate(req, res, next) {
      req.testUser = users[req.get('Authorization')];
      next(req.testUser ? undefined : new ApiError(401, 'AUTH_REQUIRED', 'Cần đăng nhập.'));
    },
    getAuthenticatedUser: (req) => req.testUser,
  }));
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    repository,
    async get(path, user = 'employerA') {
      const response = await fetch(base + path, { headers: user ? { Authorization: user } : {} });
      return { status: response.status, body: await response.json(), headers: response.headers };
    },
  };
}

test('K-01: chủ tin đọc danh sách đúng DTO và metadata, không lộ dữ liệu riêng', async (t) => {
  const { get, repository } = await setup(t);
  const { status, body } = await get('/api/jobs/301/applications');
  assert.equal(status, 200);
  assert.deepEqual(body.meta, { page: 1, size: 20, total_elements: 2, total_pages: 1 });
  assert.equal(body.data[0].application_id, '1002');
  assert.deepEqual(body.data[0].student, { user_id: '102', full_name: 'Sinh viên 102' });
  assert.deepEqual(Object.keys(body.data[0]).sort(), ['application_id', 'job_id', 'student_id', 'status', 'cv', 'applied_at', 'decided_at', 'student'].sort());
  assert.deepEqual(body.data[0].cv, {
    original_name: 'cv-1002.pdf', mime_type: 'application/pdf', size_bytes: 123,
    download_url: '/api/applications/1002/cv',
  });
  assert.equal(body.data[0].applied_at, '2026-11-01T10:00:00.000Z');
  assert.equal(body.data[0].decided_at, null);
  assert.doesNotMatch(JSON.stringify(body), /private|cv_storage_key|password|email|phone|introduction/);
  assert.deepEqual(repository.calls, [['owner', '301'], ['list', '301', 20, 0]]);
});

for (const [user, code] of [['employerB', 'RESOURCE_FORBIDDEN'], ['studentA', 'ROLE_FORBIDDEN'], ['admin', 'ROLE_FORBIDDEN']]) {
  test(`K-01: API-15 từ chối ${user} trước truy vấn đơn`, async (t) => {
    const { get, repository } = await setup(t);
    const result = await get('/api/jobs/301/applications', user);
    assert.equal(result.status, 403);
    assert.equal(result.body.error.code, code);
    assert.ok(!repository.calls.some(([name]) => name === 'list'));
  });
}

test('K-01: hai endpoint yêu cầu xác thực, trả lỗi chung và Bearer challenge', async (t) => {
  const { get, repository } = await setup(t);
  for (const path of ['/api/jobs/301/applications', '/api/applications/1001']) {
    const result = await get(path, null);
    assert.equal(result.status, 401);
    assert.equal(result.headers.get('www-authenticate'), 'Bearer');
    assert.deepEqual(result.body.error.details, []);
    assert.equal(typeof result.body.trace_id, 'string');
  }
  assert.deepEqual(repository.calls, []);
});

test('K-01: tin/đơn không tồn tại trả đúng 404', async (t) => {
  const { get } = await setup(t);
  for (const [path, code] of [['/api/jobs/999/applications', 'JOB_NOT_FOUND'], ['/api/applications/999', 'APPLICATION_NOT_FOUND']]) {
    const result = await get(path);
    assert.equal(result.status, 404);
    assert.equal(result.body.error.code, code);
  }
});

test('K-01: tin chưa có ứng viên trả 200, mảng rỗng và tổng bằng 0', async (t) => {
  const { get } = await setup(t);
  const result = await get('/api/jobs/302/applications');
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { data: [], meta: { page: 1, size: 20, total_elements: 0, total_pages: 0 } });
});

test('K-01: chủ đơn và chủ tin đọc API-16; ID khác trả đúng sinh viên/CV', async (t) => {
  const { get } = await setup(t);
  for (const user of ['studentA', 'employerA']) {
    const result = await get('/api/applications/1001', user);
    assert.equal(result.status, 200);
    assert.equal(result.body.data.student.user_id, '101');
    assert.deepEqual(result.body.data.job, { job_id: '301', title: 'Việc part-time', status: 'RECRUITING', employer_id: '201' });
    assert.equal(result.body.data.cv.original_name, 'cv-1001.pdf');
    assert.doesNotMatch(JSON.stringify(result.body), /private|cv_storage_key|password|email|phone|introduction/);
  }
  const second = await get('/api/applications/1002');
  assert.equal(second.body.data.student.user_id, '102');
  assert.equal(second.body.data.cv.download_url, '/api/applications/1002/cv');
});

for (const user of ['studentB', 'employerB', 'admin']) {
  test(`K-01: API-16 chặn ${user}`, async (t) => {
    const { get } = await setup(t);
    const result = await get('/api/applications/1001', user);
    assert.equal(result.status, 403);
    assert.equal(result.body.error.code, 'RESOURCE_FORBIDDEN');
    assert.equal(result.body.data, undefined);
  });
}

test('K-01: phân trang và vượt trang cuối giữ tổng thực tế', async (t) => {
  const { get } = await setup(t);
  for (const [page, ids] of [[1, ['1002']], [2, ['1001']], [3, []]]) {
    const result = await get(`/api/jobs/301/applications?page=${page}&size=1`);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.data.map((item) => item.application_id), ids);
    assert.deepEqual(result.body.meta, { page, size: 1, total_elements: 2, total_pages: 2 });
  }
});

test('K-01: từ chối ID sai/overflow và query sai/lặp/không hỗ trợ', async (t) => {
  const { get, repository } = await setup(t);
  for (const id of ['0', '01', '-1', '1e2', 'abc', '9223372036854775808']) {
    for (const path of [`/api/jobs/${id}/applications`, `/api/applications/${id}`]) {
      const result = await get(path);
      assert.equal(result.status, 400, path);
      assert.equal(result.body.error.code, 'INVALID_ID');
    }
  }
  for (const query of ['page=0', 'size=101', 'page=1.5', 'page=', 'size=-1', 'page=1&page=2', 'page[]=1', 'status=PENDING', 'employer_id=201', 'page=9007199254740991&size=100']) {
    const result = await get(`/api/jobs/301/applications?${query}`);
    assert.equal(result.status, 400, query);
    assert.equal(result.body.error.code, 'INVALID_QUERY');
  }
  const result = await get('/api/applications/1001?page=1');
  assert.equal(result.status, 400);
  assert.equal(result.body.error.code, 'INVALID_QUERY');
  assert.deepEqual(repository.calls, []);
});

test('K-01: BIGINT lớn giữ nguyên chuỗi, decided_at được tuần tự hóa', async () => {
  const repository = fixture();
  repository.findDetail = async () => ({ ...row('9223372036854775807'), status: 'APPROVED', decided_at: new Date('2026-11-02T10:00:00Z') });
  const result = await createApplicationService(repository).getDetail({ user_id: '201', role: 'EMPLOYER' }, '9223372036854775807', new URLSearchParams());
  assert.equal(result.data.application_id, '9223372036854775807');
  assert.equal(result.data.decided_at, '2026-11-02T10:00:00.000Z');
});

test('K-01: lỗi DB trả 500 chung không tiết lộ SQL/storage', async (t) => {
  const repository = fixture();
  repository.findDetail = async () => { throw new Error('SELECT password_hash private/storage'); };
  const { get } = await setup(t, repository);
  const result = await get('/api/applications/1001');
  assert.equal(result.status, 500);
  assert.equal(result.body.error.code, 'INTERNAL_ERROR');
  assert.doesNotMatch(JSON.stringify(result.body), /SELECT|password_hash|storage|stack/);
});

test('K-01: service không nhận người dùng thiếu hoặc sai định dạng ID', async () => {
  const service = createApplicationService(fixture());
  for (const user of [null, { user_id: '0', role: 'EMPLOYER' }, { user_id: 201, role: 'EMPLOYER' }]) {
    await assert.rejects(() => service.getDetail(user, '1001', new URLSearchParams()), { status: 401 });
  }
});

test('K-01: repository dùng pool bên ngoài, SELECT tường minh, tham số hóa và sort ổn định', async () => {
  const calls = [];
  const pool = { async query(sql, params) {
    calls.push({ sql, params });
    if (/COUNT\(\*\)/i.test(sql)) return { rows: [{ ...row(), total: '2' }] };
    return { rows: [row()] };
  } };
  const repository = createApplicationRepository(pool);
  await repository.findJobOwner('301');
  assert.deepEqual(calls[0].params, ['301']);
  const result = await repository.listByJob('301', { size: 1, offset: 1 });
  assert.equal(result.total, 2);
  assert.equal(calls.length, 2, 'Count and page must use one SQL snapshot');
  const list = calls.find(({ sql }) => /ORDER BY/.test(sql));
  assert.match(list.sql, /ORDER BY a\.applied_at DESC, a\.application_id DESC/);
  assert.match(list.sql, /LIMIT \$2 OFFSET \$3/);
  assert.deepEqual(list.params, ['301', 1, 1]);
  await repository.findDetail('1001');
  assert.deepEqual(calls.at(-1).params, ['1001']);
  assert.match(calls.at(-1).sql, /JOIN public\.job_posts/);
  for (const { sql } of calls) {
    assert.doesNotMatch(sql, /SELECT\s+\*|cv_storage_key|password_hash|email|phone|introduction/i);
  }
});

test('K-01: router bắt buộc dependency xác thực, không tự tin claims hoặc mở route công khai', () => {
  assert.throws(() => createApplicationRouter({ service: createApplicationService(fixture()) }), /authenticate/);
  assert.throws(() => createApplicationRouter({ service: createApplicationService(fixture()), authenticate() {} }), /getAuthenticatedUser/);
  assert.throws(() => createApplicationRouter({ service: {}, authenticate() {}, getAuthenticatedUser() {} }), /service/);
  assert.throws(() => createApplicationService({}), /repository/);
});

test('K-01: repository giữ tổng khi trang rỗng trong cùng snapshot SQL', async () => {
  const repository = createApplicationRepository({ async query() { return { rows: [{ application_id: null, total: '21' }] }; } });
  assert.deepEqual(await repository.listByJob('301', { size: 20, offset: 40 }), { rows: [], total: 21 });
  const empty = createApplicationRepository({ async query() { return { rows: [] }; } });
  assert.equal(await empty.findJobOwner('999'), null);
  assert.equal(await empty.findDetail('999'), null);
  assert.throws(() => createApplicationRepository(null), /pool/);
  assert.throws(() => createApplicationRepository({}), /pool/);
});

test('K-01: router kết hợp middleware JWT hiện có, token sai/hết hạn bị chặn', async (t) => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = randomUUID();
  t.after(() => {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  });
  const app = express();
  let resolveCalls = 0;
  app.use(createApplicationRouter({
    service: createApplicationService(fixture()), authenticate: requireAuth,
    getAuthenticatedUser(req) {
      resolveCalls++;
      // Fixture for T03's account lookup; role deliberately NOT copied from claims.
      assert.equal(req.auth.sub, '201');
      return { user_id: '201', role: 'EMPLOYER' };
    },
  }));
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/jobs/301/applications`;
  const expired = jwt.sign({ sub: '201' }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: -10 });
  const wrongSignature = jwt.sign({ sub: '201' }, randomUUID(), { algorithm: 'HS256', expiresIn: 60 });
  for (const token of ['bad-token', expired, wrongSignature]) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, 'INVALID_TOKEN');
  }
  assert.equal(resolveCalls, 0);
  const valid = jwt.sign({ sub: '201' }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: 60 });
  const response = await fetch(url, { headers: { Authorization: `Bearer ${valid}` } });
  assert.equal(response.status, 200);
  assert.equal(resolveCalls, 1);
});
