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

## T02 — Migration Demo 1 — 06/11/2026

- Nhánh: `feat/tai-t02-tao-bang-va-du-lieu-mau`. Đã đọc `AGENTS.md` và đối chiếu `Database_Schema_va_quy_trinh_cap_nhat_Nhom5_v2.1.docx` trong Downloads, mục 2–7. Không phát hiện khác biệt giữa SQL V001–V005 và schema v2.1.
- Giữ nguyên V001/V002. SHA-256 lần lượt: `4532259fbb270350dcbb780fa6461662426ea41b25207f1621c34efe4ec6c318`, `d7a39d3bf55743d47a1542be2005895776ee0875e87d14acf2604f63a6ad600e`.
- Thêm V003 applications, V004 reviews, V005 chỉ mục đúng SQL được cung cấp. Mỗi file chỉ chứa SQL tương ứng.
- Thêm `backend/scripts/migrate.js` và script `db:migrate` trong `backend/package.json`: đọc file theo phiên bản, SHA-256, khóa advisory cấp session trên cùng client `pg`, transaction riêng cho SQL và lịch sử từng file; kiểm tra toàn bộ lịch sử trước khi áp dụng mới, bỏ qua checksum khớp và dừng khi lệch.
- Thêm `backend/tests/migrations.test.js`: dùng DB `student_jobs_nhom5_t02_test` riêng trong phiên test; kiểm tra `current_database()` và DB trống. Nếu DB đó đã có bảng, giữ nguyên và tạo DB test tên có hậu tố. Dữ liệu thử FK/UQ/CHECK được rollback, giữ lại DB test để xem kết quả.
- Không sửa `backend/.env`, `docs/api-contract.md` hoặc các file `.gitkeep`. Không commit/push. Trong phiên này người dùng lưu thông tin kết nối vào `.env.example`; chỉ nạp hai giá trị vào môi trường tiến trình test khi `.env` còn trống, không ghi sang file khác và không in giá trị. Cần đưa thông tin riêng vào `.env` và làm trống file mẫu trước khi commit.

Lệnh kiểm tra cú pháp đã chạy trong `backend/`:

```powershell
node --check scripts/migrate.js
node --check tests/migrations.test.js
npm.cmd test
```

Sau khi nạp thông tin kết nối chỉ vào môi trường tiến trình, đã chạy:

```powershell
node --test tests/migrations.test.js
npm.cmd run db:migrate
npm.cmd test
```

Lần gọi `db:migrate` dùng `DB_URL=postgresql://localhost:5432/student_jobs_nhom5_t02_test` riêng cho tiến trình. Hai lượt test PostgreSQL dùng `RUN_DB_TESTS=1`, không thay `.env`. Cách chạy lại sau khi cấu hình đúng `.env` (từ `backend/`):

```powershell
$env:RUN_DB_TESTS = '1'
try {
  node --env-file-if-exists=.env --test tests/migrations.test.js
} finally {
  Remove-Item Env:RUN_DB_TESTS
}
```

- Kiểm tra cú pháp JS và đọc thứ tự V001–V005/hash V001/V002: đạt.
- `npm.cmd test` mặc định: 16 pass, 0 fail, 1 skip (bộ PostgreSQL chỉ bật khi `RUN_DB_TESTS=1`).
- Lượt PostgreSQL riêng: 9 pass, 0 fail. Lượt toàn bộ backend với `RUN_DB_TESTS=1`: **25 pass, 0 fail, 0 skip**.
- PostgreSQL thực tế: **16.15**. Trước mỗi lượt migration mới đều xác nhận đúng `current_database()` và không có bảng người dùng.
- Lượt đầu dùng DB trống `student_jobs_nhom5_t02_test`. Lượt toàn bộ test phát hiện DB này đã có 8 bảng (7 nghiệp vụ + lịch sử), giữ nguyên và tự tạo DB test trống `student_jobs_nhom5_t02_test_1793927692524_5a76996a`.
- Cả hai DB test được giữ lại để kiểm tra; dữ liệu thử chèn vào để kiểm tra FK/UQ/CHECK đã rollback. Không tạo file CV thật.
- `npm.cmd run db:migrate` trên DB test sau lượt đầu: áp dụng 0, bỏ qua 5, checksum khớp.

| Ca PostgreSQL cần báo cáo | Kết quả thực tế |
|---|---|
| Lần đầu đủ 7 bảng nghiệp vụ, 5 dòng lịch sử, 7 index | ĐẠT |
| Lần hai bỏ qua 5 file, không đổi lịch sử | ĐẠT |
| FK chặn student_id không tồn tại, SQLSTATE 23503 | ĐẠT |
| UNIQUE chặn trùng student_id/job_id với hai khóa CV khác nhau, 23505 | ĐẠT |
| CHECK chặn salary_max < salary_min, 23514 | ĐẠT |
| Checksum lệch bị từ chối; SQL lỗi rollback DDL/lịch sử; runner thứ hai đợi khóa | ĐẠT cả 3 ca |

## T02 — Cấu hình và seed Demo 1 — 06/11/2026

- Đã chuyển thông tin kết nối PostgreSQL từ `.env.example` sang `.env`: user `postgres`, DB phát triển `student_jobs_nhom5`; giữ nguyên giá trị mật khẩu, không in ra terminal/chat. File mẫu có `DB_USERNAME=`, `DB_PASSWORD=`, `JWT_SECRET=` trống.
- `git check-ignore -v -- backend/.env`: khớp `.gitignore:3:.env`. `git ls-files -- backend/.env`: trống. `git status --short -- backend/.env backend/.env.example`: trống sau khi file mẫu trở về đúng bản đã theo dõi.
- Thêm `backend/seeds/demo.js`, `backend/scripts/seed-demo.js`, `backend/tests/seed-demo.test.js`; khai báo `db:seed:demo` trong `backend/package.json`. Bổ sung cách chạy, tài khoản demo và quy tắc chạy lại trong README.
- Theo Schema v2.1 mục 8.1: 2 NTD, 3 SV, hồ sơ đúng vai trò, danh mục Bán hàng/Phục vụ/Gia sư. Dùng ID tự sinh, email chuẩn hóa, bcrypt cost 12; không tạo Admin/tin/đơn/CV.
- Toàn bộ seed chạy trong một transaction, dùng advisory lock cùng khóa với migration. Chạy lại giữ nguyên tài khoản/hồ sơ/danh mục có sẵn, không reset mật khẩu; xung đột vai trò/hồ sơ làm rollback toàn bộ lượt seed.

Lệnh đã chạy trong `backend/`:

```powershell
$env:RUN_DB_TESTS = '1'
try {
  node --env-file-if-exists=.env --test
} finally {
  Remove-Item Env:RUN_DB_TESTS
}
```

- **31 pass, 0 fail, 0 skip**, gồm 16 test Express/JWT, 9 test migration và 6 test seed (tính cả test cha).
- DB migration của lượt này: `student_jobs_nhom5_t02_test_1793928103396_99de4a2f`. DB seed riêng: `student_jobs_nhom5_t02_seed_1793928103183_f1fff39a`. Đã kiểm tra `current_database()` và DB trống trước migration.
- Seed test đạt: đúng 5 tài khoản/hồ sơ và 3 danh mục; bcrypt xác minh được mật khẩu mẫu; lượt hai không đổi số lượng, ID, hash hay thời gian; giữ mật khẩu/hồ sơ đã chỉnh; xung đột vai trò rollback cả tài khoản vừa tạo trước đó.

Đã xác nhận `current_database() = student_jobs_nhom5_t02_test`, rồi ghi đè `DB_URL` chỉ trong môi trường phiên PowerShell và chạy lệnh npm thực tế hai lần:

```powershell
npm.cmd run db:seed:demo
npm.cmd run db:seed:demo
```

| Lượt seed trên DB test | Tài khoản | Hồ sơ | Danh mục |
|---|---|---|---|
| 1 | Tạo 5, giữ 0 | Tạo 5, giữ 0 | Tạo 3, giữ 0 |
| 2 | Tạo 0, giữ 5 | Tạo 0, giữ 5 | Tạo 0, giữ 3 |

SELECT sau hai lượt: **5 users, 2 employer_profiles, 3 student_profiles, 3 job_categories**. Giữ lại DB test để xem. Không seed vào database phát triển trong phiên này.

Giữ nguyên V001–V005, sửa local ở `docs/api-contract.md` và các `.gitkeep`. Chưa stage/commit/push. Chưa kiểm thử đăng nhập qua API/giao diện vì thuộc T03.

## T02 — Xác nhận trên database phát triển và bàn giao — 06/11/2026

- Database phát triển: `student_jobs_nhom5`. V001–V005 đã áp dụng, có đủ 5 dòng trong `public.schema_migrations`.
- Tài xác nhận seed lần đầu tạo **5 tài khoản, 5 hồ sơ, 3 danh mục**; lần hai giữ nguyên số lượng. Kiểm tra SELECT trước commit xác nhận `current_database() = student_jobs_nhom5` và hiện có **5 users, 2 employer_profiles, 3 student_profiles, 3 job_categories**. Lượt kiểm tra này chỉ đọc dữ liệu, không chạy lại migration/seed.
- Kết quả bộ backend trước khi thêm test seed: **25 pass, 0 fail, 0 skip**, gồm 16 test Express/JWT và 9 test migration. Đây là lượt riêng với kết quả **31 pass, 0 fail, 0 skip** sau khi bổ sung test seed đã ghi ở trên.
- Chạy từ `backend/`: `npm.cmd run db:migrate`, sau đó `npm.cmd run db:seed:demo`. Chạy lại seed giữ dữ liệu đã có, không reset mật khẩu/hồ sơ. Tài khoản mẫu nằm trong `backend/seeds/demo.js`, dùng dữ liệu giả và mật khẩu demo chung được băm bằng bcrypt trước khi lưu.
- Commit T02 chỉ gồm 5 SQL migration, hai script migrate/seed, `backend/package.json`, dữ liệu seed, hai file test T02 và tài liệu kết quả này. Giữ `.env`, `docs/api-contract.md`, các `.gitkeep` và phần README đang sửa ngoài commit theo danh sách staging được yêu cầu.

## T03 — BE: kết nối và đọc tài khoản — 06/11/2026

- Nhánh: `feat/tai-t03-dang-nhap-va-phan-quyen`.
- Tạo `backend/src/config/db.js`: Pool dùng chung đọc cấu hình T02. Khi chạy mẫu ban đầu với pg hiện có, `connectionString` làm mất mật khẩu cấu hình riêng; ghép DB_USERNAME/DB_PASSWORD vào URL trong bộ nhớ trước khi tạo Pool và đặt timeout kết nối 5 giây. Không sửa `.env`, không in mật khẩu hoặc hash.
- Tạo `backend/src/repositories/userRepository.js` đúng truy vấn được cung cấp: tìm email qua tham số `$1`, trả hàng đầu tiên hoặc `null`.
- Chạy kiểm tra chỉ đọc bằng Node với `--env-file-if-exists=.env`: xác nhận `current_database() = student_jobs_nhom5`; tìm được cả 5 tài khoản seed đúng email/vai trò, ID dạng chuỗi, có hash và thời điểm tạo; email không tồn tại trả null; chuỗi SQL thử nghiệm được coi là giá trị email và trả null. Tổng 7 ca truy vấn đạt.
- `node --check src/config/db.js` và `node --check src/repositories/userRepository.js`: đạt. `npm.cmd test`: 16 pass, 0 fail, 2 skip (hai bộ PostgreSQL T02 chưa bật RUN_DB_TESTS trong lượt này).
- Đây là bước repository của API-02; chưa tạo endpoint `POST /api/auth/login`, chưa kiểm thử đăng nhập HTTP. Giữ nguyên các sửa local V001–V005 đang có; chưa stage/commit/push.

## T03 — API-02: POST /api/auth/login — 06/11/2026

- Tạo `src/services/authService.js`, `src/routes/authRoutes.js` đúng mẫu được yêu cầu; gắn router sau JSON parser trong `src/app.js`. Giữ nguyên `src/config/db.js` đã điều chỉnh và `src/repositories/userRepository.js`.
- `.env` local chưa có JWT_SECRET: đã tạo khóa ngẫu nhiên 32 byte, không in hoặc đưa vào Git. File mẫu giữ trống JWT_SECRET.
- Thêm `tests/auth.test.js`: kiểm thử HTTP validation không cần DB; khi bật RUN_DB_TESTS thì tạo PostgreSQL test riêng, xác nhận tên DB/DB trống, chạy migration/seed rồi thử đăng nhập. Điều chỉnh hai test health/foundation để có URL cấu hình test mặc định khi nạp app, không cần kết nối DB cho các ca này.
- DB auth test: `student_jobs_nhom5_t03_test_1793940484825_fd31b981`. Tài khoản ADMIN giả chỉ được tạo ở DB test để xác nhận Demo 1 từ chối vai trò này.

Đã chạy trong `backend/`:

```powershell
$env:RUN_DB_TESTS = '1'
try {
  node --env-file-if-exists=.env --test
} finally {
  Remove-Item Env:RUN_DB_TESTS
}
npm.cmd test
```

- Bộ đầy đủ có PostgreSQL: **53 pass, 0 fail, 0 skip** (31 ca trước đó và 22 ca auth, tính cả test cha).
- `npm.cmd test` mặc định: **28 pass, 0 fail, 3 skip**; ba nhóm tích hợp PostgreSQL chỉ chạy khi bật RUN_DB_TESTS và nạp cấu hình.
- HTTP 200 cho cả 5 tài khoản seed; email trim/lowercase, password giữ nguyên; JWT xác minh bằng HS256, `sub` dạng chuỗi, role đúng DB và `exp - iat = 3600`. Response có `token_type: Bearer`, `expires_in: 3600`, Cache-Control no-store, user chỉ có 4 trường công khai.
- Đạt các lỗi 415 Content-Type; 400 JSON hỏng/body mảng/thiếu trường/trường thừa/email hoặc password không hợp lệ; 401 cùng INVALID_CREDENTIALS cho email không tồn tại, mật khẩu sai hoặc có khoảng trắng thêm, ADMIN. Phản hồi 401 có WWW-Authenticate Bearer. Thiếu secret trả lỗi 500 chung, không lộ chi tiết.
- Giữ nguyên các sửa local V001–V005; chưa stage/commit/push. Chưa nối giao diện đăng nhập hoặc gắn phân quyền vào route nghiệp vụ.

## T03 — Thử HTTP tại localhost:8080 — 06/11/2026

- Gửi request trực tiếp từ terminal bằng Node fetch tới `POST http://localhost:8080/api/auth/login`, tương ứng bảng thao tác Postman được yêu cầu. Không thao tác ứng dụng Postman trong lượt này; không in token, mật khẩu hoặc hash.
- Tài khoản SV: `sv.a@demo.nhom5.test`; NTD: `ntd.a@demo.nhom5.test`; dùng mật khẩu demo trong `backend/seeds/demo.js`.

| Ca thử trên server local | Kết quả thực tế |
|---|---|
| Đăng nhập SV | 200, role STUDENT, có access_token, expires_in 3600, Cache-Control no-store |
| Đăng nhập NTD | 200, role EMPLOYER, có access_token, expires_in 3600, Cache-Control no-store |
| Đúng email, sai mật khẩu | 401 INVALID_CREDENTIALS, WWW-Authenticate Bearer |
| Thêm role trong JSON | 400 FIELD_NOT_ALLOWED |
| Bỏ password | 400 VALIDATION_ERROR |

- **5/5 ca HTTP đạt**. JWT của hai lượt thành công được xác minh bằng khóa local và HS256, sub/role khớp user; response không có password_hash. Cả ba lỗi có details dạng mảng rỗng và trace_id.
- Không thay đổi mã nguồn trong bước này; chưa stage/commit/push.

## T03 — Chốt mốc API đăng nhập — 06/11/2026

- Chạy lại `npm.cmd test` trong `backend/` sau khi có API-02: **28 pass, 0 fail, 3 skip**. Ba nhóm tích hợp PostgreSQL chưa bật RUN_DB_TESTS trong lượt này. Đây là kết quả trên working tree có các test auth và điều chỉnh cấu hình test đang ở local.
- Commit theo danh sách được yêu cầu chỉ gồm `src/config/db.js`, `src/repositories/userRepository.js`, `src/services/authService.js`, `src/routes/authRoutes.js`, `src/app.js` và tài liệu này. Các file test T03/điều chỉnh test, `.env`, V001–V005 giữ ngoài commit này.
- Đã đọc `src/middleware/requireAuth.js` và `src/middleware/errorHandler.js`; chưa sửa. Middleware hiện xác minh JWT HS256 và gắn claims vào `req.auth`, chưa đọc tài khoản/vai trò từ DB.
