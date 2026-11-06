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
      <div className="applicants__heading">
        <h1 id="application-heading" ref={heading} tabIndex={-1}>Hồ sơ ứng viên{detail ? ` · ${detail.student.full_name}` : ''}</h1>
        <p className="applicants__breadcrumb">{detail ? `${detail.job.title} / Danh sách ứng viên / Chi tiết đơn` : 'Chi tiết đơn ứng tuyển'}</p>
      </div>
      {result.loading ? <StatusMessage type="loading">Đang tải chi tiết ứng viên…</StatusMessage>
        : result.error ? <><StatusMessage type="error">{result.error.message}</StatusMessage><button type="button" onClick={onRetry}>Thử lại</button></>
          : !detail ? <StatusMessage type="empty">Không có dữ liệu đơn ứng tuyển.</StatusMessage>
            : <div className="applicants__detail-grid">
              <div className="applicants__detail-main">
                <section className="applicants__panel" aria-labelledby="applicant-student-heading">
                  <h2 id="applicant-student-heading">Thông tin sinh viên</h2>
                  <p className="applicants__student-name">{detail.student.full_name}</p>
                  <p className="applicants__muted">Mã tài khoản: {detail.student.user_id}</p>
                </section>
                <section className="applicants__panel" aria-labelledby="applicant-cv-heading">
                  <h2 id="applicant-cv-heading">CV PDF đã nộp</h2>
                  <p className="applicants__filename applicants__filename--strong">{detail.cv.original_name}</p>
                  <p>{formatCvSize(detail.cv.size_bytes)} · {new Intl.NumberFormat('vi-VN').format(detail.cv.size_bytes)} byte · Nộp ngày <time dateTime={detail.applied_at} title={formatAppliedAt(detail.applied_at)}>{new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(detail.applied_at))}</time></p>
                  {renderCv ? <div className="applicants__cv-viewer">{renderCv(detail)}</div> : <p className="applicants__muted">Chờ tích hợp bộ xem CV của Tài (T05).</p>}
                  <p className="applicants__notice">Đây là CV gắn với đơn này tại thời điểm nộp, không phải CV dùng chung trong hồ sơ.</p>
                </section>
              </div>
              <aside className="applicants__panel applicants__application" aria-labelledby="applicant-order-heading">
                <h2 id="applicant-order-heading">Đơn ứng tuyển</h2>
                <p>{detail.job.title}</p>
                <p><span className="applicants__badge" data-status={detail.status}>{applicationStatus[detail.status] || detail.status}</span></p>
                <p>Trạng thái tin: {jobStatus[detail.job.status] || detail.job.status}</p>
                <dl>
                  <dt>Mã đơn</dt><dd>{detail.application_id}</dd>
                  {detail.decided_at && <><dt>Thời điểm xử lý</dt><dd><time dateTime={detail.decided_at}>{formatAppliedAt(detail.decided_at)}</time></dd></>}
                </dl>
                <Link className="applicants__back" to={listPath(detail.job_id, backPage)}>Quay lại danh sách ứng viên</Link>
              </aside>
            </div>}
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
