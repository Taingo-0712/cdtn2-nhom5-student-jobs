# CDTN2 Nhóm 5 — Việc làm part-time cho sinh viên

Repo `cdtn2-nhom5-student-jobs` của Tài, Phương và Khang. Demo 1 đi từ đăng nhập và đăng tin đến ứng tuyển, xử lý hồ sơ, hoàn thành công việc và đánh giá hai chiều.

Backend dùng Node.js + Express. Frontend dùng React + Vite. PostgreSQL lưu dữ liệu. Tài bàn giao commit nền và kết quả chạy T01–T02 ở mục 6. Các lệnh bên dưới dùng khi commit đó có đủ file và script tương ứng.

## 1. Kiểm tra môi trường

Mở PowerShell và đối chiếu phiên bản.

```powershell
node -v
npm -v
git --version
```

| Công cụ | Bản chuẩn |
|---|---|
| Node.js | v24.12.0 |
| npm | 11.6.2 |
| Git cho Windows | 2.50.1.windows.1 |
| PostgreSQL Server | 16.15 |

Trong pgAdmin, kết nối PostgreSQL và chạy `SHOW server_version;` ở Query Tool để kiểm tra phiên bản server. Báo Tài nếu có phiên bản khác. Tài khóa phiên bản Express, React, Vite và các thư viện sau khi chạy thử bộ khung. Mỗi ứng dụng có file khóa phụ thuộc riêng.

## 2. Lấy bản nền chung

Lần đầu, thay `URL_REPO_GITHUB` bằng URL thực tế của repo Nhóm 5.

```powershell
git clone "URL_REPO_GITHUB"
Set-Location cdtn2-nhom5-student-jobs
```

Nếu đã clone, mở thư mục gốc repo. Sau khi lưu việc đang làm trên nhánh riêng, cập nhật `main` và đối chiếu mã commit với bản Tài bàn giao.

```powershell
git switch main
git pull --ff-only origin main
git rev-parse --short HEAD
```

Tại thư mục gốc, kiểm tra file trước khi chạy.

```powershell
Test-Path backend/package.json
Test-Path backend/package-lock.json
Test-Path backend/.env.example
Test-Path backend/scripts/migrate.js
Test-Path backend/scripts/seed-demo.js
Test-Path frontend/package.json
Test-Path frontend/package-lock.json
Test-Path frontend/.env.example
```

Nếu còn `False`, ghi lại đường dẫn và commit đang mở. Thiếu file khung hoặc file khóa là phần T01. Thiếu script migration hoặc seed là phần T02. Căn cứ vào kết quả này để xác định bước đang chờ.

## 3. Cấu hình PostgreSQL và chạy backend

Trong pgAdmin, tạo database local `student_jobs_nhom5` nếu chưa có. Mỗi máy dùng database riêng cho CDTN2. SQL đặt trong `backend/migrations/` và dữ liệu mẫu trong `backend/seeds/` theo Database Schema v2.1.

Từ thư mục gốc, mở `backend/` và tạo file cấu hình nếu máy chưa có.

```powershell
Set-Location backend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Mở `backend/.env` và điền giá trị theo file mẫu của commit.

| Biến | Giá trị cần điền |
|---|---|
| `DB_URL` | `postgresql://localhost:5432/student_jobs_nhom5`, điều chỉnh cổng theo PostgreSQL trên máy |
| `DB_USERNAME` | Tài khoản PostgreSQL local |
| `DB_PASSWORD` | Mật khẩu PostgreSQL local |
| `JWT_SECRET` | Khóa ký JWT dành cho backend local |
| `APP_STORAGE_DIR` | Thư mục lưu CV local, dự kiến `./storage/cv` tính từ `backend/` |

Giữ `.env`, mật khẩu, secret và CV thật trên máy. Dùng `.env.example` để chia sẻ cấu hình mẫu. Trong `backend/`, chạy từng lệnh và kiểm tra lệnh trước đã thành công.

```powershell
npm ci
npm run db:migrate
npm run db:seed:demo
npm run dev
```

**Kiểm tra.** Migration ghi lịch sử vào `schema_migrations` trong đúng database. Seed nạp dữ liệu mẫu theo T02. Log backend cho biết cổng chạy, dự kiến `8080`. Khi lấy commit có migration mới, chạy lại `npm run db:migrate` trước khi khởi động. Việc chạy lại seed tuân theo hướng dẫn T02.

## 4. Chạy frontend

Giữ backend đang chạy. Mở PowerShell mới tại thư mục gốc repo và chuyển vào `frontend/`.

```powershell
Set-Location frontend
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm ci
npm run dev
```

Kiểm tra `VITE_API_BASE_URL=http://localhost:8080` trong `frontend/.env.local`. Đường dẫn endpoint đã chứa `/api` nên base URL là địa chỉ backend. Mở địa chỉ Vite in ra, dự kiến `http://localhost:5173`. Thử API theo mục bàn giao M0 và kiểm tra phản hồi trong tab Network.

## 5. Chạy test và build

- Mở terminal tại `backend/` và chạy `npm test`. Khi test cần PostgreSQL hoặc CV, dùng database và thư mục kiểm thử riêng theo cấu hình Tài bàn giao. Ghi số test và kết quả thực tế.
- Tại `frontend/`, chạy `npm run build` sau khi cài phụ thuộc. Thử lại màn hình vừa sửa trên trình duyệt với API thật.
- Mỗi bạn commit và push lên nhánh theo mã việc, rồi mở PR vào `main`. Tài kiểm tra Phương, Phương kiểm tra Khang, Khang kiểm tra Tài. Sau merge, cả nhóm lấy commit mới và thử lại luồng đã nối.

## 6. Bàn giao bản nền M0

Tài điền thông tin sau khi chạy trên commit dùng để bàn giao. Phương và Khang đối chiếu cùng commit rồi ghi kết quả trên máy mình.

| Mục | Thông tin cần ghi |
|---|---|
| Commit trên `main` | Mã từ `git rev-parse --short HEAD` |
| Backend và API kiểm tra | Cổng, method/URL, phản hồi mong đợi và kết quả thực tế |
| Frontend | Địa chỉ chạy và giá trị `VITE_API_BASE_URL` |
| Database T02 | Migration đã áp dụng, seed và cách dùng tài khoản mẫu |
| Kiểm thử | Cách chạy với DB/CV test riêng, kết quả `npm test` và `npm run build` |
| Kết quả ba máy | Tài, Phương, Khang ghi commit, phần đạt và lỗi còn lại |

M0 đạt khi cả ba chạy được bản nền, dùng cùng schema và dữ liệu mẫu, frontend gọi được backend và các bước kiểm tra có kết quả. Làm tiếp theo bản phân công Demo 1 v1.2.

## Tài liệu

- `AGENTS.md` quy định cách chọn đầu việc, viết code, kiểm thử và bàn giao.
- Bản phân công Demo 1 v1.2 dùng cùng tài liệu Công nghệ v2.1, Database Schema v2.1, Phạm vi US v2.0 và API Contract v2.0.
- `docs/planning/huong-dan-git-nhom.md` hướng dẫn Git. Lệnh chạy và test dùng theo README này.
