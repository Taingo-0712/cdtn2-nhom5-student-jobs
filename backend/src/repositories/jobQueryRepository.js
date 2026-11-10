// Các trường chung cho danh sách và chi tiết tin.
const jobSummaryColumns = `
  j.job_id::text AS job_id,
  json_build_object(
    'user_id', e.user_id::text,
    'display_name', e.display_name
  ) AS employer,
  json_build_object(
    'category_id', c.category_id::text,
    'name', c.name
  ) AS category,
  j.title,
  j.work_time,
  j.salary_min::text AS salary_min,
  j.salary_max::text AS salary_max,
  j.salary_unit,
  'VND' AS currency,
  j.city,
  j.location_detail,
  j.status,
  j.completed_at,
  j.created_at,
  j.updated_at
`;

// Nối tin với hồ sơ nhà tuyển dụng và danh mục ngành.
const jobTables = `
  FROM public.job_posts AS j
  JOIN public.employer_profiles AS e ON e.user_id = j.employer_id
  JOIN public.job_categories AS c ON c.category_id = j.category_id
`;

async function listJobs(pool, { limit, offset }) {
  // Đọc dữ liệu của một trang và tổng số tin trong cùng truy vấn.
  const { rows } = await pool.query(
    `
      SELECT totals.total_elements, page_jobs.*
      FROM (
        SELECT COUNT(*) AS total_elements
        FROM public.job_posts
      ) AS totals
      LEFT JOIN LATERAL (
        SELECT ${jobSummaryColumns}
        ${jobTables}
        ORDER BY j.created_at DESC, j.job_id DESC
        LIMIT $1 OFFSET $2
      ) AS page_jobs ON TRUE
      ORDER BY page_jobs.created_at DESC, page_jobs.job_id::bigint DESC
    `,
    [limit, offset]
  );

  const totalElements = Number(rows[0].total_elements);
  const jobs = rows
    .filter((row) => row.job_id !== null)
    .map(({ total_elements, ...job }) => job);

  return { jobs, totalElements };
}

async function findJobById(pool, jobId) {
  // API chi tiết lấy thêm mô tả và tìm đúng một tin theo mã.
  const { rows } = await pool.query(
    `
      SELECT ${jobSummaryColumns}, j.description
      ${jobTables}
      WHERE j.job_id = $1
    `,
    [jobId]
  );

  return rows[0] ?? null;
  // Trả null nếu không tìm thấy để route xử lý lỗi 404.
}

module.exports = { listJobs, findJobById };