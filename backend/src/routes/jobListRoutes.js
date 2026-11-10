const express = require('express');
const { ApiError } = require('../middleware/errorHandler');
const { listJobs, findJobById } = require('../repositories/jobQueryRepository');
const { parseJobListQuery } = require('../validators/jobListQueryValidator');

function createJobListRouter(pool) {
  const router = express.Router();

  // API-09: đọc danh sách tin theo trang.
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
    }
  });

  // API-10: đọc chi tiết một tin theo mã trên đường dẫn.
  router.get('/jobs/:jobId', async (req, res, next) => {
    try {
      const { jobId } = req.params;

      // Mã tin là chuỗi số nguyên dương trong phạm vi BIGINT.
      if (!/^[1-9][0-9]{0,18}$/.test(jobId) || BigInt(jobId) > 9223372036854775807n) {
        throw new ApiError(400, 'INVALID_ID', 'Mã tin tuyển dụng không hợp lệ.');
      }

      // API-10 chỉ nhận mã trên đường dẫn, ví dụ /api/jobs/4.
      if (Object.keys(req.query).length > 0) {
        throw new ApiError(400, 'INVALID_QUERY', 'API chi tiết tin không nhận tham số query.');
      }

      const job = await findJobById(pool, jobId);
      if (!job) {
        throw new ApiError(404, 'JOB_NOT_FOUND', 'Không tìm thấy tin tuyển dụng.');
      }

      res.json({ data: job });
    } catch (error) {
      // Để bộ xử lý lỗi chung trả phản hồi JSON theo API Contract.
      next(error);
    }
  });

  return router;
}

module.exports = createJobListRouter;