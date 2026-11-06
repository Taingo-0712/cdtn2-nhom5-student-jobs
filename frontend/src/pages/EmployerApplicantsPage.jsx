import { useCallback, useEffect, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getJobApplications } from '../api/applicationApi.js';
import StatusMessage from '../components/StatusMessage.jsx';
import { useApplicantResource } from '../features/applicants/useApplicantResource.js';
import { applicationStatus, jobStatus, formatAppliedAt } from '../features/applicants/applicantPresentation.js';
import '../features/applicants/applicants.css';

export function ApplicantsView({ jobId, result, page, onPageChange, onRetry }) {
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, [jobId, page, result.loading]);
  const applications = result.data?.applications;
  const job = result.data?.job;
  const meta = applications?.meta;
  return (
    <section className="applicants" aria-labelledby="applicants-heading" aria-busy={Boolean(result.loading)}>
      <h1 id="applicants-heading" ref={heading} tabIndex={-1}>Ứng viên của tin</h1>
      <p className="applicants__muted">Mã tin: {jobId}</p>
      {result.loading ? <StatusMessage type="loading">Đang tải danh sách ứng viên…</StatusMessage>
        : result.error ? <><StatusMessage type="error">{result.error.message}</StatusMessage><button type="button" onClick={onRetry}>Thử lại</button></>
          : <>
            {result.data?.jobError && <StatusMessage type="error">Không tải được thông tin tin tuyển dụng. Danh sách ứng viên vẫn được hiển thị.</StatusMessage>}
            {job && <div className="applicants__panel"><h2>{job.title}</h2><p>Trạng thái tin: {jobStatus[job.status] || job.status}</p></div>}
            {!applications?.data?.length ? <StatusMessage type="empty">{meta?.total_elements ? 'Trang này không có ứng viên.' : 'Chưa có ứng viên ứng tuyển vào tin này.'}</StatusMessage>
              : <div className="applicants__table-scroll" role="region" aria-label="Bảng ứng viên" tabIndex={0}>
                <table>
                  <caption>Danh sách ứng viên — {meta.total_elements} đơn</caption>
                  <thead><tr><th scope="col">Sinh viên</th><th scope="col">Trạng thái đơn</th><th scope="col">Thời điểm nộp</th><th scope="col">Chi tiết</th></tr></thead>
                  <tbody>{applications.data.map((item) => <tr key={item.application_id}>
                    <td>{item.student.full_name}</td>
                    <td><span className="applicants__badge">{applicationStatus[item.status] || item.status}</span></td>
                    <td><time dateTime={item.applied_at}>{formatAppliedAt(item.applied_at)}</time></td>
                    <td><Link to={`/employer/applications/${encodeURIComponent(item.application_id)}?page=${page}`} aria-label={`Xem chi tiết ${item.student.full_name}`}>Xem chi tiết</Link></td>
                  </tr>)}</tbody>
                </table>
              </div>}
            {meta && <nav className="applicants__pagination" aria-label="Phân trang ứng viên">
              <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Trang trước</button>
              <span aria-live="polite">Trang {page} / {meta.total_pages || 1} · {meta.total_elements} đơn</span>
              <button type="button" disabled={page >= meta.total_pages} onClick={() => onPageChange(page + 1)}>Trang sau</button>
            </nav>}
          </>}
    </section>
  );
}

export default function EmployerApplicantsPage({ token, getJob }) {
  const { job_id: jobId } = useParams();
  const [search, setSearch] = useSearchParams();
  const rawPage = search.get('page') || '1';
  const page = /^[0-9]+$/.test(rawPage) && Number.isSafeInteger(Number(rawPage)) && Number(rawPage) > 0 ? Number(rawPage) : 1;
  const load = useCallback(async (signal) => {
    const applications = await getJobApplications(jobId, { page, size: 20, token, signal });
    // Call Phương's supplied API only AFTER API-15 confirms owner access.
    if (!getJob) return { applications };
    try {
      const response = await getJob(jobId, { token, signal });
      return { applications, job: response?.data };
    } catch (error) {
      if (signal.aborted) throw error;
      return { applications, jobError: true };
    }
  }, [jobId, page, token, getJob]);
  const result = useApplicantResource(load, token);
  return <ApplicantsView jobId={jobId} result={result} page={page} onRetry={result.retry} onPageChange={(next) => setSearch({ page: String(next) })} />;
}
