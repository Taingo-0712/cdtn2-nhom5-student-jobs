const { ApiError } = require('../middleware/errorHandler');
const { lockJob, getRecruitmentConditions, updateJobStatus } = require('../repositories/jobRepository');

async function changeJobStatus(pool, jobId, employerId, status) {
  const client = await pool.connect();
  let rollbackError;
  try {
    // Mỗi truy vấn sau khi nhận khóa đọc dữ liệu mới nhất đã commit.
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    const job = await lockJob(client, jobId);

    if (!job) {
      throw new ApiError(404, 'JOB_NOT_FOUND', 'Không tìm thấy tin tuyển dụng.');
    }
    if (job.employer_id !== employerId) {
      throw new ApiError(403, 'RESOURCE_FORBIDDEN', 'Chỉ chủ tin mới có thể đổi trạng thái.');
    }
    if (job.status !== 'RECRUITING' || status !== 'FILLED') {
      throw new ApiError(409, 'INVALID_JOB_TRANSITION', 'Không thể chuyển tin sang trạng thái này.');
    }

    // Kiểm tra toàn bộ đơn của tin sau khi đã khóa hàng job_posts.
    const { hasPending, hasApproved } = await getRecruitmentConditions(client, jobId);
    if (hasPending) {
      throw new ApiError(409, 'PENDING_APPLICATIONS_EXIST', 'Hãy xử lý hết đơn đang chờ trước khi xác nhận đã nhận người.');
    }
    if (!hasApproved) {
      throw new ApiError(409, 'NO_APPROVED_APPLICATION', 'Cần ít nhất một đơn được duyệt trước khi xác nhận đã nhận người.');
    }

    const updated = await updateJobStatus(client, jobId, status);
    await client.query('COMMIT');
    return updated;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (failure) {
      rollbackError = failure;
    }
    throw error;
  } finally {
    // Loại kết nối lỗi khỏi pool nếu PostgreSQL không thể rollback.
    client.release(rollbackError);
  }
}

module.exports = { changeJobStatus };
