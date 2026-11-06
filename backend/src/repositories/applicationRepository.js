// K01 only. The composition root owns the pg Pool/client and its lifecycle.
const applicationColumns = `a.application_id, a.job_id, a.student_id, a.status,
  a.cv_original_name, a.cv_mime_type, a.cv_size_bytes, a.applied_at, a.decided_at,
  s.full_name`;

function createApplicationRepository(db) {
  if (!db || typeof db.query !== 'function') throw new TypeError('A pg pool/client is required');

  return {
    async findJobOwner(jobId) {
      const { rows } = await db.query(
        'SELECT employer_id FROM public.job_posts WHERE job_id = $1', [jobId],
      );
      return rows[0] || null;
    },

    async listByJob(jobId, { size, offset }) {
      // One statement = one PostgreSQL snapshot, even during concurrent submissions.
      // LEFT JOIN preserves the count when the requested page is empty.
      const { rows } = await db.query(`
        WITH counted AS (
          SELECT COUNT(*) AS total FROM public.applications WHERE job_id = $1
        )
        SELECT counted.total, paged.*
        FROM counted
        LEFT JOIN LATERAL (
          SELECT ${applicationColumns}
          FROM public.applications a
          JOIN public.student_profiles s ON s.user_id = a.student_id
          WHERE a.job_id = $1
          ORDER BY a.applied_at DESC, a.application_id DESC
          LIMIT $2 OFFSET $3
        ) paged ON true
        ORDER BY paged.applied_at DESC, paged.application_id DESC`, [jobId, size, offset]);
      return { rows: rows.filter((row) => row.application_id !== null), total: Number(rows[0].total) };
    },

    async findDetail(applicationId) {
      const { rows } = await db.query(`
        SELECT ${applicationColumns}, j.employer_id,
          j.title AS job_title, j.status AS job_status
        FROM public.applications a
        JOIN public.student_profiles s ON s.user_id = a.student_id
        JOIN public.job_posts j ON j.job_id = a.job_id
        WHERE a.application_id = $1`, [applicationId]);
      return rows[0] || null;
    },
  };
}

module.exports = { createApplicationRepository };
