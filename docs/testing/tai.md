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
