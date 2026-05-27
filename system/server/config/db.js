const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

if (!DB_HOST || !DB_USER || !DB_NAME) {
  console.error(
    'Missing database env vars. Set DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME.'
  );
}

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
    console.error(
      `Attempted: host=${DB_HOST || '(unset)'} database=${DB_NAME || '(unset)'} user=${DB_USER || '(unset)'}`
    );
    return;
  }
  console.log('Connected to database as id ' + connection.threadId);
  connection.release();
});

module.exports = pool;