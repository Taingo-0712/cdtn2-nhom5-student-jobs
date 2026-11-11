import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getJobById } from '../../api/jobApi.js';
import { formatJobSalary, statusLabels } from '../../utils/jobDisplay.js';
import '../../styles/job-list.css';

export default function JobDetailPage() {
  const { jobId } = useParams();
  const [result, setResult] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    // Gọi API-10 theo mã tin trên URL.
    getJobById(jobId, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setResult({ jobId, job: data });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setResult({
            jobId,
            error: error.code === 'JOB_NOT_FOUND'
              ? 'Không tìm thấy tin tuyển dụng.'
              : error.message,
          });
        }
      });

    // Hủy yêu cầu cũ khi rời trang hoặc chuyển sang tin khác.
    return () => controller.abort();
  }, [jobId]);

  // Chỉ hiển thị kết quả của mã tin đang mở.
  const current = result?.jobId === jobId ? result : null;
  const job = current?.job;

  return (
    <section className="job-detail">
      <h1>{job?.title ?? 'Chi tiết việc làm'}</h1>
      <p className="job-muted">
        <Link to="/jobs">Tìm việc</Link> / Chi tiết việc
      </p>

      {!current && <p role="status">Đang tải chi tiết tin…</p>}
      {current?.error && <p role="alert">{current.error}</p>}

      {job && (
        <div className="job-detail-grid">
          <div className="job-detail-stack">
            <section className="job-card">
              <h2>Mô tả công việc</h2>
              <p className="job-description">{job.description}</p>
            </section>

            <section className="job-card">
              <h2>Thông tin làm việc</h2>
              <p><strong>Ngành nghề:</strong> {job.category.name}</p>
              <p><strong>Lịch làm việc:</strong> {job.work_time}</p>
              <p><strong>Lương:</strong> {formatJobSalary(job)}</p>
              <p><strong>Địa điểm:</strong> {job.location_detail}, {job.city}</p>
            </section>
          </div>

          <aside className="job-detail-stack" aria-label="Tóm tắt tin tuyển dụng">
            <section className="job-card">
              <h2>{job.title}</h2>
              <p>{job.employer.display_name}</p>
              <span className={`job-badge job-badge--${job.status}`}>
                {statusLabels[job.status] ?? job.status}
              </span>
              <p className="job-muted">{job.category.name} · {job.city}</p>
              <p>{job.work_time}</p>
              <p><strong>{formatJobSalary(job)}</strong></p>
            </section>

            <Link className="job-button" to="/jobs">
              Quay lại danh sách việc
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}