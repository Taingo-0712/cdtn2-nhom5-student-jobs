import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getJobById } from '../../api/jobApi.js';

const statusLabels = {
  RECRUITING: 'Đang tuyển',
  FILLED: 'Đã nhận người',
  COMPLETED: 'Hoàn thành',
};

export default function JobDetailPage() {
  const { jobId } = useParams();
  const [result, setResult] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    // Lấy chi tiết tin theo mã trên URL.
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

  const current = result?.jobId === jobId ? result : null;
  const job = current?.job;

  return (
    <section>
      <Link to="/jobs">Quay lại danh sách</Link>
      <h1>Chi tiết việc làm</h1>

      {!current && <p role="status">Đang tải chi tiết tin…</p>}
      {current?.error && <p role="alert">{current.error}</p>}

      {job && (
        <article>
          <h2>{job.title}</h2>
          <p>{job.employer.display_name} · {job.category.name}</p>
          <p>Trạng thái: {statusLabels[job.status] ?? job.status}</p>
          <p>Địa điểm: {job.location_detail}, {job.city}</p>
          <p>Thời gian làm việc: {job.work_time}</p>
          <h3>Mô tả công việc</h3>
          <p>{job.description}</p>
        </article>
      )}
    </section>
  );
}