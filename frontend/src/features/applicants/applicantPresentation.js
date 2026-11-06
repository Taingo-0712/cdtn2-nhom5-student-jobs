export const applicationStatus = {
  PENDING: 'Chờ xử lý', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối',
};

export const jobStatus = {
  RECRUITING: 'Đang tuyển', FILLED: 'Đã nhận người', COMPLETED: 'Đã hoàn thành',
};

export function formatAppliedAt(value) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function formatCvSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(bytes / 1024)} KB`;
}

export function listPath(jobId, page = 1) {
  return `/employer/jobs/${encodeURIComponent(jobId)}/applications?page=${page}`;
}
