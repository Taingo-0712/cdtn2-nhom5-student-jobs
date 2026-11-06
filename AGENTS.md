# AGENTS.md cho Nhóm 5

Repo `cdtn2-nhom5-student-jobs` triển khai website việc làm part-time cho sinh viên. File này hướng dẫn Tài, Phương và Khang làm việc trong repo và ChatGPT Project chung.

## Bắt đầu một đầu việc

1. Xác định người làm, mã việc, nhánh và phần cần làm (BE, FE, nối API hoặc TEST). Dùng thông tin đã có trong yêu cầu và repo. Khi có quyền đọc repo, kiểm tra `git status --short --branch` và các file liên quan trước khi sửa.
2. Đọc mục tương ứng trong bản phân công và các tài liệu liên quan. Dùng lại file hiện có. Khi thiếu dữ liệu, nói rõ dữ liệu cần xác nhận và tiếp tục phần có thể làm độc lập.
3. Khi hướng dẫn, mở đầu bằng mục lục và giải thích ngắn thuật ngữ, công cụ đang dùng. Ghi mã việc, bước hiện tại, mục đích, loại việc và ai cần bàn giao gì. Chỉ rõ thư mục, thao tác hoặc lệnh PowerShell, kết quả mong đợi và cách kiểm tra trước bước tiếp theo.

Ví dụ yêu cầu `Em là Phương, làm P01-FE trên nhánh feat/phuong-p01-create-job. Đọc AGENTS.md, bản phân công và frame WF11. Hướng dẫn bước đầu tiên và cách kiểm tra.`

## Nguồn dùng chung

Đọc bản tương ứng trong repo hoặc trong Sources. Cột thư mục là vị trí khi nhóm đưa tài liệu vào repo.

| Tài liệu | Dùng để quyết định | Thư mục |
|---|---|---|
| `Phan_cong_va_thu_tu_thuc_hien_Demo1_Nhom5_v1.2.docx` | Người phụ trách, mã việc, thứ tự, link frame Figma và tình huống test | `docs/planning/` |
| `Pham_vi_US_va_quy_tac_nghiep_vu_Nhom5_v2.0.docx` và SRS | Phạm vi Demo 1 và quy tắc nghiệp vụ | `docs/requirements/` |
| `Cong_nghe_phien_ban_va_cau_truc_du_an_Nhom5_v2.1.docx` | Phiên bản, công nghệ, thư mục và lệnh chạy | `docs/architecture/` |
| `Database_Schema_va_quy_trinh_cap_nhat_Nhom5_v2.1.docx` | Bảng, quan hệ, ràng buộc, migration và seed | `docs/database/` |
| `API_Contract_day_du_Nhom5_v2.0.docx` | Method, URL, request, response, quyền và lỗi | `docs/api/` |
| `quy-uoc-dat-ten-file.md` | Tên file giao diện và tài liệu. Với backend và test, dùng bản công nghệ và phân công mới | `docs/planning/` |
| `README.md` | Cách lấy bản nền, cấu hình, chạy và kiểm tra trên máy | Gốc repo |

Dùng Figma cho bố cục và tương tác trong phạm vi đã chốt. Khi gặp hướng dẫn cũ khác về công nghệ, thư mục hoặc lệnh, dùng Công nghệ và Database Schema v2.1. Nếu cần thay đổi tên trường, trạng thái, URL, quyền hoặc phạm vi, nêu quy định đang dùng và ảnh hưởng. Chờ người yêu cầu xác nhận trước khi sửa. Với hợp đồng dùng chung, thống nhất thêm với người phụ trách liên quan.

## Demo 1 và người phụ trách

Demo 1 có **15 US** gồm `US03`, `US04`, `US06`, `US08`, `US09` và `US12` đến `US21`. Đăng ký, tìm kiếm và lọc tin, thông báo, hồ sơ cá nhân và Admin thuộc giai đoạn sau theo tài liệu phạm vi.

| Người | Mã việc | Phần chịu trách nhiệm |
|---|---|---|
| Tài | `T01–T06` | Bộ khung và DB chung, đăng nhập SV/NTD (WF01), nộp đơn PDF (WF06), lưu và đọc CV, điều phối tích hợp |
| Phương | `P01–P06` | Danh mục và tạo tin (WF11), danh sách và chi tiết tin (WF04/WF05), tin của NTD (WF10), chuyển trạng thái tuyển dụng |
| Khang | `K01–K06` | Danh sách và chi tiết ứng viên (WF13/WF13b), duyệt/từ chối, kết quả của SV (WF07), đánh giá hai chiều |

- Tài giữ cấu hình nền, middleware xác thực và lỗi chung, route/layout gốc, HTTP client và migration. Phương giữ `jobApi.js` và `JobStatusActions.jsx`. Khang giữ phần truy vấn/quyết định trong `applicationApi.js` và phần đánh giá trong `ratingApi.js`.
- Tài giữ phần nộp đơn và đọc CV trong `applicationApi.js`. Tài và Khang thống nhất hàm và thứ tự ghép PR trước khi cùng sửa file.
- Khang sở hữu WF13/WF13b, dùng `JobStatusActions.jsx` của Phương và `CvViewer.jsx` của Tài. Truyền `job_id` và `application_id` thật theo API Contract.

## Bộ khung và dữ liệu chung

- Tài dựng T01–T02 và bàn giao commit nền. Cả ba lấy cùng commit, dùng PostgreSQL local với cùng cấu trúc và dữ liệu mẫu.
- Backend dùng **Node.js 24.12.0, Express, CommonJS và npm 11.6.2** trong `backend/`. Frontend dùng React/Vite với JavaScript và JSX trong `frontend/`. Mỗi thư mục có `package.json` và `package-lock.json` riêng. Tài khóa phiên bản thư viện sau khi chạy thử.
- Backend dùng `src/app.js` để cấu hình Express và `src/server.js` để khởi động. Đặt code tính năng vào `src/routes/`, `src/controllers/`, `src/services/`, `src/repositories/` và `src/middleware/` theo vai trò. Dùng `pg` cho PostgreSQL.
- Đặt SQL trong `backend/migrations/` và dữ liệu mẫu trong `backend/seeds/`. Tài điều phối số migration theo Database Schema v2.1. Chạy `npm run db:migrate` rồi `npm run db:seed:demo` trong `backend/` theo README. Mọi thay đổi schema đã áp dụng đi qua migration mới.
- Dùng `.env.example` để chia sẻ tên biến. Giữ file môi trường cá nhân, mật khẩu, JWT secret, token và CV thật ngoài Git. Đọc CV qua API kiểm tra quyền. Kiểm tra quyền và điều kiện nghiệp vụ ở backend, tách trạng thái tin với trạng thái đơn và tuân theo thứ tự khóa dữ liệu trong Schema.

## Kiểm thử và ghép code

1. Làm trên nhánh riêng từ bản nền và ghi mã việc trong commit/PR. Ví dụ `feat/tai-t04-apply`, `feat/phuong-p01-create-job`, `feat/khang-k02-decision`.
2. Viết test ngay trong đầu việc cho cả trường hợp thành công và lỗi. Đặt file `*.test.js` trong `backend/tests/` theo nhóm tính năng. Dùng database và thư mục CV kiểm thử riêng.
3. Chạy `npm test` trong `backend/` bằng `node:test`. Chạy `npm run build` trong `frontend/` và thử luồng đã sửa trên giao diện với API thật. Dùng cách chạy theo README của commit nền.
4. Trong PR, ghi US/frame/API liên quan, file dùng chung có thay đổi, lệnh đã chạy và kết quả thực tế. Ghi `CHƯA CHẠY` cùng lý do khi chưa kiểm chứng. Lưu ghi nhận trong `docs/testing/tai.md`, `docs/testing/phuong.md` hoặc `docs/testing/khang.md`.
5. Tài kiểm tra Phương, Phương kiểm tra Khang, Khang kiểm tra Tài. Ghép theo mốc M1 đăng nhập, M2 tạo tin và nộp CV, M3 quyết định và xem kết quả, M4 đóng tuyển, hoàn thành và đánh giá. Sau merge, lấy commit chung và chạy lại luồng đã nối.

Khi bàn giao, ghi việc đã làm, file đã sửa, cách kiểm tra và phần đang chờ. Giữ thông tin theo mã việc để người khác có thể tiếp tục từ cùng repo và commit.
