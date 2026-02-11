import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getDB } from "../db.js";

import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();
const SECRET = "supersecretkey";

// Регистрация
router.post("/register", async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Введите имя пользователя и пароль" });
  }

  const db = getDB();

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.run(
      "INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
      [username, hashedPassword, email || null]
    );
    res.json({ message: "Пользователь успешно зарегистрирован" });
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      res.status(400).json({ error: "Имя пользователя уже занято" });
    } else {
      console.error("Ошибка регистрации:", err);
      res.status(500).json({ error: "Ошибка при регистрации" });
    }
  }
});

// Авторизация
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const db = getDB();

  const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);
  if (!user) return res.status(400).json({ error: "Пользователь не найден" });

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return res.status(401).json({ error: "Неверный пароль" });

  const token = jwt.sign({ id: user.id, username: user.username }, SECRET, {
    expiresIn: "2h",
  });

  res.json({ message: "Авторизация успешна", token });
});

// Получить задачи пользователя
router.get("/", authenticateToken, async (req, res) => {
  const db = getDB();
  const userId = req.user.id;

  const tasks = await db.all("SELECT * FROM tasks WHERE user_id = ?", [userId]);
  res.json(tasks);
});

// Добавить задачу
router.post("/", authenticateToken, async (req, res) => {
  const db = getDB();
  const userId = req.user.id;
  const { title, description, date, repeat_type } = req.body;

  await db.run(
    "INSERT INTO tasks (user_id, title, description, date, repeat_type) VALUES (?, ?, ?, ?, ?)",
    [userId, title, description, date, repeat_type]
  );

  res.json({ message: "Задача добавлена" });
});


export default router;
