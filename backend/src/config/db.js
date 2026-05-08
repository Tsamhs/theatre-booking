const mariadb = require('mariadb');

const pool = mariadb.createPool({
  host:            process.env.DB_HOST     || 'localhost',
  port:            parseInt(process.env.DB_PORT || '3306', 10),
  user:            process.env.DB_USER,
  password:        process.env.DB_PASSWORD,
  database:        process.env.DB_NAME,
  connectionLimit: 10,
  acquireTimeout:  10_000,
  connectTimeout:  10_000,
  idleTimeout:     60_000,
  // Return JS numbers instead of BigInt for INT columns
  bigIntAsNumber:  true,
});

async function testConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('MariaDB connected successfully');
  } catch (err) {
    console.error('MariaDB connection failed:', err.message);
    process.exit(1);
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { pool, testConnection };
