import sqlite3 from "sqlite3";
import { open } from "sqlite";

let db;

export async function initDB() {
  db = await open({
    filename: "./database.sqlite",
    driver: sqlite3.Database,
  });

  console.log("✅ Подключено к SQLite");

  // --- Создание таблицы пользователей ---
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      theme TEXT DEFAULT 'brown'
    );
  `);

  // --- Создание таблицы задач ---
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      repeat_type TEXT,
      repeat_days TEXT,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

   await db.exec(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      completed INTEGER DEFAULT 0,
      subtask_title TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );
  `);

  console.log("✅ База данных SQLite инициализирована");
  return db;
}

export function getDB() {
  if (!db) throw new Error("База данных не инициализирована!");
  return db;
}
