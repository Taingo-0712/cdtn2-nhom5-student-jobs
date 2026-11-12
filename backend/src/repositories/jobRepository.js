async function createJob(db, employerId, job) {
  // Nhận kết nối DB, ID chủ tin và dữ liệu đã qua validator.
  const { rows } = await db.query(`
    WITH new_job AS (
      INSERT INTO public.job_posts (
        employer_id, category_id, title, description, work_time,
        salary_min, salary_max, salary_unit, city, location_detail, status
      )
      SELECT $1, c.category_id, $3, $4, $5,
             $6, $7, $8, $9, $10, 'RECRUITING'
      FROM public.job_categories AS c
      WHERE c.category_id = $2
      RETURNING *
    )
    SELECT
      j.job_id::text AS job_id,
      json_build_object('user_id', e.user_id::text, 'display_name', e.display_name) AS employer,
      json_build_object('category_id', c.category_id::text, 'name', c.name) AS category,
      j.title, j.description, j.work_time,
      j.salary_min::text AS salary_min, j.salary_max::text AS salary_max,
      j.salary_unit, 'VND' AS currency, j.city, j.location_detail,
      j.status, j.completed_at, j.created_at, j.updated_at
    FROM new_job AS j
    JOIN public.employer_profiles AS e ON e.user_id = j.employer_id
    JOIN public.job_categories AS c ON c.category_id = j.category_id
  `, [
    employerId, job.category_id, job.title, job.description, job.work_time,
    job.salary_min, job.salary_max, job.salary_unit, job.city, job.location_detail,
  ]);
  // $1 đến $10 nhận dữ liệu theo thứ tự trên. SQL chỉ chèn khi tìm thấy ngành.
  // Phần SELECT trả JobDetail, giữ ID và tiền ở dạng chuỗi theo API Contract.

  return rows[0] ?? null;
  // Trả tin vừa tạo hoặc null nếu mã ngành không tồn tại.
}

async function lockJob(db, jobId) {
  // Nộp đơn, quyết định đơn và đổi trạng thái cùng khóa hàng này trước.
  const { rows } = await db.query(
    'SELECT employer_id::text, status FROM public.job_posts WHERE job_id = $1 FOR UPDATE',
    [jobId]
  );
  return rows[0] ?? null;
}

async function getRecruitmentConditions(db, jobId) {
  const { rows } = await db.query(
    `SELECT
       EXISTS (SELECT 1 FROM public.applications WHERE job_id = $1 AND status = 'PENDING') AS "hasPending",
       EXISTS (SELECT 1 FROM public.applications WHERE job_id = $1 AND status = 'APPROVED') AS "hasApproved"`,
    [jobId]
  );
  return rows[0];
}

async function updateJobStatus(db, jobId, status) {
  // Ghi thời điểm tại câu UPDATE, kể cả khi giao dịch vừa phải chờ khóa.
  const { rows } = await db.query(
    `UPDATE public.job_posts
     SET status = $2, updated_at = statement_timestamp()
     WHERE job_id = $1
     RETURNING job_id::text, status, completed_at, updated_at`,
    [jobId, status]
  );
  return rows[0];
}

module.exports = { createJob, lockJob, getRecruitmentConditions, updateJobStatus };
