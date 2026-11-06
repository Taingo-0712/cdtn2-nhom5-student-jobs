const express = require('express');
// Dùng Router của Express để khai báo đường dẫn API.

const { ApiError } = require('../middleware/errorHandler');
// Dùng kiểu lỗi chung để backend trả đúng cấu trúc lỗi.

const { listJobCategories } = require('../repositories/jobCategoryRepository');
// Lấy hàm đọc danh mục vừa viết ở bước 2.

function createJobCategoryRouter(db) {
  // Nhận kết nối PostgreSQL dùng chung khi app đăng ký route.
  const router = express.Router();

  router.get('/job-categories', async (req, res) => {
    // API-07 công khai nên route này gọi được trực tiếp từ trình duyệt.
    if (Object.keys(req.query).length > 0) {
      throw new ApiError(400, 'INVALID_QUERY', 'API danh mục không nhận tham số truy vấn.');
    }
    // Từ chối query như ?page=1 vì API-07 không phân trang.

    const categories = await listJobCategories(db);
    // Đọc danh mục thật từ PostgreSQL.

    res.json({ data: categories });
    // Trả HTTP 200 với mảng danh mục trong trường data.
  });

  return router;
  // Trả router để app.js gắn vào tiền tố /api.
}

module.exports = createJobCategoryRouter;
// Cho phép app.js đăng ký nhóm route này.