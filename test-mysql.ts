import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'kebdtop1_management_user';
const dbPassword = process.env.DB_PASSWORD || 'kaWSar03%management2003%';
const dbName = process.env.DB_NAME || 'kebdtop1_management';

async function run() {
  try {
    const pool = mysql.createPool({ host: dbHost, user: dbUser, password: dbPassword, database: dbName });
    const [rows] = await pool.query('SELECT id, name, joiningDate FROM employees');
    console.log(rows);
    process.exit(0);
  } catch (e) { console.error(e); process.exit(1); }
}
run();
