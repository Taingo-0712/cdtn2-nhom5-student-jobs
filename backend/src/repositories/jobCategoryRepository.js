async function listJobCategories(db) {
  // Nhận kết nối PostgreSQL dùng chung do backend truyền vào.
  const { rows } = await db.query(`
    SELECT c.category_id::text AS category_id, c.name
    FROM public.job_categories AS c
    ORDER BY c.name ASC, c.category_id ASC
  `);
  // Lấy ID dạng chuỗi và tên ngành, sắp xếp theo tên rồi theo ID.

  return rows;
  // Trả mảng ngành nghề. Bảng trống sẽ trả mảng rỗng.
}

module.exports = { listJobCategories };
// Cho phép route gọi hàm đọc danh mục.