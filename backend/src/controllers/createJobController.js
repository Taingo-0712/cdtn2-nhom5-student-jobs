const { ApiError } = require('../middleware/errorHandler');
// Dùng cấu trúc lỗi chung của nhóm.

const { validateCreateJob } = require('../validators/createJobValidator');
// Kiểm tra dữ liệu form trước khi lưu.

const { createJob } = require('../repositories/jobRepository');
// Gọi hàm ghi tin vào PostgreSQL đã thử ở bước trước.

function createJobHandler(db) {
  // Nhận kết nối PostgreSQL khi route đăng ký handler.

  return async function handleCreateJob(req, res) {
    // Route sẽ chạy xác thực và kiểm tra vai trò EMPLOYER trước hàm này.

    const contentType = req.get('Content-Type')?.split(';')[0].trim().toLowerCase();
    // Đọc kiểu dữ liệu gửi lên, bỏ phần bổ sung như charset.

    if (contentType !== 'application/json') {
      throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Yêu cầu phải gửi dữ liệu JSON.');
    }
    // API tạo tin nhận body JSON.

    const job = validateCreateJob(req.body);
    // Kiểm tra chín trường của form và lấy dữ liệu đã chuẩn hóa.

    const created = await createJob(db, req.auth.sub, job);
    // Lấy ID chủ tin từ token đã xác thực rồi lưu tin.

    if (!created) {
      throw new ApiError(400, 'CATEGORY_NOT_FOUND', 'Ngành nghề không tồn tại.');
    }
    // Repository trả null khi không tìm thấy mã ngành.

    res.location(`/api/jobs/${created.job_id}`).status(201).json({ data: created });
    // Trả tin vừa tạo và đường dẫn để xem chi tiết.
  };
}

module.exports = { createJobHandler };
// Cho phép route POST /api/jobs đăng ký handler.