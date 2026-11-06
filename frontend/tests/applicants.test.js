import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer, build } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
after(() => vite.close());
const { ApplicantsView } = await vite.ssrLoadModule('/src/pages/EmployerApplicantsPage.jsx');
const { ApplicationDetailView } = await vite.ssrLoadModule('/src/pages/ApplicationDetailPage.jsx');
const { createApplicationApi } = await vite.ssrLoadModule('/src/api/applicationApi.js');
const item = {
  application_id: '9223372036854775807', job_id: '301', student_id: '101', status: 'PENDING',
  applied_at: '2026-11-01T10:00:00Z', decided_at: null,
  student: { user_id: '101', full_name: '<Sinh viên thật>' },
  job: { job_id: '301', title: 'Việc thật', status: 'FILLED', employer_id: '201' },
  cv: { original_name: 'cv-that.pdf', size_bytes: 2048, mime_type: 'application/pdf', download_url: '/api/applications/9223372036854775807/cv' },
};
function render(Component, props) {
  return renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)));
}

test('K01 FE: API dùng httpClient được truyền vào, giữ ID chuỗi và token/signal', async () => {
  const calls = [];
  const api = createApplicationApi(async (...args) => { calls.push(args); return { data: [] }; });
  const controller = new AbortController();
  await api.getJobApplications('301', { page: 2, size: 20, token: 'test-only', signal: controller.signal });
  await api.getApplicationDetail('9223372036854775807', { token: 'test-only' });
  assert.equal(calls[0][0], '/api/jobs/301/applications?page=2&size=20');
  assert.equal(calls[0][1].token, 'test-only');
  assert.equal(calls[0][1].signal, controller.signal);
  assert.equal(calls[1][0], '/api/applications/9223372036854775807');
});

test('K01 FE: list loading/empty/error và liên kết ID thật, không tìm/lọc hay duyệt', () => {
  const common = { jobId: '301', page: 1, onPageChange() {}, onRetry() {} };
  assert.match(render(ApplicantsView, { ...common, result: { loading: true } }), /Đang tải/);
  assert.match(render(ApplicantsView, { ...common, result: { error: new Error('Lỗi đọc đơn') } }), /role="alert"/);
  const empty = render(ApplicantsView, { ...common, result: { data: { applications: { data: [], meta: { page: 1, size: 20, total_elements: 0, total_pages: 0 } } } } });
  assert.match(empty, /Chưa có ứng viên/);
  const html = render(ApplicantsView, { ...common, result: { data: { job: { title: 'Việc thật', status: 'RECRUITING' }, applications: { data: [item], meta: { page: 1, size: 20, total_elements: 21, total_pages: 2 } } } } });
  assert.match(html, /Việc thật/);
  assert.match(html, /&lt;Sinh viên thật&gt;/);
  assert.match(html, /\/employer\/applications\/9223372036854775807/);
  assert.match(html, /page=1/);
  assert.match(html, /Chờ xử lý/);
  assert.match(html, /Trang sau/);
  assert.doesNotMatch(html, /Duyệt|Từ chối|Tìm kiếm|<input/);
  const partial = render(ApplicantsView, { ...common, result: { data: { jobError: true, applications: { data: [item], meta: { page: 1, size: 20, total_elements: 1, total_pages: 1 } } } } });
  assert.match(partial, /Không tải được thông tin tin/);
  assert.match(partial, /&lt;Sinh viên thật&gt;/);
});

test('K01 FE: detail loading/error/empty, metadata CV và chỗ tích hợp T05, không link tải công khai', () => {
  assert.match(render(ApplicationDetailView, { result: { loading: true } }), /Đang tải/);
  assert.match(render(ApplicationDetailView, { result: { error: new Error('Không có quyền') } }), /role="alert"/);
  assert.match(render(ApplicationDetailView, { result: { data: { data: null } } }), /Không có dữ liệu/);
  const html = render(ApplicationDetailView, { result: { data: { data: item } }, backPage: 2 });
  assert.match(html, /cv-that.pdf/);
  assert.match(html, /2 KB/);
  assert.match(html, /Chờ tích hợp bộ xem CV/);
  assert.match(html, /\/employer\/jobs\/301\/applications\?page=2/);
  assert.doesNotMatch(html, /href="[^"]*\/cv"/);
  let actualId;
  render(ApplicationDetailView, { result: { data: { data: item } }, renderCv(detail) { actualId = detail.application_id; return React.createElement('button', null, 'Xem CV'); } });
  assert.equal(actualId, item.application_id);
});

test('K01 FE: build riêng entry K01 vì App.jsx chưa đăng ký route', async () => {
  const output = await build({
    logLevel: 'error',
    build: { write: false, rollupOptions: { input: 'src/features/applicants/ApplicantRoutes.jsx' } },
  });
  assert.ok(output.output.some((file) => file.type === 'chunk'));
});
