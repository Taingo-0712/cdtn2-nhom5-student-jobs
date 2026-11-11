import { httpClient } from './httpClient.js';
// Dùng địa chỉ backend và bộ xử lý lỗi chung của dự án.

export function getJobs({ page = 1, size = 20, signal } = {}) {
  // WF04 dùng page và size để tải đúng trang danh sách.
  const query = new URLSearchParams({ page, size });
  return httpClient(`/api/jobs?${query.toString()}`, { signal });
}

export function getJobById(jobId, { signal } = {}) {
  // WF05 dùng mã của tin được bấm để tải chi tiết.
  return httpClient(`/api/jobs/${encodeURIComponent(jobId)}`, { signal });
}
export function getEmployerJobs(token, { page = 1, size = 20, signal } = {}) {
  const query = new URLSearchParams({ page, size });

  return httpClient(`/api/employer/jobs?${query.toString()}`, {
    token,
    signal,
  });
}