import mysql from 'mysql2/promise';

let pool;

export async function initDB() {
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'marti',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  console.log("Подключено к MySQL");

  await createTables();
  return pool;
}

async function createTables() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      theme VARCHAR(50) DEFAULT 'brown'
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      title TEXT NOT NULL,
      date VARCHAR(255) NOT NULL,
      completed TINYINT DEFAULT 0,
      repeat_type VARCHAR(50),
      repeat_days TEXT,
      priority VARCHAR(50) DEFAULT 'medium',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_id INT,
      completed TINYINT DEFAULT 0,
      subtask_title TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);

  console.log("Таблицы MySQL созданы");
}

export function getDB() {
  if (!pool) throw new Error("MySQL пул не инициализирован!");
  return pool;
}