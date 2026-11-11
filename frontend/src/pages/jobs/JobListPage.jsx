import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJobs } from '../../api/jobApi.js';
import { formatJobSalary, statusLabels } from '../../utils/jobDisplay.js';
import '../../styles/job-list.css';

export default function JobListPage() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ loading: true });

  useEffect(() => {
    const controller = new AbortController();

    // Tải dữ liệu từ API-09 mỗi khi người dùng đổi trang.
    getJobs({ page, signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) {
          setResult({ data: response.data, meta: response.meta });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setResult({ error: error.message });
        }
      });

    // Hủy yêu cầu cũ khi đổi trang hoặc rời WF04.
    return () => controller.abort();
  }, [page]);

  function goToPage(nextPage) {
    setResult({ loading: true });
    setPage(nextPage);
  }

  return (
    <section className="job-list">
      <h1>Tìm việc</h1>

      {result.loading && <p role="status">Đang tải danh sách tin…</p>}
      {result.error && <p role="alert">Tải danh sách thất bại. {result.error}</p>}

      {result.data && (
        <>
          <p className="jobs-result-count">
            {result.meta.total_elements} tin việc làm · Mới nhất trước
          </p>

          {result.data.length === 0 && <p>Chưa có tin để hiển thị.</p>}

          <div className="job-grid">
            {result.data.map((job) => (
              <article className="job-card" key={job.job_id}>
                <div className="job-card-heading">
                  <h2>{job.title}</h2>
                  <span className={`job-badge job-badge--${job.status}`}>
                    {statusLabels[job.status] ?? job.status}
                  </span>
                </div>

                <p>{job.employer.display_name}</p>
                <p className="job-muted">
                  {job.category.name} · {job.location_detail}, {job.city}
                </p>
                <p>{job.work_time}</p>

                <div className="job-card-footer">
                  <strong>{formatJobSalary(job)}</strong>
                  <Link
                    className="job-button"
                    to={`/jobs/${job.job_id}`}
                    aria-label={`Xem chi tiết: ${job.title}`}
                  >
                    Xem chi tiết
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {result.meta.total_pages > 1 && (
            <nav className="job-pagination" aria-label="Phân trang danh sách tin">
              <button
                className="job-button"
                type="button"
                disabled={page === 1}
                onClick={() => goToPage(page - 1)}
              >
                Trang trước
              </button>

              <span>Trang {page} / {result.meta.total_pages}</span>

              <button
                className="job-button"
                type="button"
                disabled={page >= result.meta.total_pages}
                onClick={() => goToPage(page + 1)}
              >
                Trang sau
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}