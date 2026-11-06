import { useCallback, useEffect, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getApplicationDetail } from '../api/applicationApi.js';
import StatusMessage from '../components/StatusMessage.jsx';
import { useApplicantResource } from '../features/applicants/useApplicantResource.js';
import { applicationStatus, jobStatus, formatAppliedAt, formatCvSize, listPath } from '../features/applicants/applicantPresentation.js';
import '../features/applicants/applicants.css';

export function ApplicationDetailView({ result, backPage = 1, onRetry, renderCv }) {
  const detail = result.data?.data;
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, [detail?.application_id, result.loading]);
  return (
    <section className="applicants" aria-labelledby="application-heading" aria-busy={Boolean(result.loading)}>
      <h1 id="application-heading" ref={heading} tabIndex={-1}>Chi tiết ứng viên</h1>
      {result.loading ? <StatusMessage type="loading">Đang tải chi tiết ứng viên…</StatusMessage>
        : result.error ? <><StatusMessage type="error">{result.error.message}</StatusMessage><button type="button" onClick={onRetry}>Thử lại</button></>
          : !detail ? <StatusMessage type="empty">Không có dữ liệu đơn ứng tuyển.</StatusMessage>
            : <>
              <div className="applicants__panel">
                <h2>{detail.student.full_name}</h2>
                <dl>
                  <dt>Mã đơn</dt><dd>{detail.application_id}</dd>
                  <dt>Tin tuyển dụng</dt><dd>{detail.job.title}</dd>
                  <dt>Trạng thái tin</dt><dd>{jobStatus[detail.job.status] || detail.job.status}</dd>
                  <dt>Trạng thái đơn</dt><dd><span className="applicants__badge">{applicationStatus[detail.status] || detail.status}</span></dd>
                  <dt>Thời điểm nộp</dt><dd><time dateTime={detail.applied_at}>{formatAppliedAt(detail.applied_at)}</time></dd>
                  {detail.decided_at && <><dt>Thời điểm xử lý</dt><dd><time dateTime={detail.decided_at}>{formatAppliedAt(detail.decided_at)}</time></dd></>}
                </dl>
              </div>
              <div className="applicants__panel">
                <h2>CV ứng tuyển</h2>
                <p className="applicants__filename">{detail.cv.original_name}</p>
                <p>PDF · {formatCvSize(detail.cv.size_bytes)}</p>
                {renderCv ? renderCv(detail) : <p className="applicants__muted">Chờ tích hợp bộ xem CV của Tài (T05).</p>}
              </div>
              <Link className="applicants__back" to={listPath(detail.job_id, backPage)}>Quay lại danh sách ứng viên</Link>
            </>}
    </section>
  );
}

export default function ApplicationDetailPage({ token, renderCv }) {
  const { application_id: applicationId } = useParams();
  const [search] = useSearchParams();
  const rawPage = search.get('page') || '1';
  const backPage = /^[0-9]+$/.test(rawPage) && Number.isSafeInteger(Number(rawPage)) && Number(rawPage) > 0 ? Number(rawPage) : 1;
  const load = useCallback((signal) => getApplicationDetail(applicationId, { token, signal }), [applicationId, token]);
  const result = useApplicantResource(load, token);
  return <ApplicationDetailView result={result} backPage={backPage} onRetry={result.retry} renderCv={renderCv} />;
}
