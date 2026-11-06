const { Pool } = require('pg');

const dbUrl = new URL(process.env.DB_URL);
if (process.env.DB_USERNAME) dbUrl.username = process.env.DB_USERNAME;
if (process.env.DB_PASSWORD) dbUrl.password = process.env.DB_PASSWORD;

const pool = new Pool({
  connectionString: dbUrl.href,
  connectionTimeoutMillis: 5000,
});

module.exports = pool;
