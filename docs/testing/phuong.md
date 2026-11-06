## P01 — Kiểm thử thủ công API-07

- PASS — GET /api/job-categories trả ba ngành Bán hàng, Gia sư, Phục vụ. category_id là chuỗi.
- PASS — GET /api/job-categories?page=1 trả lỗi INVALID_QUERY.
- Môi trường — PostgreSQL local, server thử ở cổng 8081.
- Chờ tích hợp — Nối vào backend chính ở cổng 8080 sau khi nhận kết nối DB dùng chung.