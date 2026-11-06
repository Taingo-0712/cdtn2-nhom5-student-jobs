const pool = require('../config/db');

async function findUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT user_id, email, password_hash, role, created_at
     FROM users
     WHERE email = $1`,
    [email]
  );

  return rows[0] ?? null;
}

async function findUserRoleById(userId) {
  const { rows } = await pool.query(
    'SELECT role FROM users WHERE user_id = $1',
    [userId]
  );

  return rows[0]?.role ?? null;
}

module.exports = { findUserByEmail, findUserRoleById };
