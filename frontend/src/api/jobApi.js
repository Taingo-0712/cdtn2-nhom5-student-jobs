import { httpClient } from './httpClient.js';

// WF11 lấy danh mục ngành để hiển thị trong form.
export function listJobCategories() {
  return httpClient('/api/job-categories');
}

// WF11 gửi dữ liệu tạo tin cùng token nhà tuyển dụng.
export function createJob(payload, token) {
  return httpClient('/api/jobs', {
    method: 'POST',
    json: payload,
    token,
  });
}

// WF04 tải danh sách việc làm công khai theo trang.
export function getJobs({ page = 1, size = 20, signal } = {}) {
  const query = new URLSearchParams({ page, size });
  return httpClient(`/api/jobs?${query.toString()}`, { signal });
}

// WF05 tải chi tiết theo mã tin trên URL.
export function getJobById(jobId, { signal } = {}) {
  return httpClient(`/api/jobs/${encodeURIComponent(jobId)}`, { signal });
}

// WF10 tải danh sách tin của nhà tuyển dụng đang đăng nhập.
export function getEmployerJobs(token, { page = 1, size = 20, signal } = {}) {
  const query = new URLSearchParams({ page, size });

  return httpClient(`/api/employer/jobs?${query.toString()}`, {
    token,
    signal,
  });
}