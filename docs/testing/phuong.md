## P01 — Kiểm thử thủ công API-07

- PASS — GET /api/job-categories trả ba ngành Bán hàng, Gia sư, Phục vụ. category_id là chuỗi.
- PASS — GET /api/job-categories?page=1 trả lỗi INVALID_QUERY.
- Môi trường — PostgreSQL local, server thử ở cổng 8081.
- Chờ tích hợp — Nối vào backend chính ở cổng 8080 sau khi nhận kết nối DB dùng chung.

## P01 — Kiểm tra backend chính và WF11

- PASS — `GET /health` trả `200` và `data.status=ok`.
- PASS — `GET /api/job-categories` trả ba ngành, `category_id` dạng chuỗi.
- PASS — Query ngoài hợp đồng trả `400 INVALID_QUERY`.
- PASS — `POST /api/jobs` không token trả `401 AUTH_REQUIRED`.
- PASS — NTD seed đăng nhập, tạo tin trả `201`, `job_id=2`, `status=RECRUITING`, `employer.user_id=1`.
- PASS — SV seed gửi cùng payload bị chặn `403 ROLE_FORBIDDEN`.
- PASS — FE `npm run build`; route WF11 được nối tại `/employer/jobs/new` và chỉ cho vai trò `EMPLOYER`.
- Môi trường — Backend `8080`, PostgreSQL local; `JWT_SECRET` đã được đặt trong `.env` local bị Git bỏ qua. Đăng nhập NTD seed trả `200` và token Bearer.
- CHƯA CHẠY — Thao tác UI WF11 trên trình duyệt tích hợp do browser automation không khả dụng trong phiên này.
- PASS — Đăng tin từ WF11 bằng tài khoản nhà tuyển dụng. Đối chiếu trong pgAdmin: `job_id=4`, `employer_id=1`, `status=RECRUITING`. Sau khi gửi, giao diện về `/`. Kiểm tra luồng quay về danh sách WF10 khi tích hợp P03.
## Kiểm thử tích hợp P01 và P03

- PASS — Nhà tuyển dụng A mở WF10, bấm Đăng tin tuyển dụng để sang WF11, điền form và đăng tin.
- PASS — Sau khi đăng, trình duyệt tự quay về `/employer/jobs`. Bảng WF10 hiển thị tin mới `nv bán thuốc` với trạng thái Đang tuyển.
- PASS — Frontend build thành công bằng `npm.cmd --prefix frontend run build`.
- Commit tích hợp đã kiểm thử: `3f5213a`.

## P04 — Xác nhận đã nhận người

- Nền P01–P03: PR #4, `3e543c2`. `origin/main` lúc đối chiếu: `6c260fd`.
- PASS — `RUN_DB_TESTS=1 node --test tests/job-status.test.js` trên PostgreSQL 18.6 riêng, 5/5 mục báo đạt. Kiểm tra chuyển đúng, giữ nguyên đơn, gửi lặp, còn PENDING, thiếu APPROVED, quyền chủ tin và đầu vào sai.
- PASS — Giao dịch nộp mô phỏng giữ khóa tin rồi commit đơn PENDING. API-19 chờ khóa, đọc đơn mới commit và trả `409 PENDING_APPLICATIONS_EXIST`.
- PASS — Chromium với API và PostgreSQL thật. Hủy không gửi PATCH. Còn đơn PENDING hiển thị lỗi và giữ Đang tuyển. Ca hợp lệ hiển thị Đã nhận người sau khi tải lại.
- PASS — `npm run build` trong `frontend`.
- Bộ backend: 68/70 mục báo đạt. Hai mục lỗi là ca JWT HS256 và nhóm test chứa ca đó. Cùng lỗi xuất hiện trên nền `3e543c2`: test cũ ký token thiếu claim `role` mà middleware hiện yêu cầu.
- CHƯA CHẠY — WF13 sau khi Khang nhúng component và X-02 với API nộp đơn thật của Tài. Giao dịch SQL mô phỏng ở trên kiểm tra phần khóa của API-19.
