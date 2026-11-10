import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJobs } from '../../api/jobApi.js';

// Đổi mã trạng thái từ backend thành nhãn trên giao diện.
const statusLabels = {
  RECRUITING: 'Đang tuyển',
  FILLED: 'Đã nhận người',
  COMPLETED: 'Hoàn thành',
};

export default function JobListPage() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ loading: true });

  useEffect(() => {
    const controller = new AbortController();

    // Tải dữ liệu mỗi khi người dùng đổi trang.
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
    <section>
      <h1>Danh sách việc làm</h1>

      {result.loading && <p role="status">Đang tải danh sách tin…</p>}
      {result.error && <p role="alert">Tải danh sách thất bại. {result.error}</p>}

      {result.data && (
        <>
          {result.data.length === 0 && <p>Chưa có tin để hiển thị.</p>}

          {result.data.map((job) => (
            <article key={job.job_id}>
              <h2>
                <Link to={`/jobs/${job.job_id}`}>{job.title}</Link>
              </h2>
              <p>{job.employer.display_name} · {job.category.name}</p>
              <p>{job.city} · {job.work_time}</p>
              <p>{statusLabels[job.status] ?? job.status}</p>
            </article>
          ))}

          {result.meta.total_pages > 1 && (
            <nav aria-label="Phân trang danh sách tin">
              <button type="button" disabled={page === 1} onClick={() => goToPage(page - 1)}>
                Trang trước
              </button>
              <span> Trang {page} / {result.meta.total_pages} </span>
              <button
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