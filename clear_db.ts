import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'kebdtop1_management_user';
  const dbPassword = process.env.DB_PASSWORD || 'kaWSar03%management2003%';
  const dbName = process.env.DB_NAME || 'kebdtop1_management';

  const pool = mysql.createPool({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName,
  });

  const tables = ['employees', 'attendances', 'leave_requests', 'receipts', 'receipt_items', 'transactions', 'tasks', 'guests', 'notifications'];
  
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of tables) {
    try {
      await pool.query(`TRUNCATE TABLE ${table}`);
      console.log(`Truncated ${table}`);
    } catch (e) {
      console.log(`Error truncating ${table}:`, e);
    }
  }
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('Database cleared!');
  process.exit(0);
}
run();
