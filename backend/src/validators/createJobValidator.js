const { ApiError } = require('../middleware/errorHandler');
// Dùng lỗi chung để trả đúng cấu trúc mà frontend đọc.

const textLimits = {
  title: 200,
  description: 20000,
  work_time: 5000,
  city: 100,
  location_detail: 255,
};
// Giới hạn ký tự của các trường văn bản theo API Contract.

const allowedFields = new Set([
  ...Object.keys(textLimits),
  'category_id', 'salary_min', 'salary_max', 'salary_unit',
]);
// Form chỉ được gửi chín trường này.

const salaryUnits = new Set(['HOUR', 'DAY', 'SHIFT', 'MONTH']);
// Bốn đơn vị lương đã chốt.

const moneyPattern = /^(0|[1-9][0-9]{0,9})(\.[0-9]{1,2})?$/;
// Tiền là chuỗi không âm, tối đa 10 chữ số nguyên và 2 chữ số lẻ.

function toCents(value) {
  const [whole, fraction = ''] = value.split('.');
  // Tách phần nguyên và phần lẻ của chuỗi tiền.
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  // Đổi sang số nguyên để so sánh chính xác, ví dụ "25000.50" thành 2500050n.
}

function validateCreateJob(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Dữ liệu tin phải là một đối tượng JSON.');
  }
  // API nhận một đối tượng JSON có các trường của form.

  const unknownFields = Object.keys(body).filter((field) => !allowedFields.has(field));
  if (unknownFields.length > 0) {
    throw new ApiError(400, 'FIELD_NOT_ALLOWED', 'Có trường không được phép gửi.',
      unknownFields.map((field) => ({ field, reason: 'Trường này không thuộc dữ liệu tạo tin.' })));
  }
  // Từ chối trường ngoài hợp đồng, ví dụ employer_id hoặc status do client tự gửi.

  const job = {};
  const details = [];
  // job giữ dữ liệu đã kiểm tra. details giữ lỗi theo từng ô nhập.

  for (const [field, maxLength] of Object.entries(textLimits)) {
    const value = typeof body[field] === 'string' ? body[field].trim() : '';
    if (!value || Array.from(value).length > maxLength) {
      details.push({ field, reason: `Nhập từ 1 đến ${maxLength} ký tự.` });
    } else {
      job[field] = value;
    }
  }
  // Bỏ khoảng trắng ở hai đầu và kiểm tra nội dung cùng giới hạn ký tự.

  const categoryId = body.category_id;
  if (typeof categoryId !== 'string' || !/^[1-9][0-9]{0,18}$/.test(categoryId)
      || BigInt(categoryId) > 9223372036854775807n) {
    details.push({ field: 'category_id', reason: 'Mã ngành phải là chuỗi ID hợp lệ.' });
  } else {
    job.category_id = categoryId;
  }
  // Kiểm tra định dạng ID. Bước truy vấn DB sau sẽ kiểm tra ngành có tồn tại.

  for (const field of ['salary_min', 'salary_max']) {
    const value = body[field];
    if (typeof value !== 'string' || !moneyPattern.test(value)) {
      details.push({ field, reason: 'Nhập mức lương không âm dưới dạng chuỗi hợp lệ.' });
    } else {
      job[field] = value;
    }
  }
  // Giữ lương dưới dạng chuỗi khi truyền sang bước lưu tin.

  if (job.salary_min !== undefined && job.salary_max !== undefined
      && toCents(job.salary_min) > toCents(job.salary_max)) {
    details.push({ field: 'salary_max', reason: 'Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu.' });
  }
  // Chỉ so sánh sau khi cả hai mức lương đã hợp lệ.

  if (!salaryUnits.has(body.salary_unit)) {
    details.push({ field: 'salary_unit', reason: 'Chọn HOUR, DAY, SHIFT hoặc MONTH.' });
  } else {
    job.salary_unit = body.salary_unit;
  }
  // Lưu đúng mã đơn vị mà API Contract quy định.

  if (details.length > 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Dữ liệu tin tuyển dụng không hợp lệ.', details);
  }
  // Trả lỗi theo từng trường để WF11 hiển thị đúng ô nhập.

  return job;
  // Trả dữ liệu đã kiểm tra cho bước xử lý nghiệp vụ.
}

module.exports = { validateCreateJob };
// Cho phép route tạo tin và bộ test gọi validator.