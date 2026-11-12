const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { once } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');
const test = require('node:test');
const jwt = require('jsonwebtoken');
const { createDatabaseClient, runMigrations } = require('../scripts/migrate');
const { seedDemo } = require('../scripts/seed-demo');

test('P-04 — API-19 trên PostgreSQL test riêng', {
  skip: process.env.RUN_DB_TESTS !== '1' && 'Bật RUN_DB_TESTS=1 để chạy test PostgreSQL.',
  timeout: 30000,
}, async (t) => {
  const databaseName = `student_jobs_nhom5_p04_test_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(process.env.DB_URL || 'postgresql://localhost:5432/student_jobs_nhom5');
  url.pathname = '/postgres';
  const admin = createDatabaseClient({ ...process.env, DB_URL: url.href });
  await admin.connect();
  let server;
  let pool;
  let createdDatabase = false;
  t.after(async () => {
    try {
      if (server) {
        await new Promise((resolve, reject) => {
          server.close((error) => error ? reject(error) : resolve());
          server.closeAllConnections();
        });
      }
      if (pool) await pool.end();
      if (createdDatabase) await admin.query(`DROP DATABASE "${databaseName}"`);
    } finally {
      await admin.end();
    }
  });

  await admin.query(`CREATE DATABASE "${databaseName}"`);
  createdDatabase = true;
  url.pathname = `/${databaseName}`;
  process.env.DB_URL = url.href;
  process.env.JWT_SECRET = randomBytes(32).toString('hex');

  const app = require('../src/app');
  pool = require('../src/config/db');
  const client = await pool.connect();
  try {
    await runMigrations(client, { log: () => {} });
    await seedDemo(client, { log: () => {} });
  } finally {
    client.release();
  }
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;

  const { rows: users } = await pool.query('SELECT user_id::text, email, role FROM public.users');
  const { user_id: ownerId } = users.find(({ email }) => email.startsWith('ntd.a@'));
  const [studentA, studentB] = users.filter(({ role }) => role === 'STUDENT');
  const categoryId = (await pool.query('SELECT min(category_id)::text AS id FROM public.job_categories')).rows[0].id;
  const tokenFor = (prefix) => {
    const { user_id, role } = users.find(({ email }) => email.startsWith(prefix));
    return jwt.sign({ sub: user_id, role }, process.env.JWT_SECRET, { expiresIn: '5m' });
  };
  const owner = tokenFor('ntd.a@');
  const other = tokenFor('ntd.b@');
  const student = tokenFor('sv.a@');

  async function createJob(title) {
    const { rows } = await pool.query(
      `INSERT INTO public.job_posts
         (employer_id, category_id, title, description, work_time, salary_min, salary_max,
          salary_unit, city, location_detail)
       VALUES ($1, $2, $3, 'Test P04', '18:00–21:00', 30000, 40000, 'HOUR', 'TP.HCM', 'Địa chỉ thử')
       RETURNING job_id::text`,
      [ownerId, categoryId, title]
    );
    return rows[0].job_id;
  }

  async function insertApplication(db, jobId, applicant, status) {
    await db.query(
      `INSERT INTO public.applications
         (job_id, student_id, status, cv_storage_key, cv_original_name, cv_mime_type, cv_size_bytes, decided_at)
       VALUES ($1, $2, $3, $4, 'test.pdf', 'application/pdf', 100,
         CASE WHEN $3::varchar = 'PENDING' THEN NULL ELSE CURRENT_TIMESTAMP END)`,
      [jobId, applicant.user_id, status, randomUUID()]
    );
  }

  async function patch(jobId, body = { status: 'FILLED' }, token = owner) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${origin}/api/jobs/${jobId}/status`, {
      method: 'PATCH', headers, body: JSON.stringify(body),
    });
    return { status: response.status, payload: await response.json() };
  }

  function expectError(result, status, code) {
    assert.equal(result.status, status);
    assert.equal(result.payload.error.code, code);
  }

  await t.test('Đủ điều kiện, đơn giữ nguyên và gửi lặp trả 409', async () => {
    const jobId = await createJob('Đủ điều kiện');
    await insertApplication(pool, jobId, studentA, 'APPROVED');
    await insertApplication(pool, jobId, studentB, 'REJECTED');
    const { status, payload } = await patch(jobId);
    assert.equal(status, 200);
    assert.deepEqual(payload.data, {
      job_id: jobId, status: 'FILLED', completed_at: null, updated_at: payload.data.updated_at,
    });
    assert.ok(Number.isFinite(Date.parse(payload.data.updated_at)));
    const jobs = await pool.query('SELECT status FROM public.job_posts WHERE job_id = $1', [jobId]);
    assert.equal(jobs.rows[0].status, 'FILLED');
    const applications = await pool.query('SELECT status FROM public.applications WHERE job_id = $1 ORDER BY status', [jobId]);
    assert.deepEqual(applications.rows.map(({ status }) => status), ['APPROVED', 'REJECTED']);
    expectError(await patch(jobId), 409, 'INVALID_JOB_TRANSITION');
  });

  await t.test('Ưu tiên lỗi còn PENDING, kể cả khi chưa có APPROVED', async () => {
    const jobId = await createJob('Còn đơn chờ');
    await insertApplication(pool, jobId, studentA, 'PENDING');
    expectError(await patch(jobId), 409, 'PENDING_APPLICATIONS_EXIST');
    await insertApplication(pool, jobId, studentB, 'APPROVED');
    expectError(await patch(jobId), 409, 'PENDING_APPLICATIONS_EXIST');
  });

  await t.test('Thiếu đơn duyệt, sai quyền, sai bước và sai đầu vào', async () => {
    const jobId = await createJob('Chưa có đơn duyệt');
    expectError(await patch(jobId), 409, 'NO_APPROVED_APPLICATION');
    expectError(await patch(jobId, { status: 'COMPLETED' }), 409, 'INVALID_JOB_TRANSITION');
    expectError(await patch(jobId, undefined, null), 401, 'AUTH_REQUIRED');
    expectError(await patch(jobId, undefined, student), 403, 'ROLE_FORBIDDEN');
    expectError(await patch(jobId, undefined, other), 403, 'RESOURCE_FORBIDDEN');
    expectError(await patch('9223372036854775807'), 404, 'JOB_NOT_FOUND');
    expectError(await patch('0'), 400, 'INVALID_ID');
    expectError(await patch(jobId, { status: 'RECRUITING' }), 400, 'VALIDATION_ERROR');
    expectError(await patch(jobId, { status: 'FILLED', employer_id: ownerId }), 400, 'FIELD_NOT_ALLOWED');
    const jobs = await pool.query('SELECT status FROM public.job_posts WHERE job_id = $1', [jobId]);
    assert.equal(jobs.rows[0].status, 'RECRUITING');
  });

  await t.test('Khóa tin trước rồi đọc đơn vừa commit từ giao dịch nộp mô phỏng', async () => {
    const jobId = await createJob('Thử tranh chấp khóa');
    await insertApplication(pool, jobId, studentA, 'APPROVED');
    const applicant = await pool.connect();
    let result;
    try {
      await applicant.query('BEGIN');
      await applicant.query('SELECT job_id FROM public.job_posts WHERE job_id = $1 FOR UPDATE', [jobId]);
      await insertApplication(applicant, jobId, studentB, 'PENDING');

      result = patch(jobId);
      let isBlocked = false;
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const { rows } = await pool.query(
          'SELECT EXISTS (SELECT FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid))) AS blocked',
          [applicant.processID]
        );
        isBlocked = rows[0].blocked;
        if (isBlocked) break;
        await delay(10);
      }
      assert.ok(isBlocked, 'PATCH phải chờ khóa trên hàng tin');
      await applicant.query('COMMIT');
      expectError(await result, 409, 'PENDING_APPLICATIONS_EXIST');
    } finally {
      await applicant.query('ROLLBACK');
      applicant.release();
      await result;
    }
  });
});
