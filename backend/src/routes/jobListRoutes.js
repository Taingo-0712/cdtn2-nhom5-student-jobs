const express = require('express');
const { ApiError } = require('../middleware/errorHandler');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { listJobs, findJobById } = require('../repositories/jobQueryRepository');
const { parseJobListQuery } = require('../validators/jobListQueryValidator');

function createJobListRouter(pool) {
  const router = express.Router();

  // API-09 và API-12 dùng chung cách đọc và trả dữ liệu phân trang.
  async function sendJobList(req, res, next, employerId) {
    try {
      const { page, size } = parseJobListQuery(req.query);
      const offset = (BigInt(page) - 1n) * BigInt(size);

      const { jobs, totalElements } = await listJobs(pool, {
        limit: size,
        offset: offset.toString(),
        employerId,
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
  }

  // API-09: danh sách tin công khai.
  router.get('/jobs', (req, res, next) => sendJobList(req, res, next));

  // API-12: dùng mã tài khoản từ token đã xác thực để lọc tin theo chủ.
  router.get('/employer/jobs', requireAuth, requireRole('EMPLOYER'), (req, res, next) => {
    return sendJobList(req, res, next, req.auth.sub);
  });

  // API-10: đọc chi tiết một tin theo mã trên đường dẫn.
  router.get('/jobs/:jobId', async (req, res, next) => {
    try {
      const { jobId } = req.params;

      // Mã tin là chuỗi số nguyên dương trong phạm vi BIGINT.
      if (!/^[1-9][0-9]{0,18}$/.test(jobId) || BigInt(jobId) > 9223372036854775807n) {
        throw new ApiError(400, 'INVALID_ID', 'Mã tin tuyển dụng không hợp lệ.');
      }

      if (Object.keys(req.query).length > 0) {
        throw new ApiError(400, 'INVALID_QUERY', 'API chi tiết tin không nhận tham số query.');
      }

      const job = await findJobById(pool, jobId);
      if (!job) {
        throw new ApiError(404, 'JOB_NOT_FOUND', 'Không tìm thấy tin tuyển dụng.');
      }

      res.json({ data: job });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createJobListRouter;