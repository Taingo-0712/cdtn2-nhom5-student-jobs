const express = require('express');
const { listJobs } = require('../repositories/jobQueryRepository');
const { parseJobListQuery } = require('../validators/jobListQueryValidator');
// Dùng lại hai hàm em vừa làm để kiểm tra đầu vào và đọc dữ liệu.

function createJobListRouter(pool) {
  const router = express.Router();

  router.get('/jobs', async (req, res, next) => {
    try {
      const { page, size } = parseJobListQuery(req.query);
      const offset = (BigInt(page) - 1n) * BigInt(size);
      // Trang 1 bỏ qua 0 tin. Trang 2 bỏ qua đúng size tin.

      const { jobs, totalElements } = await listJobs(pool, {
        limit: size,
        offset: offset.toString(),
      });

      res.json({
        data: jobs,
        meta: {
          page,
          size,
          total_elements: totalElements,
          total_pages: Math.ceil(totalElements / size),
        },
      });
    } catch (error) {
      next(error);
      // Chuyển lỗi sang bộ xử lý chung để trả đúng mã INVALID_QUERY.
    }
  });

  return router;
}

module.exports = createJobListRouter;