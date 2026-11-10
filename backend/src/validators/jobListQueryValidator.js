const { ApiError } = require('../middleware/errorHandler');
// Dùng kiểu lỗi chung của backend để trả 400 INVALID_QUERY.

function parsePositiveInteger(rawValue, name, defaultValue, max) {
  if (rawValue === undefined) return defaultValue;
  // Khi người dùng bỏ qua tham số, dùng giá trị mặc định.

  if (typeof rawValue !== 'string' || !/^[0-9]+$/.test(rawValue)) {
    throw new ApiError(400, 'INVALID_QUERY', `${name} phải là số nguyên dương.`);
  }
  // Chặn chuỗi rỗng, số âm, số thập phân và tham số bị gửi lặp.

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < 1 || value > max) {
    throw new ApiError(400, 'INVALID_QUERY', `${name} nằm ngoài giới hạn cho phép.`);
  }
  // Kiểm tra giới hạn trước khi dùng giá trị để phân trang.

  return value;
}

function parseJobListQuery(query) {
  const hasUnsupportedKey = Object.keys(query).some(
    (key) => key !== 'page' && key !== 'size'
  );
  if (hasUnsupportedKey) {
    throw new ApiError(400, 'INVALID_QUERY', 'Danh sách tin chỉ nhận page và size.');
  }
  // API-09 trong Demo 1 chỉ nhận hai tham số phân trang.

  return {
    page: parsePositiveInteger(query.page, 'page', 1, Number.MAX_SAFE_INTEGER),
    size: parsePositiveInteger(query.size, 'size', 20, 100),
  };
  // Mặc định lấy trang 1, 20 tin. Mỗi trang tối đa 100 tin.
}

module.exports = { parseJobListQuery };
// Cho phép route GET /api/jobs gọi hàm này.