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