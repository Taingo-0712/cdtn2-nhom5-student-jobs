import { useId, useRef, useState } from 'react';
import { updateJobStatus } from '../api/jobApi.js';
import StatusMessage from './StatusMessage.jsx';
import '../styles/job-status-actions.css';

export default function JobStatusActions({ job, token, onSuccess }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (job.status !== 'RECRUITING') return null;

  function openDialog() {
    setError('');
    dialogRef.current.showModal();
  }

  async function confirm() {
    if (submitting) return;
    setError('');
    setSubmitting(true);
    let updated;
    try {
      // API kiểm tra toàn bộ hồ sơ và trả lỗi nghiệp vụ cho hộp thoại.
      ({ data: updated } = await updateJobStatus(job.job_id, 'FILLED', token));
    } catch (failure) {
      setError(failure.message);
      return;
    } finally {
      setSubmitting(false);
    }

    dialogRef.current?.close();
    // Trang cha dùng kết quả thật để tải lại tin và các dữ liệu liên quan.
    onSuccess(updated);
  }

  return (
    <div className="job-status-actions">
      <button className="job-button" type="button" onClick={openDialog}>
        Xác nhận đã nhận người
      </button>

      <dialog
        className="job-status-dialog"
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          if (submitting) event.preventDefault();
        }}
      >
        <h2 id={titleId}>Xác nhận đã nhận người?</h2>
        <p id={descriptionId}>
          Tin “{job.title}” sẽ dừng nhận đơn mới. Cần ít nhất một đơn được duyệt
          và đã xử lý hết các đơn đang chờ.
        </p>
        {error && <StatusMessage type="error">{error}</StatusMessage>}
        <div className="job-status-dialog__buttons">
          <button
            className="job-button"
            type="button"
            autoFocus
            disabled={submitting}
            onClick={() => dialogRef.current.close()}
          >
            Hủy
          </button>
          <button
            className="job-button job-status-dialog__confirm"
            type="button"
            disabled={submitting}
            onClick={confirm}
          >
            {submitting ? 'Đang xử lý…' : 'Xác nhận'}
          </button>
        </div>
      </dialog>
    </div>
  );
}
