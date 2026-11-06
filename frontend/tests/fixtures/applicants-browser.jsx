// Browser-only fixtures: never imported by production entry points.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import ApplicantRoutes from '../../src/features/applicants/ApplicantRoutes.jsx';
import '../../src/styles/app.css';

const errors = [];
window.addEventListener('error', (event) => errors.push(event.message));
window.addEventListener('unhandledrejection', (event) => errors.push(String(event.reason)));
const originalError = console.error;
console.error = (...args) => { errors.push(args.join(' ')); originalError(...args); };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const makeItem = (id) => ({
  application_id: id, job_id: '301', student_id: id === '1001' ? '101' : '102',
  status: 'PENDING', applied_at: '2026-11-01T10:00:00Z', decided_at: null,
  student: { user_id: id === '1001' ? '101' : '102', full_name: id === '1001' ? 'Ứng viên A' : 'Ứng viên B' },
  job: { job_id: '301', title: 'Tin kiểm thử', status: 'RECRUITING', employer_id: '201' },
  cv: { original_name: `cv-${id}.pdf`, size_bytes: 2048, mime_type: 'application/pdf', download_url: `/api/applications/${id}/cv` },
});
let failNext = false;
const requests = [];
const realFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const parsed = new URL(url, location.origin);
  if (!parsed.pathname.startsWith('/api/')) return realFetch(url, options);
  requests.push(parsed.pathname + parsed.search);
  if (new Headers(options.headers).get('Authorization') !== 'Bearer fixture-only') throw new Error('Missing fixture Authorization');
  await delay(parsed.pathname === '/api/applications/1001' ? 250 : 30);
  if (failNext) { failNext = false; return Response.json({ error: { code: 'RESOURCE_FORBIDDEN', message: 'Không có quyền kiểm thử' } }, { status: 403 }); }
  if (parsed.pathname.includes('/jobs/')) {
    const page = Number(parsed.searchParams.get('page'));
    return Response.json({ data: page > 2 ? [] : [makeItem(page === 1 ? '1001' : '1002')], meta: { page, size: 20, total_elements: 21, total_pages: 2 } });
  }
  return Response.json({ data: makeItem(parsed.pathname.split('/').at(-1)) });
};

let navigate;
let setAuthToken;
let failJob = false;
function Harness() {
  navigate = useNavigate();
  const [token, setToken] = useState('fixture-only');
  setAuthToken = setToken;
  return <main className="shell"><ApplicantRoutes token={token} getJob={getJob} /></main>;
}
async function getJob() {
  if (failJob) throw new Error('Fixture job metadata failure');
  return { data: { job_id: '301', title: 'Tin kiểm thử', status: 'RECRUITING' } };
}
createRoot(document.getElementById('root')).render(<BrowserRouter><Harness /></BrowserRouter>);

const check = (condition, message) => { if (!condition) throw new Error(message); };
async function waitFor(predicate, message) {
  for (let i = 0; i < 100; i++) { if (predicate()) return; await delay(30); }
  throw new Error(message);
}
const text = () => document.getElementById('root').textContent;
const button = (label) => [...document.querySelectorAll('button')].find((node) => node.textContent === label);
try {
  await waitFor(() => text().includes('Ứng viên A'), 'list did not load');
  check(document.activeElement.tagName === 'H1', 'heading focus missing');
  button('Trang sau').click();
  await waitFor(() => text().includes('Ứng viên B'), 'pagination did not load page 2');
  check(location.search === '?page=2', 'pagination not persisted in URL');
  document.querySelector('tbody a').click();
  await waitFor(() => text().includes('cv-1002.pdf'), 'detail B did not load');
  check(!text().includes('cv-1001.pdf'), 'wrong CV');
  check(text().includes('Chờ tích hợp'), 'missing T05 placeholder');
  document.querySelector('.applicants__back').click();
  await waitFor(() => text().includes('Ứng viên B') && document.querySelector('tbody'), 'back lost page');
  check(location.search === '?page=2', 'back did not retain page 2');
  failNext = true;
  navigate('/employer/applications/1002');
  await waitFor(() => document.querySelector('[role="alert"]'), 'error not rendered');
  button('Thử lại').click();
  await waitFor(() => text().includes('cv-1002.pdf'), 'retry failed');
  navigate('/employer/applications/1001');
  await delay(50);
  navigate('/employer/applications/1002');
  await waitFor(() => text().includes('cv-1002.pdf'), 'rapid navigation failed');
  await delay(300);
  check(!text().includes('cv-1001.pdf'), 'late response overwrote current applicant');
  navigate('/employer/jobs/301/applications?page=3');
  await waitFor(() => text().includes('Trang này không có ứng viên'), 'empty state missing');
  check(!button('Trang trước').disabled, 'cannot return from empty page');
  failJob = true;
  button('Trang trước').click();
  await waitFor(() => text().includes('Không tải được thông tin tin'), 'job error not shown');
  check(text().includes('Ứng viên B'), 'job error hid applicants');
  navigate('/employer/applications/1001');
  await delay(50);
  setAuthToken(null);
  await waitFor(() => text().includes('Cần đăng nhập'), 'logout not reflected');
  await delay(300);
  check(!text().includes('Ứng viên A') && !text().includes('cv-1001.pdf'), 'private data displayed after logout');
  check(document.documentElement.scrollWidth <= innerWidth, 'page overflows viewport');
  check(requests.every((url) => !url.endsWith('/cv')), 'K01 fetched CV without T05');
  check(errors.length === 0, `browser errors: ${errors.join(', ')}`);
  document.getElementById('result').textContent = 'K01_BROWSER_PASS';
} catch (error) {
  document.getElementById('result').textContent = `K01_BROWSER_FAIL: ${error.message}`;
}
