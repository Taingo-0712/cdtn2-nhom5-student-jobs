import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEmployerJobs } from '../../api/jobApi.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { formatJobSalary, statusLabels } from '../../utils/jobDisplay.js';
import '../../styles/job-list.css';
import '../../styles/employer-jobs.css';

export default function EmployerJobsPage({ createJobPath, getApplicantsPath }) {
  const { session } = useAuth();
  const token = session.token;
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ loading: true });

  useEffect(() => {
    const controller = new AbortController();

    // API-12 lấy tin thuộc tài khoản đã xác thực.
    getEmployerJobs(token, { page, signal: controller.signal })
      .then(({ data, meta }) => {
        if (!controller.signal.aborted) {
          setResult({ data, meta });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setResult({ error: error.message });
        }
      });

    return () => controller.abort();
  }, [token, page]);

  function goToPage(nextPage) {
    setResult({ loading: true });
    setPage(nextPage);
  }

  return (
    <section className="employer-jobs">
      <header className="employer-jobs-heading">
        <h1>Tin tuyển dụng của tôi</h1>
        <p>Chỉ hiển thị tin thuộc tài khoản hiện tại.</p>
      </header>

      <div className="employer-jobs-toolbar">
        {createJobPath ? (
          <Link className="job-button employer-jobs-primary" to={createJobPath}>
            Đăng tin tuyển dụng
          </Link>
        ) : (
          <button className="job-button employer-jobs-primary" type="button" disabled>
            Đăng tin tuyển dụng
          </button>
        )}
      </div>

      {result.loading && <p role="status">Đang tải danh sách tin…</p>}
      {result.error && <p role="alert">Tải danh sách thất bại. {result.error}</p>}

      {result.data && (
        <>
          <div className="employer-jobs-table-wrap">
            <table className="employer-jobs-table" aria-label="Tin tuyển dụng đã đăng">
              <thead>
                <tr>
                  <th scope="col">Tiêu đề / ngành</th>
                  <th scope="col">Thời gian làm việc</th>
                  <th scope="col">Mức lương</th>
                  <th scope="col">Địa điểm</th>
                  <th scope="col">Trạng thái tin</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {result.data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="employer-jobs-empty">
                      {result.meta.total_elements === 0
                        ? 'Chưa có tin tuyển dụng nào.'
                        : 'Trang này không còn tin.'}
                    </td>
                  </tr>
                )}

                {result.data.map((job) => (
                  <tr key={job.job_id}>
                    <th scope="row">
                      {job.title}
                      <span className="employer-jobs-category">{job.category.name}</span>
                    </th>
                    <td className="employer-jobs-work-time">{job.work_time}</td>
                    <td>{formatJobSalary(job)}</td>
                    <td>{job.location_detail}, {job.city}</td>
                    <td>{statusLabels[job.status] ?? job.status}</td>
                    <td>
                      {getApplicantsPath ? (
                        <Link to={getApplicantsPath(job.job_id)}>Xem ứng viên</Link>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(page > 1 || result.meta.total_pages > 1) && (
            <nav className="job-pagination" aria-label="Phân trang tin tuyển dụng">
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

      <section className="employer-jobs-rules">
        <h2>Điều kiện chuyển trạng thái</h2>
        <p>
          <strong>Đang tuyển → Đã nhận người.</strong> Có ít nhất một đơn được duyệt
          và không còn đơn chờ xử lý.
        </p>
        <p>
          <strong>Đã nhận người → Hoàn thành.</strong> Nhà tuyển dụng xác nhận hoàn thành
          cả đợt. Hệ thống lưu ngày xác nhận.
        </p>
      </section>
    </section>
  );
}