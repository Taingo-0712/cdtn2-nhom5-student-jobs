    import { httpClient } from './httpClient.js';
// Dùng hàm gọi API chung đã có trong bộ khung React.

export function listJobCategories() {
  return httpClient('/api/job-categories');
  // WF11 gọi hàm này để lấy danh mục cho ô chọn ngành nghề.
}

export function createJob(payload, token) {
  return httpClient('/api/jobs', { method: 'POST', json: payload, token });
  // Gửi dữ liệu form dưới dạng JSON. httpClient tự gắn token đăng nhập.
}