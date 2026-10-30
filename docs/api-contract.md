# API Contract — CDTN2 Nhóm 5

**Đề tài:** Nền tảng quản lý freelance / marketplace việc làm part-time cho sinh viên.  
**Track:** SE · **Mốc:** Buổi 5 — Thiết kế chi tiết · **Phiên bản:** 1.0 · **Ngày:** 30/10/2026.  
**Vị trí trong repo:** `docs/api-contract.md`.  
**Trạng thái:** Đặc tả thiết kế phục vụ triển khai và nộp mốc; chưa phải bằng chứng API đã lập trình hoặc kiểm thử thành công.

## 1. Căn cứ, phạm vi và quyết định thiết kế

### 1.1. Căn cứ đã đối chiếu

- `SRS_rutgon_nhom5_FORMAT (1).docx`: 41 US, trong đó 27 MUST; các FR, AC và BR cập nhật 30/10/2026.
- `Product_Backlog_Nhom5_SE_Mau.xlsx`: cùng phạm vi 27 MUST và 14 WON’T.
- `ERD_Nhom5_CDTN2.drawio` và `Database_Schema_Nhom5_CDTN2.docx`: 8 bảng; khóa BIGINT đề xuất; CV nằm trong applications; hai nhóm trạng thái tách riêng.
- `Bảng công nghệ lựa chọn.docx`: ReactJS gọi REST API của Java Spring Boot; DBMS còn lựa chọn MySQL/PostgreSQL.
- `Buoi05_ChuyenDeTotNghiep2.pdf`: thiết kế CSDL/API khớp thiết kế tổng thể; ví dụ tạo tin bằng `POST /api/jobs`.

### 1.2. Phạm vi triển khai

Đặc tả US01–US22 và US35–US39. Luồng chính: đăng ký/đăng nhập → hồ sơ cá nhân → đăng/sửa tin → tìm/lọc/xem tin → ứng tuyển cùng CV → xem và duyệt/từ chối đơn → xác nhận đã nhận người → xác nhận hoàn thành cả đợt → đánh giá hai chiều. Thông báo được tạo khi kết quả ứng tuyển đổi. Admin đăng nhập bằng tài khoản seed, chỉ xem danh sách tài khoản SV/NTD và lọc vai trò.

US23–US34 và US40–US41 là WON’T: không có API báo cáo/khiếu nại, lưu tin yêu thích, thống kê tuyển dụng, thanh toán thật, app native, chat realtime, khóa/mở khóa hay sửa/xóa tài khoản người khác. Không có API rút/xóa đơn, thay CV của đơn đã nộp, tạo kho CV hoặc hoàn thành riêng từng sinh viên.

### 1.3. Những lựa chọn kỹ thuật của bản contract

Các quy ước sau cụ thể hóa phần SRS chưa chốt; là quyết định thiết kế v1, không diễn giải thành yêu cầu nguyên văn của giảng viên:

- Prefix `/api`; môi trường local minh họa `http://localhost:8080/api`; xác thực JWT Bearer, token sống 3.600 giây, hết hạn đăng nhập lại. Không bổ sung refresh token trong bản này.
- Dùng `snake_case` để khớp từ điển dữ liệu. BIGINT trao đổi dưới dạng chuỗi số để tránh mất độ chính xác ở JavaScript.
- Lương VND dùng chuỗi thập phân và đơn vị HOUR/DAY/MONTH/PROJECT theo đề xuất Schema. Lọc lương dùng khoảng giao nhau và bắt buộc cùng đơn vị.
- Điểm đánh giá 1–5; nhận xét tùy chọn. Mỗi tin một ngành nghề; danh mục ngành seed, chỉ có API đọc hỗ trợ form và bộ lọc.
- Giới hạn chuỗi, phân trang, mã lỗi, cấu trúc JSON và điều kiện lọc được chốt tại các mục dưới.
- Xem/tìm tin và đọc danh mục ngành cho phép công khai; mọi thao tác dữ liệu riêng cần đăng nhập và kiểm tra quyền. Dữ liệu hồ sơ cá nhân không được công khai theo quyền đọc tin.

## 2. Quy ước giao tiếp chung

### 2.1. HTTP, xác thực và dữ liệu

| Mục | Quy ước |
| --- | --- |
| URL local | `http://localhost:8080/api`; mọi đường dẫn mục 4 đã bao gồm `/api` |
| JSON | UTF-8; tên trường `snake_case`; `Content-Type: application/json` cho POST/PATCH JSON |
| Header xác thực | `Authorization: Bearer <access_token>`; server kiểm tra chữ ký JWT, hạn dùng và tài khoản/role tương ứng |
| Token | Claims tối thiểu `sub` = user_id dạng chuỗi, `role`, `iat`, `exp`; không chứa mật khẩu hoặc CV |
| Vai trò | `STUDENT`, `EMPLOYER`, `ADMIN`; role đăng nhập do server đọc từ tài khoản, không do client chọn |
| ID | Chuỗi chữ số biểu diễn số nguyên 1…9223372036854775807; không dấu, không số 0 ở đầu; path/query cũng theo quy ước này |
| Thời điểm | ISO 8601 UTC, ví dụ `2026-10-30T06:20:00Z`; server tạo các trường thời điểm |
| Tiền | Chuỗi khớp `^(0|[1-9][0-9]{0,11})(\.[0-9]{1,2})?$`; đầu ra luôn 2 số lẻ; tối đa `999999999999.99` (DECIMAL(14,2)) |
| Trường vắng | JSON đọc trả `null` cho trường tùy chọn chưa có; frontend hiển thị “Chưa cập nhật” |
| Chuỗi | Trim các chuỗi thông tin; chuỗi bắt buộc không được chỉ có khoảng trắng. Mật khẩu không trim |
| PATCH | Trường không gửi giữ nguyên; trường tùy chọn gửi null hoặc chuỗi rỗng sau trim được xóa về null; trường bắt buộc không nhận null/rỗng |
| Trường ngoài schema | Từ chối toàn bộ request bằng 400 `FIELD_NOT_ALLOWED`, không bỏ qua âm thầm; riêng email/role trong PATCH hồ sơ trả 403 `FIELD_NOT_EDITABLE` |
| Bảo vệ dữ liệu | user_id/người tạo/chủ tin/người nhận đánh giá lấy từ xác thực và dữ liệu liên kết, không nhận tùy ý từ client |
| Tệp CV | Gửi `multipart/form-data`, field `cv`; frontend để trình duyệt tự đặt boundary |

Với API bảo vệ: kiểm tra xác thực trước, rồi vai trò. Sau khi parse ID/body hợp lệ, kiểm tra tài nguyên có tồn tại và quyền sở hữu trước khi trả dữ liệu hay thực hiện nghiệp vụ. Tài nguyên không tồn tại trả 404; tài nguyên tồn tại nhưng ngoài quyền trả 403, không kèm dữ liệu riêng. API 201 có thể kèm header `Location` nếu được nêu ở từng mục; GET không có request body.

### 2.2. Phản hồi

Một đối tượng thành công:

```json
{
  "data": {
    "job_id": "301",
    "status": "RECRUITING"
  }
}
```

Danh sách có phân trang: `page` mặc định 1, số nguyên ≥ 1; `size` mặc định 20, từ 1 đến 100. Vượt trang cuối trả `data: []` với tổng số thực tế, không trả 404. Không có dữ liệu thì total_elements = 0 và total_pages = 0. Sắp xếp ổn định theo thời điểm mới nhất, ID giảm dần khi trùng thời điểm. Danh mục ngành và danh sách đánh giá của một đơn là hai danh sách nhỏ không phân trang.

```json
{
  "data": [
    {
      "job_id": "301",
      "status": "RECRUITING"
    }
  ],
  "meta": {
    "page": 1,
    "size": 20,
    "total_elements": 1,
    "total_pages": 1
  }
}
```

Lỗi JSON thống nhất (kể cả lỗi trên API tải CV): `error.code` ổn định để frontend xử lý; `message` phục vụ hiển thị; `details` luôn là mảng, rỗng nếu không có lỗi trường; `trace_id` do server tạo để tra log, không phải cột DB bắt buộc.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ.",
    "details": [
      {
        "field": "title",
        "reason": "Không được để trống."
      }
    ]
  },
  "trace_id": "trace-demo-001"
}
```

### 2.3. Mã HTTP và lỗi dùng chung

| HTTP | Mã lỗi / ý nghĩa |
| --- | --- |
| 200 | Đọc hoặc cập nhật thành công. |
| 201 | Tạo tài khoản, tin, đơn hoặc đánh giá thành công. |
| 400 | `VALIDATION_ERROR`, `INVALID_ID`, `INVALID_QUERY`, `FIELD_NOT_ALLOWED`, `EMPTY_PATCH`: sai đầu vào; không thay đổi dữ liệu. |
| 401 | `AUTH_REQUIRED` thiếu token; `INVALID_TOKEN` sai/hết hạn; `INVALID_CREDENTIALS` email hoặc mật khẩu đăng nhập sai. Header `WWW-Authenticate: Bearer` trên phản hồi 401. |
| 403 | `ROLE_FORBIDDEN`, `RESOURCE_FORBIDDEN`, `FIELD_NOT_EDITABLE`, `ROLE_NOT_ALLOWED`: không được thực hiện thao tác. |
| 404 | `JOB_NOT_FOUND`, `APPLICATION_NOT_FOUND`: không có tài nguyên theo ID hợp lệ. |
| 409 | Email/đơn/đánh giá trùng; tin hoặc đơn sai trạng thái; chưa đủ điều kiện chuyển trạng thái/đánh giá. |
| 413 | `CV_TOO_LARGE`: file vượt 5.242.880 byte. |
| 415 | `UNSUPPORTED_MEDIA_TYPE`: Content-Type request không phù hợp; `CV_TYPE_NOT_ALLOWED`: phần cv không phải PDF. |
| 500 | `INTERNAL_ERROR`, `APPLICATION_SAVE_FAILED`, `CV_UNAVAILABLE`, `PROFILE_INCONSISTENT`: lỗi hệ thống; thông báo chung, không trả stack trace, SQL, storage key hay bí mật. |

Mọi endpoint có thể trả 500 theo mẫu chung. API bảo vệ có thể trả 401/403; POST/PATCH trả 415 nếu Content-Type sai. Các lỗi riêng được liệt kê tại từng endpoint. Hệ thống phải ánh xạ lỗi UNIQUE do tranh chấp đồng thời sang 409 tương ứng, không trả lỗi SQL thô.

## 3. Từ điển dữ liệu request/response

### 3.1. Tài khoản và hồ sơ

| Trường | Kiểu / giới hạn | Quy tắc |
| --- | --- | --- |
| email | string, tối đa 254 | Bắt buộc khi đăng ký/đăng nhập; cú pháp email hợp lệ; trim, chuẩn hóa chữ thường; duy nhất. Chỉ đọc qua chức năng hồ sơ. |
| password | string | Đăng ký 8–128 ký tự; không trim, không ghi log; đăng nhập yêu cầu chuỗi không rỗng ≤128. Chỉ lưu password_hash bằng thuật toán băm mật khẩu phù hợp; không trả hai trường này. |
| role | enum | Đăng ký chỉ STUDENT hoặc EMPLOYER; ADMIN được seed. Bất biến qua API hồ sơ. |
| full_name | string, 1–150 | Bắt buộc cho STUDENT. |
| display_name | string, 1–200 | Bắt buộc cho EMPLOYER. |
| contact_name | string/null, tối đa 150 | Tùy chọn cho EMPLOYER. |
| phone | string/null | Tùy chọn; nếu có phải khớp ^[0-9]{10,11}$. Không dùng kiểu số. |
| introduction | string/null, tối đa 5.000 | Tùy chọn. Giới thiệu hồ sơ không thay thế CV ứng tuyển. |
| user_id, created_at, updated_at | ID / thời điểm | Chỉ đọc; server cấp. Hồ sơ GET luôn trả đúng một hồ sơ, không tự tạo thêm. |

Response `User`: user_id, email, role, created_at. Response `StudentProfile`: user_id, email, full_name, phone, introduction, updated_at. Response `EmployerProfile`: user_id, email, display_name, contact_name, phone, introduction, updated_at. Các khóa được liệt kê đều hiện diện; trường tùy chọn có thể null. Email được join từ users, không sao chép vào bảng hồ sơ.

### 3.2. Tin tuyển dụng

| Trường input | Kiểu / giới hạn | Quy tắc |
| --- | --- | --- |
| title | string, 1–200 | Bắt buộc. |
| description | string, 1–20.000 | Bắt buộc. |
| category_id | ID | Bắt buộc; phải có trong job_categories. Nếu không có trả 400 CATEGORY_NOT_FOUND. |
| work_time | string, 1–5.000 | Bắt buộc; mô tả ca/thời gian theo thỏa thuận, không phải trạng thái làm việc. |
| salary_min, salary_max | chuỗi thập phân | Bắt buộc; 0 ≤ salary_min ≤ salary_max. Bằng nhau là lương cố định. |
| salary_unit | enum | Bắt buộc: HOUR, DAY, MONTH, PROJECT. |
| city | string, 1–100 | Bắt buộc; tên tỉnh/thành phố theo danh sách thống nhất trong dữ liệu seed/mẫu của nhóm; trim khi lưu. |
| location_detail | string, 1–255 | Bắt buộc; địa điểm cụ thể. |

`JobSummary` gồm job_id, employer {user_id, display_name}, category {category_id, name}, title, work_time, salary_min, salary_max, salary_unit, currency (hằng VND), city, location_detail, status, completed_at, created_at, updated_at. `JobDetail` gồm toàn bộ JobSummary và description. `employer` chỉ là tên hiển thị tối thiểu của chủ tin, không gồm email, điện thoại hoặc hồ sơ riêng. Server cấp employer_id từ token khi tạo; client không được gửi status/completed_at/employer_id vào API tạo/sửa nội dung.

### 3.3. Đơn, CV, đánh giá, thông báo và danh sách Admin

| Resource | Các trường response và quy tắc |
| --- | --- |
| Application | application_id, job_id, student_id, status, cv, applied_at, decided_at. decided_at null khi PENDING, có giá trị khi APPROVED/REJECTED. |
| CV metadata | original_name (≤255), mime_type = application/pdf, size_bytes (1…5242880), download_url (đường dẫn API bảo vệ). Không trả cv_storage_key. Tên file được làm sạch; không dùng làm đường dẫn storage. |
| ApplicationDetail | Toàn bộ Application; thêm student {user_id, full_name} và job {job_id, title, status, employer_id}. Tên student là hồ sơ hiện tại; CV giữ nguyên bản đã nộp. |
| StudentApplicationItem | Toàn bộ Application; thêm job {job_id, title, status, employer_id}, giúp SV phân biệt trạng thái đơn với trạng thái tin. |
| EmployerApplicationItem | Toàn bộ Application; thêm student {user_id, full_name}; không tự cung cấp danh sách hồ sơ cá nhân ngoài quyền. |
| Review | review_id, application_id, reviewer_id, reviewee_id, rating (integer 1…5), comment (string/null, ≤2.000), created_at. Server suy ra reviewer và reviewee theo đơn. |
| Notification | notification_id, application_id, recipient_id, message (string), created_at. Chỉ kết quả duyệt/từ chối, không có trường đã đọc vì chưa thiết kế trong ERD. |
| AdminUserItem | user_id, display_name, email, role, created_at; display_name lấy full_name của SV hoặc display_name của NTD. Không trả ADMIN trong danh sách này; không có password/password_hash/CV. |

## 4. Danh sách và đặc tả API

Chỉ nhận query được liệt kê ở từng endpoint; endpoint không có bảng query không nhận tham số query. Tham số query không có tên trong danh sách hoặc lặp lại trả 400 INVALID_QUERY.

Tất cả request/response dưới đây dùng dữ liệu giả để minh họa. Một dữ liệu có thể xuất hiện ở các trạng thái khác nhau trong từng ví dụ độc lập. Mọi trường đều theo mục 2–3; response JSON luôn được bọc trong `data`, danh sách phân trang có thêm `meta`.

| Mã | Method và endpoint | Chức năng | Quyền | US |
| --- | --- | --- | --- | --- |
| API-01 | `POST /api/auth/register` | Đăng ký và tự khởi tạo hồ sơ | Công khai | US01, US02 |
| API-02 | `POST /api/auth/login` | Đăng nhập ba vai trò | Công khai | US03, US04, US05 |
| API-03 | `GET /api/student/profile` | SV xem hồ sơ của mình | STUDENT | US35 |
| API-04 | `PATCH /api/student/profile` | SV cập nhật hồ sơ của mình | STUDENT | US36 |
| API-05 | `GET /api/employer/profile` | NTD xem hồ sơ của mình | EMPLOYER | US37 |
| API-06 | `PATCH /api/employer/profile` | NTD cập nhật hồ sơ của mình | EMPLOYER | US38 |
| API-07 | `GET /api/job-categories` | Đọc danh mục ngành nghề | Công khai | US06, US07, US11 (hỗ trợ) |
| API-08 | `POST /api/jobs` | NTD đăng tin tuyển dụng | EMPLOYER | US06 |
| API-09 | `GET /api/jobs` | Danh sách, tìm kiếm và lọc tin | Công khai | US08, US10, US11, US17 |
| API-10 | `GET /api/jobs/{job_id}` | Xem chi tiết và trạng thái tin | Công khai | US09, US17 |
| API-11 | `PATCH /api/jobs/{job_id}` | NTD sửa nội dung tin của mình | EMPLOYER + chủ tin | US07 |
| API-12 | `GET /api/employer/jobs` | NTD xem các tin mình đã đăng | EMPLOYER | US07, US18, US19 (hỗ trợ) |
| API-13 | `POST /api/jobs/{job_id}/applications` | SV ứng tuyển cùng CV | STUDENT | US12 |
| API-14 | `GET /api/student/applications` | SV xem các đơn và kết quả của mình | STUDENT | US16, US17 |
| API-15 | `GET /api/jobs/{job_id}/applications` | Chủ tin xem danh sách ứng viên | EMPLOYER + chủ tin | US13 |
| API-16 | `GET /api/applications/{application_id}` | Xem chi tiết đơn ứng tuyển | SV sở hữu đơn HOẶC NTD sở hữu tin | US13, US16 |
| API-17 | `GET /api/applications/{application_id}/cv` | Truy cập CV đã nộp | SV sở hữu đơn HOẶC NTD sở hữu tin | US12, US13 (hỗ trợ) |
| API-18 | `PATCH /api/applications/{application_id}/status` | NTD duyệt hoặc từ chối từng đơn | EMPLOYER + chủ tin | US14, US15, US22 |
| API-19 | `PATCH /api/jobs/{job_id}/status` | Chủ tin xác nhận đã nhận người / hoàn thành | EMPLOYER + chủ tin | US18, US19 |
| API-20 | `POST /api/applications/{application_id}/reviews` | Đánh giá hai chiều sau hoàn thành | SV của đơn HOẶC NTD chủ tin | US20, US21 |
| API-21 | `GET /api/applications/{application_id}/reviews` | Hai bên xem đánh giá của đơn | SV của đơn HOẶC NTD chủ tin | US20, US21 (hỗ trợ hiển thị) |
| API-22 | `GET /api/notifications` | SV nhận thông báo kết quả ứng tuyển | STUDENT | US22 |
| API-23 | `GET /api/admin/users` | Admin xem danh sách tài khoản và lọc role | ADMIN | US39 |

### 4.1. API-01 — Đăng ký và tự khởi tạo hồ sơ

**`POST /api/auth/register`**  
**Quyền:** Công khai. **Truy vết:** US01, US02 ↔ FR1.

**Request:**

```json
{
  "email": "sv.demo@example.com",
  "password": "MatKhauMau123!",
  "role": "STUDENT",
  "full_name": "Sinh viên minh họa"
}
```

**Validation và xử lý:** Dùng schema tài khoản/hồ sơ mục 3.1. Body STUDENT chỉ gồm email, password, role, full_name và phone/introduction tùy chọn; không nhận trường riêng của EMPLOYER. Body EMPLOYER gồm email, password, role, display_name và contact_name/phone/introduction tùy chọn; không nhận full_name. Ví dụ EMPLOYER: {"email":"ntd.demo@example.com","password":"MatKhauMau123!","role":"EMPLOYER","display_name":"Đơn vị tuyển dụng minh họa"}. Response cùng cấu trúc user/profile, profile theo role. Tạo users và đúng một hồ sơ trong cùng transaction, rollback cả hai nếu một phần thất bại. Không tự đăng nhập, không trả token ở API này.

**Thành công:** HTTP 201.

```json
{
  "data": {
    "user": {
      "user_id": "101",
      "email": "sv.demo@example.com",
      "role": "STUDENT",
      "created_at": "2026-10-30T06:00:00Z"
    },
    "profile": {
      "user_id": "101",
      "email": "sv.demo@example.com",
      "full_name": "Sinh viên minh họa",
      "phone": null,
      "introduction": null,
      "updated_at": "2026-10-30T06:00:00Z"
    }
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Sai dữ liệu hoặc sai trường theo role. |
| 403 | ROLE_NOT_ALLOWED | Gửi role ADMIN; không tạo tài khoản. |
| 409 | EMAIL_ALREADY_EXISTS | Email chuẩn hóa đã tồn tại. |

### 4.2. API-02 — Đăng nhập ba vai trò

**`POST /api/auth/login`**  
**Quyền:** Công khai. **Truy vết:** US03, US04, US05 ↔ FR1.

**Request:**

```json
{
  "email": "sv.demo@example.com",
  "password": "MatKhauMau123!"
}
```

**Validation và xử lý:** Dùng cùng API cho STUDENT/EMPLOYER/ADMIN; request không chứa role. Server đối chiếu mật khẩu băm và lấy role từ users. Admin được seed sẵn. Token không làm thay đổi role; frontend chọn màn hình theo role trả về. Phản hồi chứa token dùng Cache-Control: no-store.

**Thành công:** HTTP 200.

```json
{
  "data": {
    "access_token": "<JWT_ACCESS_TOKEN>",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "user_id": "101",
      "email": "sv.demo@example.com",
      "role": "STUDENT",
      "created_at": "2026-10-30T06:00:00Z"
    }
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Thiếu/sai trường đầu vào. |
| 401 | INVALID_CREDENTIALS | Email không có hoặc sai mật khẩu; cùng một thông báo, không chỉ ra trường nào đúng. |

### 4.3. API-03 — SV xem hồ sơ của mình

**`GET /api/student/profile`**  
**Quyền:** STUDENT. **Truy vết:** US35 ↔ FR15.

**Request:**

Không có body. Không nhận query. Path ID (nếu có) theo mục 2.1.

**Validation và xử lý:** Không có path/query user_id; server dùng sub trong token. Không tạo hồ sơ mới khi GET. phone/introduction chưa có trả null. Không hỗ trợ endpoint xem hồ sơ cá nhân SV khác.

**Thành công:** HTTP 200.

```json
{
  "data": {
    "user_id": "101",
    "email": "sv.demo@example.com",
    "full_name": "Sinh viên minh họa",
    "phone": null,
    "introduction": null,
    "updated_at": "2026-10-30T06:00:00Z"
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | INVALID_QUERY | Gửi query user_id hoặc tham số không hỗ trợ. |
| 500 | PROFILE_INCONSISTENT | Tài khoản thiếu hồ sơ tương ứng do dữ liệu không nhất quán. |

### 4.4. API-04 — SV cập nhật hồ sơ của mình

**`PATCH /api/student/profile`**  
**Quyền:** STUDENT. **Truy vết:** US36 ↔ FR16.

**Request:**

```json
{
  "full_name": "Sinh viên đã cập nhật",
  "phone": "0912345678",
  "introduction": "Quan tâm công việc cuối tuần."
}
```

**Validation và xử lý:** Chỉ nhận full_name, phone, introduction; phải có ít nhất một trường. Theo PATCH mục 2.1; mọi trường được kiểm tra trước, một trường sai thì không lưu phần còn lại. Cập nhật updated_at; không thay đổi email/role hay CV trong các đơn đã gửi.

**Thành công:** HTTP 200.

```json
{
  "data": {
    "user_id": "101",
    "email": "sv.demo@example.com",
    "full_name": "Sinh viên đã cập nhật",
    "phone": "0912345678",
    "introduction": "Quan tâm công việc cuối tuần.",
    "updated_at": "2026-10-30T06:05:00Z"
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | EMPTY_PATCH | Body rỗng. |
| 400 | VALIDATION_ERROR | Tên rỗng/quá dài hoặc điện thoại sai. |
| 403 | FIELD_NOT_EDITABLE | Gửi email hoặc role để sửa. |

### 4.5. API-05 — NTD xem hồ sơ của mình

**`GET /api/employer/profile`**  
**Quyền:** EMPLOYER. **Truy vết:** US37 ↔ FR17.

**Request:**

Không có body. Không nhận query. Path ID (nếu có) theo mục 2.1.

**Validation và xử lý:** Lấy user_id từ token; không nhận user_id từ query. Trường tùy chọn chưa có trả null. Không tạo thêm hồ sơ hoặc trả hồ sơ của NTD khác.

**Thành công:** HTTP 200.

```json
{
  "data": {
    "user_id": "201",
    "email": "ntd.demo@example.com",
    "display_name": "Đơn vị tuyển dụng minh họa",
    "contact_name": null,
    "phone": null,
    "introduction": null,
    "updated_at": "2026-10-30T06:00:00Z"
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | INVALID_QUERY | Gửi user_id hoặc query không hỗ trợ. |
| 500 | PROFILE_INCONSISTENT | Tài khoản thiếu hồ sơ tương ứng. |

### 4.6. API-06 — NTD cập nhật hồ sơ của mình

**`PATCH /api/employer/profile`**  
**Quyền:** EMPLOYER. **Truy vết:** US38 ↔ FR18.

**Request:**

```json
{
  "display_name": "Đơn vị tuyển dụng đã cập nhật",
  "contact_name": "Người liên hệ minh họa",
  "phone": "0987654321"
}
```

**Validation và xử lý:** Chỉ nhận display_name, contact_name, phone, introduction; ít nhất một trường. Kiểm tra toàn bộ trước khi lưu; email/role bất biến. Không nhận user_id và không cập nhật hồ sơ NTD khác.

**Thành công:** HTTP 200.

```json
{
  "data": {
    "user_id": "201",
    "email": "ntd.demo@example.com",
    "display_name": "Đơn vị tuyển dụng đã cập nhật",
    "contact_name": "Người liên hệ minh họa",
    "phone": "0987654321",
    "introduction": null,
    "updated_at": "2026-10-30T06:05:00Z"
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | EMPTY_PATCH | Không có trường cập nhật. |
| 400 | VALIDATION_ERROR | Tên bắt buộc rỗng hoặc điện thoại/độ dài sai. |
| 403 | FIELD_NOT_EDITABLE | Yêu cầu sửa email/role. |

### 4.7. API-07 — Đọc danh mục ngành nghề

**`GET /api/job-categories`**  
**Quyền:** Công khai. **Truy vết:** US06, US07, US11 (hỗ trợ) ↔ FR2, FR3, FR9.

**Request:**

Không có body. Không nhận query. Path ID (nếu có) theo mục 2.1.

**Validation và xử lý:** Danh mục được seed sẵn; trả toàn bộ, không phân trang; sắp xếp name tăng dần, category_id tăng dần khi trùng. Không có API tạo/sửa/xóa danh mục. Danh sách trống trả data: []. Không nhận query.

**Thành công:** HTTP 200.

```json
{
  "data": [
    {
      "category_id": "1",
      "name": "Bán hàng"
    },
    {
      "category_id": "2",
      "name": "Công nghệ thông tin"
    }
  ]
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | INVALID_QUERY | Có tham số không hỗ trợ. |

### 4.8. API-08 — NTD đăng tin tuyển dụng

**`POST /api/jobs`**  
**Quyền:** EMPLOYER. **Truy vết:** US06 ↔ FR2.

**Request:**

```json
{
  "title": "Nhân viên bán hàng part-time",
  "description": "Hỗ trợ bán hàng, tư vấn và sắp xếp hàng hóa theo ca đã thỏa thuận.",
  "category_id": "1",
  "work_time": "Thứ 7 và Chủ nhật, 08:00–12:00",
  "salary_min": "25000.00",
  "salary_max": "30000.00",
  "salary_unit": "HOUR",
  "city": "Hồ Chí Minh",
  "location_detail": "Địa điểm minh họa tại TP.HCM"
}
```

**Validation và xử lý:** Tất cả trường mục 3.2 bắt buộc; chỉ chấp nhận đúng các trường đó. employer_id lấy từ token, status = RECRUITING, completed_at = null; server cấp ID và thời điểm. Chưa có luồng kiểm duyệt tin bởi Admin.

**Thành công:** HTTP 201. Header `Location: /api/jobs/301`.

```json
{
  "data": {
    "job_id": "301",
    "employer": {
      "user_id": "201",
      "display_name": "Đơn vị tuyển dụng minh họa"
    },
    "category": {
      "category_id": "1",
      "name": "Bán hàng"
    },
    "title": "Nhân viên bán hàng part-time",
    "work_time": "Thứ 7 và Chủ nhật, 08:00–12:00",
    "salary_min": "25000.00",
    "salary_max": "30000.00",
    "salary_unit": "HOUR",
    "currency": "VND",
    "city": "Hồ Chí Minh",
    "location_detail": "Địa điểm minh họa tại TP.HCM",
    "status": "RECRUITING",
    "completed_at": null,
    "created_at": "2026-10-30T06:10:00Z",
    "updated_at": "2026-10-30T06:10:00Z",
    "description": "Hỗ trợ bán hàng, tư vấn và sắp xếp hàng hóa theo ca đã thỏa thuận."
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Thiếu/sai nội dung, lương hoặc địa điểm. |
| 400 | CATEGORY_NOT_FOUND | category_id không có trong danh mục. |

### 4.9. API-09 — Danh sách, tìm kiếm và lọc tin

**`GET /api/jobs`**  
**Quyền:** Công khai. **Truy vết:** US08, US10, US11, US17 ↔ FR3, FR6.

**Query được hỗ trợ:**

| Tên | Kiểu | Quy tắc |
| --- | --- | --- |
| keyword | string ≤200 | Tùy chọn; trim; rỗng coi như bỏ điều kiện; tìm chuỗi con không phân biệt hoa/thường trong title HOẶC description; không cam kết bỏ dấu tiếng Việt. |
| category_id | ID | Tùy chọn; ID hợp lệ nhưng không có ngành tương ứng trả danh sách rỗng. |
| city | string ≤100 | Tùy chọn; trim, so khớp toàn bộ tên không phân biệt hoa/thường; rỗng bỏ điều kiện; tên không có dữ liệu trả danh sách rỗng. |
| salary_min, salary_max | chuỗi thập phân | Tùy chọn; nếu có cả hai thì min ≤ max; khoảng lọc giao với khoảng lương tin, gồm hai đầu. |
| salary_unit | enum | Bắt buộc nếu gửi salary_min hoặc salary_max; có thể dùng độc lập để lọc đơn vị. |
| status | enum trạng thái tin | Tùy chọn; bỏ qua = cả ba trạng thái; để chỉ tìm tin còn nhận đơn gửi RECRUITING. |
| page, size | integer | Theo mục 2.2. |

**Request:**

Không có body. Query theo bảng phía trên. Path ID (nếu có) theo mục 2.1.

**Validation và xử lý:** Ví dụ URL: /api/jobs?keyword=b%C3%A1n&city=H%E1%BB%93%20Ch%C3%AD%20Minh&salary_min=25000&salary_unit=HOUR&page=1&size=20. Từ khóa có thể nhập tiếng Việt; ví dụ "bán" sẽ khớp tiêu đề minh họa. Điều kiện từ khóa và mọi bộ lọc kết hợp bằng AND; bên trong keyword là title OR description. Điều kiện lương: job.salary_max ≥ filter.salary_min nếu có, và job.salary_min ≤ filter.salary_max nếu có, đồng thời cùng salary_unit. Không quy đổi lương giờ/tháng. Không gửi mọi điều kiện lọc sẽ lấy lại danh sách ban đầu, gồm mọi trạng thái. Trả JobSummary; sort created_at DESC, job_id DESC. Giá trị query phải URL-encode; mỗi tham số xuất hiện tối đa một lần.

**Thành công:** HTTP 200.

```json
{
  "data": [
    {
      "job_id": "301",
      "employer": {
        "user_id": "201",
        "display_name": "Đơn vị tuyển dụng minh họa"
      },
      "category": {
        "category_id": "1",
        "name": "Bán hàng"
      },
      "title": "Nhân viên bán hàng part-time",
      "work_time": "Thứ 7 và Chủ nhật, 08:00–12:00",
      "salary_min": "25000.00",
      "salary_max": "30000.00",
      "salary_unit": "HOUR",
      "currency": "VND",
      "city": "Hồ Chí Minh",
      "location_detail": "Địa điểm minh họa tại TP.HCM",
      "status": "RECRUITING",
      "completed_at": null,
      "created_at": "2026-10-30T06:10:00Z",
      "updated_at": "2026-10-30T06:10:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "size": 20,
    "total_elements": 1,
    "total_pages": 1
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | INVALID_QUERY | Sai kiểu, giới hạn, enum; lương âm; min > max; lọc lương thiếu đơn vị hoặc query không hỗ trợ. |

### 4.10. API-10 — Xem chi tiết và trạng thái tin

**`GET /api/jobs/{job_id}`**  
**Quyền:** Công khai. **Truy vết:** US09, US17 ↔ FR3, FR6.

**Request:**

Không có body. Không nhận query. Path ID (nếu có) theo mục 2.1.

**Validation và xử lý:** Path job_id theo mục 2.1; không có query. Trả JobDetail đúng tin ở bất kỳ trạng thái hợp lệ; xem tin COMPLETED không có nghĩa được phép ứng tuyển. Không trả danh sách ứng viên hoặc dữ liệu liên hệ riêng qua API công khai.

**Thành công:** HTTP 200.

```json
{
  "data": {
    "job_id": "301",
    "employer": {
      "user_id": "201",
      "display_name": "Đơn vị tuyển dụng minh họa"
    },
    "category": {
      "category_id": "1",
      "name": "Bán hàng"
    },
    "title": "Nhân viên bán hàng part-time",
    "work_time": "Thứ 7 và Chủ nhật, 08:00–12:00",
    "salary_min": "25000.00",
    "salary_max": "30000.00",
    "salary_unit": "HOUR",
    "currency": "VND",
    "city": "Hồ Chí Minh",
    "location_detail": "Địa điểm minh họa tại TP.HCM",
    "status": "RECRUITING",
    "completed_at": null,
    "created_at": "2026-10-30T06:10:00Z",
    "updated_at": "2026-10-30T06:10:00Z",
    "description": "Hỗ trợ bán hàng, tư vấn và sắp xếp hàng hóa theo ca đã thỏa thuận."
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | INVALID_ID | job_id sai định dạng/phạm vi. |
| 404 | JOB_NOT_FOUND | Không tồn tại tin. |

### 4.11. API-11 — NTD sửa nội dung tin của mình

**`PATCH /api/jobs/{job_id}`**  
**Quyền:** EMPLOYER + chủ tin. **Truy vết:** US07 ↔ FR9.

**Request:**

```json
{
  "title": "Nhân viên bán hàng cuối tuần",
  "salary_min": "28000.00",
  "salary_max": "32000.00"
}
```

**Validation và xử lý:** Chỉ nhận các trường input mục 3.2; ít nhất một trường. Tin phải RECRUITING và thuộc NTD hiện tại. Kiểm tra giá trị sau khi hợp nhất PATCH với dữ liệu cũ, gồm salary_min ≤ salary_max. Không đổi chủ tin, status, completed_at hoặc đơn ứng tuyển. Một lỗi thì không lưu phần nào.

**Thành công:** HTTP 200.

```json
{
  "data": {
    "job_id": "301",
    "employer": {
      "user_id": "201",
      "display_name": "Đơn vị tuyển dụng minh họa"
    },
    "category": {
      "category_id": "1",
      "name": "Bán hàng"
    },
    "title": "Nhân viên bán hàng cuối tuần",
    "work_time": "Thứ 7 và Chủ nhật, 08:00–12:00",
    "salary_min": "28000.00",
    "salary_max": "32000.00",
    "salary_unit": "HOUR",
    "currency": "VND",
    "city": "Hồ Chí Minh",
    "location_detail": "Địa điểm minh họa tại TP.HCM",
    "status": "RECRUITING",
    "completed_at": null,
    "created_at": "2026-10-30T06:10:00Z",
    "updated_at": "2026-10-30T06:15:00Z",
    "description": "Hỗ trợ bán hàng, tư vấn và sắp xếp hàng hóa theo ca đã thỏa thuận."
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | EMPTY_PATCH | Body rỗng. |
| 400 | VALIDATION_ERROR | Dữ liệu sau hợp nhất không hợp lệ. |
| 400 | CATEGORY_NOT_FOUND | Ngành mới không tồn tại. |
| 400 | FIELD_NOT_ALLOWED | Gửi status/employer_id/completed_at hoặc trường ngoài schema. |
| 403 | RESOURCE_FORBIDDEN | Tin thuộc NTD khác. |
| 404 | JOB_NOT_FOUND | Không có tin. |
| 409 | JOB_NOT_EDITABLE | Tin đã FILLED hoặc COMPLETED. |

### 4.12. API-12 — NTD xem các tin mình đã đăng

**`GET /api/employer/jobs`**  
**Quyền:** EMPLOYER. **Truy vết:** US07, US18, US19 (hỗ trợ) ↔ FR9, FR6.

**Query được hỗ trợ:**

| Tên | Kiểu | Quy tắc |
| --- | --- | --- |
| status | enum trạng thái tin | Tùy chọn; bỏ qua = cả ba trạng thái. |
| page, size | integer | Theo mục 2.2. |

**Request:**

Không có body. Query theo bảng phía trên. Path ID (nếu có) theo mục 2.1.

**Validation và xử lý:** Server lọc employer_id theo token; không nhận employer_id từ query. Trả JobSummary của chính NTD, sort created_at DESC, job_id DESC. Đây là danh sách quản lý tin, không phải API thống kê tuyển dụng US29.

**Thành công:** HTTP 200.

```json
{
  "data": [
    {
      "job_id": "301",
      "employer": {
        "user_id": "201",
        "display_name": "Đơn vị tuyển dụng minh họa"
      },
      "category": {
        "category_id": "1",
        "name": "Bán hàng"
      },
      "title": "Nhân viên bán hàng part-time",
      "work_time": "Thứ 7 và Chủ nhật, 08:00–12:00",
      "salary_min": "25000.00",
      "salary_max": "30000.00",
      "salary_unit": "HOUR",
      "currency": "VND",
      "city": "Hồ Chí Minh",
      "location_detail": "Địa điểm minh họa tại TP.HCM",
      "status": "RECRUITING",
      "completed_at": null,
      "created_at": "2026-10-30T06:10:00Z",
      "updated_at": "2026-10-30T06:10:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "size": 20,
    "total_elements": 1,
    "total_pages": 1
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | INVALID_QUERY | Sai enum/phân trang hoặc query không hỗ trợ. |

### 4.13. API-13 — SV ứng tuyển cùng CV

**`POST /api/jobs/{job_id}/applications`**  
**Quyền:** STUDENT. **Truy vết:** US12 ↔ FR4.

**Request:**

```http
POST /api/jobs/301/applications
Authorization: Bearer <access_token>
Content-Type: multipart/form-data; boundary=boundary_demo

--boundary_demo
Content-Disposition: form-data; name="cv"; filename="cv-sinh-vien.pdf"
Content-Type: application/pdf

<noi dung nhi phan PDF>
--boundary_demo--
```

Đoạn trên minh họa cấu trúc, không phải nội dung PDF thật. Trong Postman chọn Body → form-data → key cv, loại File.

**Validation và xử lý:** Path job_id hợp lệ. multipart chỉ có đúng một field cv dạng file; không nhận student_id/status/storage_key hoặc field khác. CV có nội dung, PDF thật, tối đa 5.242.880 byte. Kiểm tra nội dung file, không chỉ đuôi .pdf hoặc MIME do client gửi. Cấu hình multipart/proxy cho phép request tối thiểu 6 MiB để chứa phần overhead; giới hạn riêng file cv vẫn đúng 5 MiB. Tên file sau làm sạch tối đa 255 ký tự, vượt giới hạn trả 400 VALIDATION_ERROR. Tin phải RECRUITING, SV chưa có đơn tại tin. Không bắt buộc hoàn thiện mọi trường hồ sơ. Lưu file dưới khóa mới riêng tư và tạo đơn PENDING; chỉ trả 201 khi cả hai thành công. Trường cv của response là metadata, không chứa bytes/storage key. Không nhận introduction thay file.

**Thành công:** HTTP 201. Header `Location: /api/applications/1001`.

```json
{
  "data": {
    "application_id": "1001",
    "job_id": "301",
    "student_id": "101",
    "status": "PENDING",
    "cv": {
      "original_name": "cv-sinh-vien.pdf",
      "mime_type": "application/pdf",
      "size_bytes": 124000,
      "download_url": "/api/applications/1001/cv"
    },
    "applied_at": "2026-10-30T06:20:00Z",
    "decided_at": null
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | CV_REQUIRED | Thiếu file cv. |
| 400 | INVALID_MULTIPART | Nhiều file hoặc field không được hỗ trợ. |
| 400 | CV_EMPTY | File có 0 byte. |
| 413 | CV_TOO_LARGE | File > 5 MiB. |
| 415 | CV_TYPE_NOT_ALLOWED | Không phải PDF. |
| 404 | JOB_NOT_FOUND | Không có tin. |
| 409 | JOB_NOT_RECRUITING | Tin FILLED/COMPLETED. |
| 409 | APPLICATION_ALREADY_EXISTS | SV đã có đơn tại tin. |
| 500 | APPLICATION_SAVE_FAILED | File hoặc DB lưu thất bại; không để đơn dở dang chặn lần thử lại. |

### 4.14. API-14 — SV xem các đơn và kết quả của mình

**`GET /api/student/applications`**  
**Quyền:** STUDENT. **Truy vết:** US16, US17 ↔ FR6.

**Query được hỗ trợ:**

| Tên | Kiểu | Quy tắc |
| --- | --- | --- |
| status | enum trạng thái đơn | Tùy chọn: PENDING, APPROVED, REJECTED. |
| page, size | integer | Theo mục 2.2. |

**Request:**

Không có body. Query theo bảng phía trên. Path ID (nếu có) theo mục 2.1.

**Validation và xử lý:** Chỉ lấy student_id từ token. Trả StudentApplicationItem; status ngoài cùng là kết quả đơn, job.status là trạng thái tin. Sort applied_at DESC, application_id DESC. Không nhận student_id từ query.

**Thành công:** HTTP 200.

```json
{
  "data": [
    {
      "application_id": "1001",
      "job_id": "301",
      "student_id": "101",
      "status": "PENDING",
      "cv": {
        "original_name": "cv-sinh-vien.pdf",
        "mime_type": "application/pdf",
        "size_bytes": 124000,
        "download_url": "/api/applications/1001/cv"
      },
      "applied_at": "2026-10-30T06:20:00Z",
      "decided_at": null,
      "job": {
        "job_id": "301",
        "title": "Nhân viên bán hàng part-time",
        "status": "RECRUITING",
        "employer_id": "201"
      }
    }
  ],
  "meta": {
    "page": 1,
    "size": 20,
    "total_elements": 1,
    "total_pages": 1
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | INVALID_QUERY | Sai trạng thái/phân trang hoặc query không hỗ trợ. |

### 4.15. API-15 — Chủ tin xem danh sách ứng viên

**`GET /api/jobs/{job_id}/applications`**  
**Quyền:** EMPLOYER + chủ tin. **Truy vết:** US13 ↔ FR5.

**Query được hỗ trợ:**

| Tên | Kiểu | Quy tắc |
| --- | --- | --- |
| status | enum trạng thái đơn | Tùy chọn: PENDING, APPROVED, REJECTED. |
| page, size | integer | Theo mục 2.2. |

**Request:**

Không có body. Query theo bảng phía trên. Path ID (nếu có) theo mục 2.1.

**Validation và xử lý:** Kiểm tra quyền chủ tin trước khi truy vấn đơn. Trả EmployerApplicationItem, gồm metadata và API tải CV có bảo vệ; không trả file công khai. Tin không có đơn trả danh sách rỗng. Sort applied_at DESC, application_id DESC. Không có quyền xem ứng viên tin khác, kể cả biết ID.

**Thành công:** HTTP 200.

```json
{
  "data": [
    {
      "application_id": "1001",
      "job_id": "301",
      "student_id": "101",
      "status": "PENDING",
      "cv": {
        "original_name": "cv-sinh-vien.pdf",
        "mime_type": "application/pdf",
        "size_bytes": 124000,
        "download_url": "/api/applications/1001/cv"
      },
      "applied_at": "2026-10-30T06:20:00Z",
      "decided_at": null,
      "student": {
        "user_id": "101",
        "full_name": "Sinh viên minh họa"
      }
    }
  ],
  "meta": {
    "page": 1,
    "size": 20,
    "total_elements": 1,
    "total_pages": 1
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | INVALID_QUERY | Sai bộ lọc/phân trang. |
| 403 | RESOURCE_FORBIDDEN | Không phải chủ tin. |
| 404 | JOB_NOT_FOUND | Không có tin. |

### 4.16. API-16 — Xem chi tiết đơn ứng tuyển

**`GET /api/applications/{application_id}`**  
**Quyền:** SV sở hữu đơn HOẶC NTD sở hữu tin. **Truy vết:** US13, US16 ↔ FR5, FR6.

**Request:**

Không có body. Không nhận query. Path ID (nếu có) theo mục 2.1.

**Validation và xử lý:** Path application_id hợp lệ; không có query. Chỉ hai bên của đơn được đọc ApplicationDetail; ADMIN không có quyền qua US39. CV vẫn là bản đã nộp; full_name là tên hồ sơ hiện tại. Không có endpoint sửa nội dung hay xóa đơn.

**Thành công:** HTTP 200.

```json
{
  "data": {
    "application_id": "1001",
    "job_id": "301",
    "student_id": "101",
    "status": "PENDING",
    "cv": {
      "original_name": "cv-sinh-vien.pdf",
      "mime_type": "application/pdf",
      "size_bytes": 124000,
      "download_url": "/api/applications/1001/cv"
    },
    "applied_at": "2026-10-30T06:20:00Z",
    "decided_at": null,
    "student": {
      "user_id": "101",
      "full_name": "Sinh viên minh họa"
    },
    "job": {
      "job_id": "301",
      "title": "Nhân viên bán hàng part-time",
      "status": "RECRUITING",
      "employer_id": "201"
    }
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 403 | RESOURCE_FORBIDDEN | Sai bên liên quan hoặc role ADMIN. |
| 404 | APPLICATION_NOT_FOUND | Không có đơn. |

### 4.17. API-17 — Truy cập CV đã nộp

**`GET /api/applications/{application_id}/cv`**  
**Quyền:** SV sở hữu đơn HOẶC NTD sở hữu tin. **Truy vết:** US12, US13 (hỗ trợ) ↔ FR4, FR5.

**Request:**

Không có body. Không nhận query. Path ID (nếu có) theo mục 2.1.

**Validation và xử lý:** Path application_id hợp lệ; không có query; gửi Authorization Bearer. Server kiểm tra quyền cho từng lần truy cập trước khi stream file, kể cả biết URL. Thành công trả bytes PDF gốc, Content-Type: application/pdf; Content-Disposition: inline; filename="cv.pdf"; Cache-Control: private, no-store. Frontend có thể fetch kèm token rồi hiển thị blob. Không dùng URL công khai, không trả JSON data khi thành công. Lỗi vẫn trả JSON theo mục 2.2. CV bất biến khi cập nhật hồ sơ hoặc nộp file khác ở tin khác.

**Thành công:** HTTP 200.

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="cv.pdf"
Cache-Control: private, no-store

<bytes PDF goc>
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 403 | RESOURCE_FORBIDDEN | Không phải SV của đơn hoặc chủ tin; Admin cũng bị chặn. |
| 404 | APPLICATION_NOT_FOUND | Không có đơn. |
| 500 | CV_UNAVAILABLE | Đơn có metadata nhưng file không đọc được; không trả file khác thay thế. |

### 4.18. API-18 — NTD duyệt hoặc từ chối từng đơn

**`PATCH /api/applications/{application_id}/status`**  
**Quyền:** EMPLOYER + chủ tin. **Truy vết:** US14, US15, US22 ↔ FR5, FR8.

**Request:**

```json
{
  "status": "APPROVED"
}
```

**Validation và xử lý:** Body chỉ có status = APPROVED hoặc REJECTED. Chỉ xử lý đơn PENDING thuộc tin của mình, tin còn RECRUITING; không đảo quyết định. Server ghi decided_at. Cập nhật đơn rồi INSERT notification cho student_id trong cùng transaction DB; nếu một bước lỗi rollback cả hai. Không tự đổi trạng thái tin. Ví dụ từ chối dùng {"status":"REJECTED"}, response cùng cấu trúc với REJECTED. Gửi lặp quyết định sau lần thành công trả 409 và không tạo thêm thông báo.

**Thành công:** HTTP 200.

```json
{
  "data": {
    "application_id": "1001",
    "job_id": "301",
    "student_id": "101",
    "status": "APPROVED",
    "cv": {
      "original_name": "cv-sinh-vien.pdf",
      "mime_type": "application/pdf",
      "size_bytes": 124000,
      "download_url": "/api/applications/1001/cv"
    },
    "applied_at": "2026-10-30T06:20:00Z",
    "decided_at": "2026-10-30T06:30:00Z"
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | status ngoài APPROVED/REJECTED hoặc thiếu trường. |
| 403 | RESOURCE_FORBIDDEN | Đơn thuộc tin NTD khác. |
| 404 | APPLICATION_NOT_FOUND | Không có đơn. |
| 409 | APPLICATION_ALREADY_DECIDED | Đơn không còn PENDING. |
| 409 | JOB_NOT_RECRUITING | Tin không còn RECRUITING. |

### 4.19. API-19 — Chủ tin xác nhận đã nhận người / hoàn thành

**`PATCH /api/jobs/{job_id}/status`**  
**Quyền:** EMPLOYER + chủ tin. **Truy vết:** US18, US19 ↔ FR6.

**Request:**

```json
{
  "status": "FILLED"
}
```

**Validation và xử lý:** Body chỉ có status = FILLED hoặc COMPLETED. RECRUITING → FILLED chỉ khi có ≥1 đơn APPROVED và không còn đơn PENDING. Chủ tin tự xử lý hết hồ sơ chờ; không tự từ chối/duyệt hàng loạt. FILLED → COMPLETED là xác nhận công việc cả đợt đã xong; server lưu completed_at và updated_at. Ví dụ hoàn thành: {"status":"COMPLETED"}; response {"data":{"job_id":"301","status":"COMPLETED","completed_at":"2026-10-30T07:00:00Z","updated_at":"2026-10-30T07:00:00Z"}}. Không nhảy RECRUITING → COMPLETED, không mở lại/hủy/quay ngược; gửi trạng thái trùng cũng trả 409. Không sửa trạng thái các đơn, không suy ra đang làm từ FILLED; không tự hoàn thành theo lịch.

**Thành công:** HTTP 200.

```json
{
  "data": {
    "job_id": "301",
    "status": "FILLED",
    "completed_at": null,
    "updated_at": "2026-10-30T06:40:00Z"
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | status đầu vào không phải FILLED/COMPLETED. |
| 403 | RESOURCE_FORBIDDEN | Không phải chủ tin. |
| 404 | JOB_NOT_FOUND | Không có tin. |
| 409 | PENDING_APPLICATIONS_EXIST | Còn đơn PENDING khi muốn FILLED (ưu tiên lỗi này nếu đồng thời thiếu đơn duyệt). |
| 409 | NO_APPROVED_APPLICATION | Không có đơn APPROVED để đóng tuyển. |
| 409 | INVALID_JOB_TRANSITION | Chuyển sai thứ tự, chuyển ngược hoặc trạng thái không đổi. |

### 4.20. API-20 — Đánh giá hai chiều sau hoàn thành

**`POST /api/applications/{application_id}/reviews`**  
**Quyền:** SV của đơn HOẶC NTD chủ tin. **Truy vết:** US20, US21 ↔ FR7.

**Request:**

```json
{
  "rating": 5,
  "comment": "Thông tin công việc rõ ràng, phối hợp tốt."
}
```

**Validation và xử lý:** Body chỉ có rating bắt buộc integer 1…5, comment tùy chọn null/chuỗi ≤2.000. Đơn phải APPROVED và tin COMPLETED. Server lấy reviewer_id từ token; nếu là SV của đơn thì reviewee_id = chủ tin, nếu là chủ tin thì reviewee_id = SV của đơn. Không nhận reviewer_id/reviewee_id từ client. Mỗi chiều tối đa 1 đánh giá, UNIQUE(application_id, reviewer_id); tối đa hai đánh giá/đơn. Không có API chỉnh sửa/xóa đánh giá trong bản này. NTD đánh giá từng SV bằng application_id khác nhau.

**Thành công:** HTTP 201; ID review mới nằm trong response body.

```json
{
  "data": {
    "review_id": "2001",
    "application_id": "1001",
    "reviewer_id": "101",
    "reviewee_id": "201",
    "rating": 5,
    "comment": "Thông tin công việc rõ ràng, phối hợp tốt.",
    "created_at": "2026-10-30T07:10:00Z"
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Điểm/nhận xét không hợp lệ. |
| 403 | RESOURCE_FORBIDDEN | Sai cặp người dùng hoặc Admin. |
| 404 | APPLICATION_NOT_FOUND | Không có đơn. |
| 409 | REVIEW_NOT_ALLOWED | Tin chưa COMPLETED hoặc đơn chưa APPROVED. |
| 409 | REVIEW_ALREADY_EXISTS | Người này đã đánh giá đơn đó. |

### 4.21. API-21 — Hai bên xem đánh giá của đơn

**`GET /api/applications/{application_id}/reviews`**  
**Quyền:** SV của đơn HOẶC NTD chủ tin. **Truy vết:** US20, US21 (hỗ trợ hiển thị) ↔ FR7.

**Request:**

Không có body. Không nhận query. Path ID (nếu có) theo mục 2.1.

**Validation và xử lý:** Path application_id hợp lệ; không có query. Chỉ hai bên của đơn xem, không công khai hồ sơ đánh giá của người khác. Danh sách 0…2 review, không phân trang; sort created_at ASC, review_id ASC. Chưa có đánh giá trả data: []. Không có API điểm trung bình/thống kê mở rộng.

**Thành công:** HTTP 200.

```json
{
  "data": [
    {
      "review_id": "2001",
      "application_id": "1001",
      "reviewer_id": "101",
      "reviewee_id": "201",
      "rating": 5,
      "comment": "Thông tin công việc rõ ràng, phối hợp tốt.",
      "created_at": "2026-10-30T07:10:00Z"
    }
  ]
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 403 | RESOURCE_FORBIDDEN | Không thuộc hai bên của đơn. |
| 404 | APPLICATION_NOT_FOUND | Không có đơn. |

### 4.22. API-22 — SV nhận thông báo kết quả ứng tuyển

**`GET /api/notifications`**  
**Quyền:** STUDENT. **Truy vết:** US22 ↔ FR8.

**Query được hỗ trợ:**

| Tên | Kiểu | Quy tắc |
| --- | --- | --- |
| page, size | integer | Theo mục 2.2. |

**Request:**

Không có body. Query theo bảng phía trên. Path ID (nếu có) theo mục 2.1.

**Validation và xử lý:** Server lọc recipient_id theo token, không nhận ID người nhận từ client. Sort created_at DESC, notification_id DESC; không có dữ liệu trả data: []. Frontend gọi khi mở màn hình và có thể tải lại định kỳ; không yêu cầu WebSocket/realtime, không gửi thông báo thành công giả. Không có API client tự tạo thông báo, đánh dấu đã đọc hay xóa thông báo.

**Thành công:** HTTP 200.

```json
{
  "data": [
    {
      "notification_id": "3001",
      "application_id": "1001",
      "recipient_id": "101",
      "message": "Đơn ứng tuyển #1001 đã được duyệt.",
      "created_at": "2026-10-30T06:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "size": 20,
    "total_elements": 1,
    "total_pages": 1
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | INVALID_QUERY | Sai phân trang hoặc gửi recipient_id/query không hỗ trợ. |

### 4.23. API-23 — Admin xem danh sách tài khoản và lọc role

**`GET /api/admin/users`**  
**Quyền:** ADMIN. **Truy vết:** US39 ↔ FR19.

**Query được hỗ trợ:**

| Tên | Kiểu | Quy tắc |
| --- | --- | --- |
| role | STUDENT hoặc EMPLOYER | Tùy chọn; không gửi = cả hai. role=ADMIN/ALL hoặc giá trị khác là 400 INVALID_QUERY. |
| page, size | integer | Theo mục 2.2. |

**Request:**

Không có body. Query theo bảng phía trên. Path ID (nếu có) theo mục 2.1.

**Validation và xử lý:** Chỉ ADMIN được gọi. Join users với hồ sơ đúng role để lấy tên hiển thị; danh sách chỉ gồm STUDENT/EMPLOYER, không trả tài khoản ADMIN. Bộ lọc Tất cả = bỏ role khỏi query. Trả đúng AdminUserItem, không trả password, password_hash, CV, storage key, token hoặc hồ sơ riêng chi tiết. Sort created_at DESC, user_id DESC; không có kết quả trả mảng rỗng. Không cấp quyền sửa/xóa/khóa tài khoản qua API này.

**Thành công:** HTTP 200.

```json
{
  "data": [
    {
      "user_id": "101",
      "display_name": "Sinh viên minh họa",
      "email": "sv.demo@example.com",
      "role": "STUDENT",
      "created_at": "2026-10-30T06:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "size": 20,
    "total_elements": 1,
    "total_pages": 1
  }
}
```

**Lỗi riêng** (cộng với lỗi chung tại mục 2.3):

| HTTP | error.code | Điều kiện |
| --- | --- | --- |
| 400 | INVALID_QUERY | Sai role/phân trang hoặc query không hỗ trợ. |
| 401 | AUTH_REQUIRED / INVALID_TOKEN | Chưa xác thực hợp lệ. |
| 403 | ROLE_FORBIDDEN | SV/NTD cố đọc danh sách Admin. |

## 5. Trạng thái, transaction và tính nhất quán

### 5.1. Hai nhóm trạng thái

| Đối tượng | Chuyển trạng thái | Điều kiện / tác động |
| --- | --- | --- |
| Tin | Tạo → RECRUITING | Chỉ NTD đăng tin hợp lệ; completed_at null. |
| Đơn | Tạo → PENDING | SV nộp thành công file CV và đơn vào tin RECRUITING; decided_at null. |
| Đơn | PENDING → APPROVED | Chủ tin duyệt; ghi decided_at, tạo thông báo; tin vẫn RECRUITING. |
| Đơn | PENDING → REJECTED | Chủ tin từ chối; ghi decided_at, tạo thông báo; tin không tự đổi. |
| Tin | RECRUITING → FILLED | Có ít nhất một APPROVED và không còn PENDING; ngừng nhận đơn mới. |
| Tin | FILLED → COMPLETED | Chủ tin xác nhận xong cả đợt; ghi completed_at; đơn APPROVED giữ APPROVED. |

Không có PENDING → COMPLETED, không có trạng thái Đang làm riêng, không đảo quyết định đơn, không mở lại tin hoặc tự hoàn thành theo ngày. Đánh giá chỉ mở khi tin COMPLETED và đơn APPROVED. Giới hạn prototype từ SRS: chưa xử lý nghỉ giữa chừng, không đến làm hoặc hoàn thành lệch thời điểm; API ghi nhận xác nhận của chủ tin, không tự kiểm chứng hoạt động ngoài đời.

### 5.2. Các thao tác phải bảo đảm nhất quán

1. **Đăng ký:** users + đúng một hồ sơ theo role nằm trong cùng transaction; UNIQUE(email) và chuẩn hóa email ngăn đăng ký trùng đồng thời.
2. **Ứng tuyển:** lưu CV dưới khóa mới ở storage riêng tư; insert đơn rồi commit. Nếu DB rollback, xóa file vừa lưu; có cơ chế dọn file mồ côi khi xóa lỗi. Không có đơn thành công thiếu CV và không để lần thất bại chặn lần nộp lại. Giữ nguyên CV của mọi đơn đã có.
3. **Nộp đơn / quyết định / sửa hoặc đổi trạng thái tin:** khóa cùng bản ghi job_posts trong transaction hoặc cơ chế tương đương, lấy khóa tin trước rồi đến đơn. Kiểm tra lại điều kiện sau khi khóa. Nhờ đó không có đơn PENDING lọt vào sau khi đã kiểm tra đóng tuyển; không quyết định hai lần hay sửa nội dung sau khi tin đóng.
4. **Quyết định và thông báo:** update đơn trước, INSERT notification sau trong cùng transaction DB; chỉ trả thành công sau commit. Nếu lưu thông báo lỗi thì rollback kết quả đơn; không tạo thông báo khi thao tác bị từ chối. recipient_id luôn là student_id của đơn.
5. **Đánh giá:** kiểm tra cặp SV/chủ tin, trạng thái đơn/tin và UNIQUE(application_id, reviewer_id) trong transaction. Gửi đồng thời hoặc gửi lại chỉ tạo tối đa một review mỗi chiều.
6. **Dữ liệu riêng:** mọi API đọc đơn/CV đều kiểm tra bên liên quan ở backend; ẩn nút frontend không thay thế phân quyền. Admin US39 không được vượt quyền để đọc CV. Backend chỉ trả DTO đúng schema, không serialize toàn bộ Entity/JPA quan hệ.

## 6. Bảng truy vết 27 User Story MUST

| US | FR | Use Case theo SRS | AC theo SRS | API đáp ứng |
| --- | --- | --- | --- | --- |
| US01 | FR1 | UC01a Đăng ký | AC1.1, AC1.2, AC1.4 | API-01 |
| US02 | FR1 | UC01a Đăng ký | AC1.1, AC1.2, AC1.4 | API-01 |
| US03 | FR1 | UC01b Đăng nhập | AC1.3, AC1.5 | API-02 |
| US04 | FR1 | UC01b Đăng nhập | AC1.3, AC1.5 | API-02 |
| US05 | FR1 | UC01b Đăng nhập | AC1.3–AC1.5 | API-02 |
| US06 | FR2 | UC02a Đăng tin | AC2.1–AC2.3 | API-07, API-08 |
| US07 | FR9 | UC02b Sửa tin | AC9.1, AC9.2 | API-07, API-11, API-12 |
| US08 | FR3 | UC03a Xem danh sách | AC3.3 | API-09 |
| US09 | FR3 | UC03b Xem chi tiết | AC3.4, AC3.5 | API-10 |
| US10 | FR3 | UC03c Tìm kiếm | AC3.2, AC3.6 | API-09 |
| US11 | FR3 | UC03d Lọc tin | AC3.1–AC3.3, AC3.7 | API-07, API-09 |
| US12 | FR4 | UC04 Ứng tuyển kèm CV | AC4.1–AC4.7 | API-13, API-17 |
| US13 | FR5 | UC05a Xem ứng viên | AC5.4 | API-15, API-16, API-17 |
| US14 | FR5 | UC05b Duyệt hồ sơ | AC5.1, AC5.3 | API-18 |
| US15 | FR5 | UC05c Từ chối hồ sơ | AC5.2, AC5.3 | API-18 |
| US16 | FR6 | UC06a Xem kết quả | AC6.5 | API-14, API-16 |
| US17 | FR6 | UC06b Xem trạng thái tin | AC6.6 | API-09, API-10, API-14 |
| US18 | FR6 | UC06c Kết thúc tuyển | AC6.1, AC6.2 | API-12, API-19 |
| US19 | FR6 | UC06d Xác nhận hoàn thành | AC6.3, AC6.4 | API-12, API-19 |
| US20 | FR7 | UC07a Sinh viên đánh giá | AC7.1–AC7.3 | API-20, API-21 |
| US21 | FR7 | UC07b NTD đánh giá | AC7.1–AC7.3 | API-20, API-21 |
| US22 | FR8 | UC08 Nhận thông báo | AC8.1, AC8.2 | API-18, API-22 |
| US35 | FR15 | UC12a SV xem hồ sơ | AC15.1, AC15.2 | API-03 |
| US36 | FR16 | UC12b SV cập nhật hồ sơ | AC16.1–AC16.3 | API-04 |
| US37 | FR17 | UC13a NTD xem hồ sơ | AC17.1, AC17.2 | API-05 |
| US38 | FR18 | UC13b NTD cập nhật hồ sơ | AC18.1–AC18.3 | API-06 |
| US39 | FR19 | UC14 Admin xem tài khoản | AC19.1–AC19.3 | API-23 |

Các endpoint danh mục, danh sách tin của NTD, xem CV và xem đánh giá là thao tác hỗ trợ các US đã có; không tạo User Story mở rộng. Một API có thể phục vụ nhiều US. FR10–FR14 và các US WON’T không có endpoint triển khai trong bản này.

## 7. Kịch bản kiểm thử dự kiến theo contract

Đây là kế hoạch kiểm thử, chưa có kết quả chạy thực tế. Thực hiện bằng Postman và kiểm thử backend khi có ứng dụng.

| Mã | API | Tình huống | Kết quả mong đợi |
| --- | --- | --- | --- |
| TC-01 | API-01/02 | Đăng ký từng role SV/NTD, đăng nhập ba role | 201 tạo đúng user + một hồ sơ; 200 trả đúng role; không trả mật khẩu/băm. |
| TC-02 | API-01 | Email trùng, role ADMIN, dữ liệu sai; mô phỏng lỗi lưu hồ sơ | 409/403/400 đúng lỗi; lỗi lưu rollback cả user và hồ sơ. |
| TC-03 | API bảo vệ | Thiếu/sai/hết hạn token; SV gọi API NTD; NTD gọi Admin | 401 hoặc 403; không trả dữ liệu riêng và không sửa DB. |
| TC-04 | API-03–06 | Xem/sửa hồ sơ mình; tên rỗng, phone sai, sửa email/role | 200 đúng hồ sơ; 400/403 không lưu một phần; đơn và CV cũ không đổi. |
| TC-05 | API-08/11 | Tạo/sửa tin đúng; thiếu mô tả/lương/địa điểm; sửa tin khác/đã đóng | 201/200; các trường sai 400; sai chủ 403; đã đóng 409. |
| TC-06 | API-09/10 | Danh sách, từ khóa, nhiều bộ lọc, xóa bộ lọc, không có kết quả, ID không tồn tại | AND đúng; không khớp trả 200 data []; bỏ điều kiện về danh sách gốc; chi tiết không có 404. |
| TC-07 | API-09 | Lọc lương giờ/tháng và biên giao nhau; thiếu salary_unit | Chỉ so cùng đơn vị; khoảng chạm biên vẫn khớp; thiếu đơn vị 400. |
| TC-08 | API-13 | CV hợp lệ, thiếu file, rỗng, giả PDF, >5 MiB; PDF hợp lệ đúng 5 MiB | 201 hoặc 400/415/413; file đúng giới hạn được chấp nhận nếu PDF hợp lệ. |
| TC-09 | API-13 | Ứng tuyển lại cùng tin, tin không có/đóng; mô phỏng storage/DB lỗi | 409/404 đúng lỗi; không có đơn thiếu CV, không chặn lần thử lại sau thất bại. |
| TC-10 | API-13/19 | Gửi nộp đơn đồng thời với đóng tuyển | Hoặc nộp trước làm xuất hiện PENDING và chặn đóng; hoặc đóng trước chặn nộp. Không có FILLED với đơn mới PENDING. |
| TC-11 | API-15–17 | Chủ tin/SV của đơn xem đơn và CV; bên khác hoặc Admin cố truy cập | Hai bên được đọc; bên khác 403; thành công CV là bytes PDF, không phải JSON; không lộ storage key. |
| TC-12 | API-18/22 | Duyệt/từ chối PENDING, gửi lặp; mô phỏng INSERT notification lỗi | 200 đổi đơn + đúng một thông báo; tin giữ nguyên; gửi lặp 409; lỗi notification rollback đơn. |
| TC-13 | API-14 | Hai SV có các đơn khác nhau; cập nhật hồ sơ hoặc CV mới ở tin khác | Mỗi SV chỉ thấy đơn mình; job.status và đơn.status riêng; CV đơn cũ giữ nguyên. |
| TC-14 | API-19 | Đóng tuyển khi thiếu APPROVED/còn PENDING; hoàn thành sai thứ tự/sai chủ | 409/403; luồng đúng FILLED → COMPLETED lưu thời điểm, không đổi APPROVED thành COMPLETED. |
| TC-15 | API-20/21 | Hai bên đánh giá đúng điều kiện, gửi trùng, sai cặp, quá sớm, điểm 0/6 | Mỗi chiều 201 một lần; tổng ≤2; lỗi 409/403/400 phù hợp; không tạo đánh giá trái quyền. |
| TC-16 | API-22 | Thông báo của hai SV và thao tác quyết định bị từ chối | Chỉ thông báo người hiện tại; không có thông báo thành công giả; không có trường đọc/đã đọc. |
| TC-17 | API-23 | Admin lọc tất cả/SV/NTD/rỗng; SV/NTD hoặc người chưa đăng nhập gọi | 200 đúng trường và role; không có ADMIN/password_hash/CV; truy cập trái quyền 401/403. |
| TC-18 | API danh sách | page=0, size>100, enum sai, ID quá phạm vi, trang vượt cuối | 400 với đầu vào sai; trang vượt cuối 200 data [] và tổng số đúng. |
| TC-19 | API-09/10 | NFR1: ≥100 tin mô phỏng, 5 người dùng đồng thời, ≥100 request sau ổn định | Đo thực tế p95 ≤3 giây; ghi môi trường và báo cáo, không tự coi contract là đạt hiệu năng. |

NFR2 kiểm chứng qua ma trận xác thực/role/quyền sở hữu, mục tiêu 100% request không có token hợp lệ bị từ chối trên API bảo vệ và 100% thao tác sai vai trò bị chặn. NFR3 (Chrome/Edge, màn hình từ 360 px không tràn ngang) cần kiểm thử giao diện, không thể xác nhận chỉ bằng API.

## 8. Đối chiếu với ERD / Database Schema

| Bảng | API chính | Lưu ý ánh xạ |
| --- | --- | --- |
| users | API-01/02/23 | BIGINT → ID chuỗi trong JSON; email chuẩn hóa; password_hash nội bộ. |
| student_profiles | API-01/03/04 | user_id vừa PK vừa FK; đăng ký tự khởi tạo. |
| employer_profiles | API-01/05/06/08 | user_id vừa PK vừa FK; chủ tin phải là EMPLOYER. |
| job_categories | API-07/08/09/11 | Seed sẵn; một tin một ngành; không CRUD danh mục. |
| job_posts | API-08–12/19 | Hai trạng thái FILLED/COMPLETED đi sau RECRUITING; hoàn thành cả đợt. |
| applications | API-13–18 | Một CV/đơn; UNIQUE(student_id, job_id); status và decided_at đồng bộ. |
| reviews | API-20/21 | UNIQUE(application_id, reviewer_id); đúng cặp người dùng; tối đa hai review/đơn. |
| notifications | API-18/22 | Tạo trong transaction quyết định đơn; chỉ người nhận đọc; không bổ sung is_read. |

Không cần đổi cấu trúc thư mục dự án để sử dụng contract này. Quy ước ID dạng chuỗi, currency hằng, tên hiển thị và download_url là biểu diễn API/DTO, không yêu cầu thêm cột tương ứng vào DB. Những ngưỡng kỹ thuật v1 cần được cập nhật đồng bộ nếu nhóm thay đổi khi triển khai; không đổi ngầm tên trường hoặc enum mà frontend đang dùng.
