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

module.exports = { findUserByEmail };
