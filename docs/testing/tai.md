# Kết quả kiểm thử của Tài

## T01-BE — Bộ khung Express — 06/11/2026

- Nhánh: `feat/tai-t01-foundation`.
- Phạm vi: `GET /health`, CORS, lỗi JSON chung và middleware xác minh JWT HS256. Chưa gắn xác thực vào route nghiệp vụ; tài khoản và quyền từ DB thuộc T03.
- Môi trường: Node.js `v24.12.0`, npm `11.6.2`, Git `2.50.1.windows.1`.
- Đã cài bằng `npm.cmd install --save-exact express@5 cors pg bcryptjs jsonwebtoken multer`; có `backend/package-lock.json`, npm báo 0 lỗ hổng.
- `npm.cmd test`: đạt 15/15 test, 0 lỗi. Bao gồm health/CORS, 404, JSON sai, thiếu/sai/hết hạn JWT, sai chữ ký/thuật toán, claims không hợp lệ, JWT hợp lệ và thiếu cấu hình secret.
- `npm.cmd run dev`: server khởi động tại `http://localhost:8080`.
- `Invoke-RestMethod http://localhost:8080/health | ConvertTo-Json`: trả `{"data":{"status":"ok"}}`.
- Đã kiểm tra `.env` và `node_modules/` được Git bỏ qua; `.env.example` được chia sẻ, không chứa bí mật.
- PowerShell trên máy chặn `npm.ps1`, dùng `npm.cmd` cho các lệnh npm.
- CHƯA CHẠY: kiểm tra bằng trình duyệt, frontend/build, PostgreSQL/migration/seed và luồng nghiệp vụ; thuộc các bước tiếp theo.
- Bàn giao: dùng `npm.cmd ci`, sao chép `.env.example` sang `.env` nếu chưa có, rồi `npm.cmd run dev` trong `backend/`. Health không cần cấu hình DB/JWT.

## T01-FE + nối API — 06/11/2026

- Nhánh: `feat/tai-t01-foundation`. Tạo frontend theo mẫu được cung cấp, gồm React Router, `StatusMessage`, HTTP client và CSS cơ bản.
- Thư viện khóa phiên bản: React/React DOM `19.3.1`, React Router DOM `7.18.5`, Vite `8.3.6`, plugin React `6.2.1`; có `frontend/package-lock.json`. npm báo 0 lỗ hổng khi cài.
- `npm.cmd run build` trong `frontend/`: đạt, xuất `dist/`.
- `npm.cmd test` trong `backend/`: đạt 15/15 test.
- `npm.cmd run dev` trong `frontend/`: Vite chạy tại `http://localhost:5173`, bật `strictPort`.
- Chrome headless tại `/`, với Express đang chạy: trang thực tế hiển thị `Đã kết nối backend`.
- Dừng Express, tải lại `/` bằng Chrome headless: hiển thị `Không kết nối được backend. Kiểm tra cổng 8080.`.
- Khởi động lại Express, tải lại `/` bằng Chrome headless: hiển thị `Đã kết nối backend` trở lại.
- Chrome headless tại `/duong-dan-khong-ton-tai`: hiển thị `Trang không tồn tại.`.
- Gọi `/health` với Origin `http://localhost:5173`: HTTP 200, `Access-Control-Allow-Origin: http://localhost:5173`, body `{"data":{"status":"ok"}}`.
- Đã kiểm tra `.env.local`, `node_modules/` và `dist/` được Git bỏ qua. Base URL trong `.env.example` là `http://localhost:8080`.
- Bàn giao: trong `frontend/`, chạy `npm.cmd ci`, sao chép `.env.example` sang `.env.local` nếu chưa có rồi chạy `npm.cmd run dev`. Giữ Express tại cổng 8080.
- CHƯA CHẠY: kiểm tra thủ công bằng F12 → Network và các trang nghiệp vụ Demo 1 chưa triển khai.

## T01 — Bước 4: kiểm thử và build — 06/11/2026

- Tạo `backend/tests/app.test.js` đúng mẫu được cung cấp, kiểm tra health, CORS và cấu trúc lỗi 404.
- Từ gốc repo, chạy `npm.cmd --prefix backend test`: đạt 16/16 test, 0 lỗi, gồm test mới và các test foundation hiện có.
- Từ gốc repo, chạy `npm.cmd --prefix frontend run build`: thành công, Vite xuất kết quả vào `frontend/dist/` (được Git bỏ qua).
