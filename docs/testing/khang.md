# Khang — K01 / US13

## Phạm vi và kế hoạch — 06/11/2026

- Nhánh: `feat/khang-k01-applicants`. Trạng thái đầu phiên: sạch.
- Nguồn chính: API Contract v2.0 DOCX tại thư mục `file gui`, mục 2, 3.3, 4.15–4.16; Schema v2.1 và SQL hiện tại. Bản phân công cung cấp là v1.1 (chưa có v1.2); bỏ hướng dẫn Spring cũ theo AGENTS.md.
- Contract v2.0 xác nhận Demo 1 chỉ nhận page/size ở API-15; API-16 không nhận query. Không sửa bản contract Markdown cũ.
- Triển khai độc lập theo xác nhận của người dùng: dependency injection (truyền phụ thuộc từ bên ngoài), không đăng ký vào app/route gốc.

### Checklist

- [x] Kiểm tra nhánh, file hiện có và hợp đồng K01.
- [x] Viết test HTTP/quyền/DTO/phân trang trước, chạy RED.
- [x] Viết repository nhận pool, service, controller và router K01.
- [x] Viết hàm API và WF13/WF13b, điểm nối auth/job/CV không giả dữ liệu.
- [x] Chạy test độc lập, hồi quy backend, build frontend và kiểm tra bảo mật/diff.
- [x] Ghi kết quả thực tế và hướng dẫn tích hợp cho Tài/Phương.

Không sửa app.js/App.jsx, middleware auth, HTTP client, package/lock, môi trường, migration hoặc seed. Không chạy migration/seed/reset DB; không commit/push/merge.

## File bàn giao (chỉ thêm mới)

| File | Trách nhiệm |
|---|---|
| `backend/src/repositories/applicationRepository.js` | Nhận pg pool/client bên ngoài; đọc chủ tin, đếm + lấy trang cùng snapshot SQL, JOIN chi tiết |
| `backend/src/services/applicationService.js` | Phân quyền, validate BIGINT/query, DTO allowlist, data/meta |
| `backend/src/controllers/applicationController.js` | Nhận tài khoản từ resolver, giữ query trùng để từ chối, trả JSON |
| `backend/src/routes/applicationRoutes.js` | Factory router chỉ API-15/16, bắt buộc middleware và resolver xác thực |
| `backend/tests/applicants.test.js` | K-01 HTTP/service/repository và kết hợp middleware JWT hiện có |
| `frontend/src/api/applicationApi.js` | Hai hàm đọc qua HTTP client hiện có, factory cho kiểm thử |
| `frontend/src/pages/EmployerApplicantsPage.jsx` | WF13, danh sách/phân trang, loading/empty/error, thông tin tin được truyền qua API adapter |
| `frontend/src/pages/ApplicationDetailPage.jsx` | WF13b, đúng đơn/CV metadata, quay lại giữ trang, điểm nối CV |
| `frontend/src/features/applicants/ApplicantRoutes.jsx` | Hai route K01 độc lập, chưa gắn App.jsx |
| `frontend/src/features/applicants/useApplicantResource.js` | Hủy/bỏ request cũ, không hiển thị dữ liệu phiên trước, retry |
| `frontend/src/features/applicants/applicantPresentation.js` | Nhãn trạng thái, ngày/dung lượng, đường dẫn quay lại |
| `frontend/src/features/applicants/applicants.css` | CSS chỉ phạm vi `.applicants`, bảng cuộn, màn hẹp/focus |
| `frontend/tests/applicants.test.js` | Kiểm tra API adapter, render các trạng thái, build riêng module K01 |
| `frontend/tests/applicants-browser.test.js` | Chrome headless với profile test riêng, không dùng phiên Chrome cá nhân |
| `frontend/tests/fixtures/applicants-browser.jsx` | Mock fetch chỉ trong test; kiểm tra tương tác/race/logout |
| `docs/testing/khang.md` | Kế hoạch, bằng chứng và giao diện tích hợp đề xuất |

## API và hành vi đã viết

- API-15: `GET /api/jobs/:job_id/applications`. EMPLOYER sở hữu tin; kiểm tra chủ tin trước truy vấn đơn. page=1, size=20, size tối đa 100; chỉ nhận page/size, từ chối query lạ/lặp. Sắp xếp applied_at DESC, application_id DESC. Tin rỗng hoặc quá trang cuối trả 200 data rỗng và tổng thực tế. COUNT và trang trong một câu SQL để không lệch snapshot khi nộp đồng thời.
- API-16: `GET /api/applications/:application_id`. Chỉ SV sở hữu đơn hoặc NTD chủ tin; ADMIN trả 403 RESOURCE_FORBIDDEN. Không nhận query.
- BIGINT chuỗi chuẩn 1…9223372036854775807. DTO chỉ trường đã chốt, không email/phone/introduction/storage key/password. CV chỉ metadata/URL tương đối bảo vệ; không triển khai API-17.
- Dùng `ApiError`/errorHandler hiện có, không tạo xử lý lỗi thứ hai. Lỗi SQL không trả nội dung cho client. Các phản hồi của controller đặt `Cache-Control: private, no-store`.
- WF13/13b dùng dữ liệu API, không mock trong code sản phẩm. Đổi ID/page/token bỏ kết quả cũ; đăng xuất không còn hiển thị dữ liệu riêng. Lỗi API tin không che danh sách đã tải. Không có nút duyệt/từ chối, tìm/lọc hay đánh giá.
- Figma: mới dựng cấu trúc WF13/WF13b theo mô tả tài liệu và DTO. **Chưa đối chiếu trực quan với frame Figma gốc**, không tuyên bố khớp pixel.

## Giao diện tích hợp đề xuất — chưa phải interface đã thống nhất liên nhánh

### Tài — backend

Sau khi các nhánh được kiểm tra, Tài đăng ký router trước handler 404 trong composition root. Không sửa file gốc trong K01 này:

```js
const repository = createApplicationRepository(pool); // pool chung của Tài
const service = createApplicationService(repository);
const router = createApplicationRouter({
  service,
  authenticate: requireAuth, // middleware JWT hiện có
  getAuthenticatedUser: resolveAuthenticatedUserFromT03,
});
// app.use(router); // Router đã chứa /api, KHÔNG mount thêm /api.
```

Các factory được export từ bốn file backend ở trên; snippet không tự tạo pool/resolver. `resolveAuthenticatedUserFromT03(req)` có thể async và phải trả `{ user_id: string, role }` từ tài khoản DB đã xác thực (hoặc null nếu không hợp lệ). T03 dùng `req.auth.sub` do middleware hiện có xác minh để tra tài khoản; **không lấy user_id/role từ query/body và không chỉ sao chép role từ client/claims mà bỏ kiểm tra tài khoản**. Module K01 không tự tra users hay tạo JWT. Factory báo lỗi ngay khi thiếu dependency. Pool/client giữ parser BIGINT mặc định của pg (chuỗi), không parse int8 thành Number.

### Tài/Phương — frontend

Không tạo BrowserRouter thứ hai. Tài có thể import hai page và thêm đúng hai Route vào `Routes` hiện có:

```jsx
<Route path="/employer/jobs/:job_id/applications"
  element={<EmployerApplicantsPage token={accessToken} getJob={getJobAdapter} />} />
<Route path="/employer/applications/:application_id"
  element={<ApplicationDetailPage token={accessToken} renderCv={renderCvAdapter} />} />
```

- `accessToken`: state đăng nhập T03, không đọc/ghi storage riêng trong K01.
- `getJobAdapter(jobId, { token, signal })`: bọc hàm API-10 có thật của Phương, trả `{ data: JobDetail }`; chưa có thì bỏ prop, chỉ hiển thị mã tin. Không triển khai API-10/12 ở đây. Khi có adapter, chỉ gọi sau API-15 xác nhận quyền chủ tin.
- `renderCvAdapter(detail)`: trả UI tích hợp component T05 theo interface Tài bàn giao, truyền `detail.application_id` thực tế. Hiện chưa có adapter/viewer nên hiển thị thông báo chờ T05, không nút giả và không fetch CV. Chưa chốt chữ ký props CvViewer của Tài.
- `ApplicantRoutes` là lựa chọn route subtree thay cho hai Route trực tiếp, dùng trong router hiện có ở root; không đặt nó trực tiếp làm con của `Routes` (React Router chỉ nhận Route/Fragment). Ưu tiên hai Route trực tiếp ở trên để tránh sai prefix khi lồng route.
- Phương nối nút Xem ứng viên tới `/employer/jobs/<job_id>/applications`. Link chi tiết dùng application_id từ API; quay lại dùng job_id của đơn từ API-16 và page trên URL.
- `applicationApi.js` mới chỉ có phần đọc của Khang. Khi ghép với T04/T05, giữ nguyên hàm nộp/tải CV của Tài, thống nhất export trước merge, không thay chữ ký của nhau.

## Bằng chứng kiểm tra

Môi trường thực tế: Node.js **v24.21.0**, npm **11.19.0**, khác bản chuẩn v24.12.0/npm11.6.2. Chưa đổi cấu hình hay phiên bản dự án. Cài dependency theo lock hiện có bằng `npm.cmd ci --ignore-scripts` trong từng ứng dụng; không sửa package/lock. Không cài thư viện mới.

| Kiểm tra | Kết quả |
|---|---|
| RED backend đầu tiên | Thiếu express do chưa cài dependency; sau npm ci, test thất bại vì module K01 chưa tồn tại |
| RED frontend | Thất bại vì trang K01 chưa tồn tại |
| RED sau review | 3 test BE và 1 FE thất bại đúng các điểm count/snapshot, dependency, trang rỗng, cảnh báo API tin; đã sửa và chạy lại |
| Backend K01 | 20 PASS, 0 FAIL |
| Backend `npm.cmd test` | 36 PASS, 0 FAIL, 2 SKIP (PostgreSQL migration/seed cần RUN_DB_TESTS=1; không bật vì không được phép chạy migration/seed) |
| Coverage backend K01 | 100% dòng ở 4 file K01; service/controller/router 100% branch. Đây là đo bằng dependency/fixture, KHÔNG chứng minh SQL đã chạy PostgreSQL |
| Frontend `node --test tests/applicants.test.js tests/applicants-browser.test.js` | 5 PASS, 0 FAIL, gồm 1 test Chrome thực |
| Frontend `npm.cmd run build` | PASS; entry hiện tại chưa import K01 nên có thêm test build riêng entry ApplicantRoutes (write:false), cũng PASS |
| Cú pháp JS | PASS 10 file JS mới; JSX được Vite transform/build/test riêng |
| `npm.cmd audit --omit=dev` backend / `npm.cmd audit` frontend | 0 lỗ hổng được báo ở cả hai lượt; không chạy audit fix |
| Lint/type-check | CHƯA CHẠY: repo không có script/cấu hình lint/type-check; JavaScript/JSX, không tự thêm dependency/config |
| DB thật / end-to-end thật / CV thật / Figma gốc | CHƯA CHẠY; chờ T03, pool runtime, P02/P03, T04/T05 và review giao diện |

Chrome smoke dùng mock fetch tại fixture test và router thật, kiểm tra phân trang, URL, chi tiết CV theo ID, quay lại giữ page, 403/retry, request cũ về muộn không ghi đè, lỗi API tin vẫn giữ danh sách, logout trong lúc tải không lộ dữ liệu cũ, focus heading, không tràn trang ở viewport hẹp. Test không gọi CV endpoint. Profile tạm riêng nằm ngoài repo trong `%LOCALAPPDATA%/Temp/opencode/k01-chrome-*`; không truy cập hồ sơ cá nhân, không xóa thư mục rộng. Có thể đặt CHROME_PATH nếu executable khác; máy không có Chrome sẽ báo SKIP rõ ràng.

Backend HTTP test dùng Express thật; dependency dữ liệu là fixture. Có thêm test dùng middleware JWT thật kiểm tra token sai/hết hạn/chữ ký sai và callback T03 giả lập ở test. Log `[trace_id] Error` ở ca 500 là output mong đợi từ errorHandler dùng chung.

## Lệnh chạy lại (PowerShell, từ gốc repo)

```powershell
npm.cmd --prefix backend test
Push-Location backend
node --test --experimental-test-coverage tests/applicants.test.js
Pop-Location
Push-Location frontend
node --test tests/applicants.test.js tests/applicants-browser.test.js
npm.cmd run build
Pop-Location
git status --short
git diff --stat
```

## Trạng thái Git và điều kiện bàn giao

- Chỉ thêm 16 file K01 được liệt kê ở trên, không sửa file tracked có sẵn. `git status --short` hiện báo `??` cho file/thư mục mới. `git diff --stat` trống vì chưa stage file untracked; **không có nghĩa là chưa viết code**. Không tự stage/commit/push/merge.
- Review độc lập đã phát hiện count/trang khác snapshot, lỗi API tin che danh sách và thiếu kiểm thử runtime. Đã bổ sung test/sửa như trên. Lượt review lại: APPROVE, không còn lỗi correctness/security được xác nhận; reviewer không chạy lại toàn bộ test sau sửa, các kết quả sau sửa do phiên chính thực thi.
- Đủ để bàn giao module độc lập để review, **chưa đủ nghiệm thu K01 tích hợp**. Sau khi được phép ghép: Tài nối pool/resolver/route/token, Phương nối API tin + liên kết WF10, Tài nối CV T05; thống nhất file applicationApi dùng chung; chạy SQL/read bằng DB test riêng, dữ liệu đơn/CV thật, kiểm tra quyền A/B/SV/Admin và luồng WF10 → WF13 → WF13b → CV → quay lại; đối chiếu Figma và phiên bản toolchain chuẩn trước merge.

Skills thực sự dùng trong phiên: brainstorming (kiểm tra phạm vi phiên trước; người dùng đã yêu cầu bắt đầu ngay), api-engineer, test-driven-development, react-patterns, security-review, browser-testing-with-devtools, verification-loop, agent-self-evaluation. Có reviewer độc lập theo hướng dẫn AGENTS.md; không giao agent sửa file hay mở rộng phạm vi.

### Tự đánh giá đầu ra (không thay thế nghiệm thu)

| Tiêu chí | Điểm / 5 | Bằng chứng và cải thiện |
|---|---|---|
| Chính xác | 4 | BE20/FE5 đạt và review lại approve; SQL chưa thực thi PostgreSQL thật nên cần lượt tích hợp read-only/test riêng |
| Đầy đủ | 4 | Đủ module BE/FE/API/test độc lập theo phạm vi mới; chưa đối chiếu trực quan WF13/13b gốc |
| Rõ ràng | 4 | Liệt kê đủ file/interface/lệnh và phân biệt mock/live; hướng dẫn tích hợp dài, có thể rút gọn khi nhóm chốt adapter |
| Khả năng sử dụng | 4 | Có lệnh chạy lại không sửa cấu hình; interface T03/P02/T05 vẫn cần chủ sở hữu xác nhận khi ghép |
| Ngắn gọn | 4 | Code không tạo hệ thống auth/DB/CV mới; báo cáo giữ nhiều chi tiết để bàn giao ba người |

Trung bình: 4.0/5. Ưu tiên tiếp theo: kiểm chứng SQL trên DB test được phép; đối chiếu Figma; chốt adapter liên nhánh. Người dùng có thể kiểm tra lại đánh giá bằng lệnh và giới hạn được ghi trong báo cáo này.
