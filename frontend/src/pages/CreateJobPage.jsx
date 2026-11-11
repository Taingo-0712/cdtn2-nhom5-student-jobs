import '../styles/create-job.css';
// Nạp CSS riêng cho màn WF11.

import { useEffect, useState } from 'react';
// Dùng state để lưu danh mục, trạng thái gửi và lỗi của form.

import { createJob, listJobCategories } from '../api/jobApi.js';
// Dùng hai hàm em đã viết ở bước trước.

import StatusMessage from '../components/StatusMessage.jsx';
// Dùng lại thành phần hiển thị lỗi chung của nhóm.

const salaryUnits = [
  ['HOUR', 'đ/giờ'],
  ['DAY', 'đ/ngày'],
  ['SHIFT', 'đ/ca'],
  ['MONTH', 'đ/tháng'],
];
// Người dùng nhìn nhãn tiếng Việt. API nhận mã HOUR, DAY, SHIFT hoặc MONTH.

export default function CreateJobPage({ token, onCancel, onCreated }) {
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState('');
  // Lưu danh mục và thông báo riêng cho bước tải ngành nghề.

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Tách lỗi theo ô nhập, lỗi chung và trạng thái đang đăng tin.

  useEffect(() => {
    let active = true;
    // Bỏ qua phản hồi đến sau khi người dùng đã rời trang.

    listJobCategories()
      .then(({ data }) => {
        if (active) setCategories(data);
      })
      .catch(() => {
        if (active) setCategoryError('Không tải được danh mục ngành nghề.');
      })
      .finally(() => {
        if (active) setLoadingCategories(false);
      });

    return () => { active = false; };
  }, []);
  // Khi mở WF11, tải danh mục thật từ API-07.

  async function handleSubmit(event) {
    event.preventDefault();
    // Giữ người dùng trên trang để React xử lý form.

    if (submitting) return;
    setFieldErrors({});
    setSubmitError('');

    if (!token) {
      setSubmitError('Em cần đăng nhập bằng tài khoản nhà tuyển dụng để đăng tin.');
      return;
    }
    // Token sẽ được Tài truyền từ phiên đăng nhập dùng chung.

    const payload = Object.fromEntries(new FormData(event.currentTarget));
    // Lấy chín trường theo thuộc tính name. ID và mức lương vẫn là chuỗi.

    setSubmitting(true);
    let created;

    try {
      const response = await createJob(payload, token);
      created = response.data;
      // API-08 trả tin vừa tạo trong data.

    } catch (error) {
      setSubmitError(error.message || 'Không đăng được tin tuyển dụng.');
      setFieldErrors(Object.fromEntries(
        (error.details || []).map(({ field, reason }) => [field, reason])
      ));
      // Ví dụ lỗi salary_max sẽ hiện ngay dưới ô lương tối đa.
      return;

    } finally {
      setSubmitting(false);
    }

    onCreated(created);
    // Trang cha sẽ đưa người dùng về WF10 sau khi tạo thành công.
  }

  function fieldError(name) {
    return fieldErrors[name] ? <small role="alert">{fieldErrors[name]}</small> : null;
  }
  // Hiện thông báo dưới đúng ô có lỗi từ API.

  return (
    <section className="job-create">
      <h1>Đăng tin tuyển dụng</h1>
      <p>Các trường có dấu * là bắt buộc.</p>

      <div className="job-create__layout">
        <form className="job-create__card" onSubmit={handleSubmit}>
          <h2>Thông tin công việc</h2>

          {/* Hai trường mô tả tin, mỗi trường chiếm một hàng. */}
          <label>Tiêu đề *
            <input name="title" required maxLength={200} />
            {fieldError('title')}
          </label>

          <label>Mô tả công việc *
            <textarea name="description" required maxLength={20000} rows={5} />
            {fieldError('description')}
          </label>

          {/* Danh mục lấy từ API-07. Tỉnh/thành phố nhập theo form WF11. */}
          <div className="job-create__row">
            <label>Ngành nghề *
              <select name="category_id" defaultValue="" required disabled={loadingCategories}>
                <option value="" disabled>
                  {loadingCategories ? 'Đang tải…' : 'Chọn ngành nghề'}
                </option>
                {categories.map(({ category_id, name }) => (
                  <option key={category_id} value={category_id}>{name}</option>
                ))}
              </select>
              {fieldError('category_id')}
            </label>

            <label>Tỉnh/thành phố *
              <input name="city" required maxLength={100} />
              {fieldError('city')}
            </label>
          </div>

          {/* Nhập tiền dạng chuỗi, ví dụ 35000 hoặc 35000.50. */}
          <div className="job-create__row">
            <label>Lương tối thiểu (VND) *
              <input name="salary_min" inputMode="decimal" required placeholder="35000" />
              {fieldError('salary_min')}
            </label>

            <label>Lương tối đa (VND) *
              <input name="salary_max" inputMode="decimal" required placeholder="35000" />
              {fieldError('salary_max')}
            </label>
          </div>

          {/* work_time là mô tả lịch hoặc ca làm. */}
          <label>Thời gian làm việc *
            <input name="work_time" required maxLength={5000} />
            {fieldError('work_time')}
          </label>

          <div className="job-create__row">
            <label>Địa chỉ cụ thể *
              <input name="location_detail" required maxLength={255} />
              {fieldError('location_detail')}
            </label>

            <label>Đơn vị lương *
              <select name="salary_unit" defaultValue="" required>
                <option value="" disabled>Chọn đơn vị lương</option>
                {salaryUnits.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {fieldError('salary_unit')}
            </label>
          </div>

          {categoryError && <StatusMessage type="error">{categoryError}</StatusMessage>}
          {submitError && <StatusMessage type="error">{submitError}</StatusMessage>}

          {/* Khóa nút khi đang gửi hoặc chưa có danh mục để chọn. */}
          <div className="job-create__actions">
            <button type="submit" disabled={submitting || loadingCategories || !categories.length}>
              {submitting ? 'Đang đăng…' : 'Đăng tin'}
            </button>
            <button type="button" onClick={onCancel} disabled={submitting}>Hủy</button>
          </div>
        </form>

        <aside className="job-create__card">
          <h2>Trước khi đăng</h2>
          <p>Điền đủ thông tin công việc, mức lương và địa điểm.</p>
          <p>Lương tối thiểu không được vượt lương tối đa.</p>
          <p>Tin mới sẽ có trạng thái Đang tuyển.</p>
        </aside>
      </div>
    </section>
  );
}
