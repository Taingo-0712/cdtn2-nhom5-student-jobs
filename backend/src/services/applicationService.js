const { ApiError } = require('../middleware/errorHandler');

function validId(value) {
  return typeof value === 'string' && /^[1-9][0-9]{0,18}$/.test(value)
    && BigInt(value) <= 9223372036854775807n;
}

function requireUser(user) {
  if (!user || !validId(user.user_id)) {
    throw new ApiError(401, 'AUTH_REQUIRED', 'Cần đăng nhập.');
  }
}

function requireId(value) {
  if (!validId(value)) throw new ApiError(400, 'INVALID_ID', 'ID không hợp lệ.');
}

function pagination(query) {
  const invalid = () => new ApiError(400, 'INVALID_QUERY', 'Tham số phân trang không hợp lệ.');
  for (const key of query.keys()) {
    if (!['page', 'size'].includes(key) || query.getAll(key).length !== 1) throw invalid();
  }
  const parse = (key, fallback) => {
    const value = query.get(key);
    if (value === null) return fallback;
    if (!/^[0-9]+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) throw invalid();
    return Number(value);
  };
  const page = parse('page', 1);
  const size = parse('size', 20);
  const offset = (page - 1) * size;
  if (size > 100 || !Number.isSafeInteger(offset)) throw invalid();
  return { page, size, offset };
}

function applicationDto(row) {
  // Allowlist: never spread database rows into a response.
  return {
    application_id: String(row.application_id),
    job_id: String(row.job_id),
    student_id: String(row.student_id),
    status: row.status,
    cv: {
      original_name: row.cv_original_name,
      mime_type: row.cv_mime_type,
      size_bytes: row.cv_size_bytes,
      download_url: `/api/applications/${row.application_id}/cv`,
    },
    applied_at: new Date(row.applied_at).toISOString(),
    decided_at: row.decided_at === null ? null : new Date(row.decided_at).toISOString(),
    student: { user_id: String(row.student_id), full_name: row.full_name },
  };
}

function createApplicationService(repository) {
  if (!repository || ['findJobOwner', 'listByJob', 'findDetail'].some((key) => typeof repository[key] !== 'function')) {
    throw new TypeError('K01 repository methods are required');
  }
  return {
    // user is a trusted { user_id, role } resolved by T03, not client input.
    async listForJob(user, jobId, query) {
      requireUser(user);
      if (user.role !== 'EMPLOYER') throw new ApiError(403, 'ROLE_FORBIDDEN', 'Chỉ nhà tuyển dụng được xem danh sách ứng viên.');
      requireId(jobId);
      const paging = pagination(query);
      const job = await repository.findJobOwner(jobId);
      if (!job) throw new ApiError(404, 'JOB_NOT_FOUND', 'Tin tuyển dụng không tồn tại.');
      if (String(job.employer_id) !== user.user_id) throw new ApiError(403, 'RESOURCE_FORBIDDEN', 'Bạn không sở hữu tin tuyển dụng này.');
      const { rows, total } = await repository.listByJob(jobId, paging);
      return {
        data: rows.map(applicationDto),
        meta: { page: paging.page, size: paging.size, total_elements: total, total_pages: Math.ceil(total / paging.size) },
      };
    },

    async getDetail(user, applicationId, query) {
      requireUser(user);
      if (!['STUDENT', 'EMPLOYER'].includes(user.role)) throw new ApiError(403, 'RESOURCE_FORBIDDEN', 'Bạn không được xem đơn này.');
      requireId(applicationId);
      if ([...query.keys()].length) throw new ApiError(400, 'INVALID_QUERY', 'API chi tiết không nhận tham số query.');
      const row = await repository.findDetail(applicationId);
      if (!row) throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Đơn ứng tuyển không tồn tại.');
      const ownerId = user.role === 'STUDENT' ? row.student_id : row.employer_id;
      if (String(ownerId) !== user.user_id) throw new ApiError(403, 'RESOURCE_FORBIDDEN', 'Bạn không được xem đơn này.');
      return { data: {
        ...applicationDto(row),
        job: { job_id: String(row.job_id), title: row.job_title, status: row.job_status, employer_id: String(row.employer_id) },
      } };
    },
  };
}

module.exports = { createApplicationService };
