import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { initDB, getDB } from "./mysql-db.js";
import dayjs from "dayjs";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

let db;
initDB().then(database => (db = database));

// регистрация
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  
  try {
    await db.execute("INSERT INTO users (username, password, theme) VALUES (?, ?, ?)", [username, hashed, 'brown']);
    res.json({message: "Пользователь зарегистрирован"});
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({error: "Имя уже существует"});
    } else {
      res.status(500).json({error: "Ошибка сервера"});
    }
  }
});

// вход
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await db.execute("SELECT * FROM users WHERE username = ?", [username]);
  const user = rows[0];
  if (!user) return res.status(404).json({error: "Пользователь не найден"});

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({error: "Неверный пароль"});

  const token = jwt.sign({id: user.id}, JWT_SECRET, {expiresIn: "7d"});
  res.json({ 
    token, 
    username: user.username, 
    id: user.id,
    theme: user.theme || 'brown'
  });
});

// получение цветовой темы
app.get("/api/user/theme", async (req, res) => {
  const { user_id } = req.query;
  
  try {
    const [rows] = await db.execute("SELECT theme FROM users WHERE id = ?", [user_id]);
    const user = rows[0];
    
    if (!user) return res.status(404).json({error: "Пользователь не найден"});
    
    res.json({theme: user.theme || 'brown'});
  } catch (error) {
    console.error("Ошибка при получении темы:", error);
    res.status(500).json({error: "Ошибка при получении темы"});
  }
});

// обновление цветовой темы
app.put("/api/user/theme", async (req, res) => {
  const { user_id, theme } = req.body;
  
  try {
    await db.execute("UPDATE users SET theme = ? WHERE id = ?", [theme, user_id]);
    res.json({message: "Тема обновлена"});
  } catch (error) {
    console.error("Ошибка при обновлении темы:", error);
    res.status(500).json({error: "Ошибка при обновлении темы"});
  }
});

// получение всех задач
app.post("/api/tasks", async (req, res) => {
  const { user_id } = req.body;
  const [rows] = await db.execute("SELECT * FROM tasks WHERE user_id = ? ORDER BY date ASC", [user_id]);
  res.json(rows);
});

// получение задач за период
app.post("/api/tasks/range", async (req, res) => {
  const { user_id, start_date, end_date } = req.body;
  
  try {
    const [rows] = await db.execute(
      "SELECT * FROM tasks WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC", 
      [user_id, start_date, end_date]
    );
    res.json(rows);
  } catch (error) {
    console.error("Ошибка при получении задач за период:", error);
    res.status(500).json({ error: "Ошибка при получении задач за период" });
  }
});

// функция для создания повторяющихся задач
async function createRepeatingTasks(user_id, title, startDate, repeatType, priority = 'medium') {
  const tasks = [];
  
  if (repeatType === "once") {
    tasks.push({
      user_id,
      title,
      date: startDate,
      repeat_type: "once",
      completed: 0,
      priority: priority
    });
  } 
  else if (repeatType === "daily") {
    for (let i = 0; i < 30; i++) {
      const taskDate = dayjs(startDate).add(i, 'day').format('YYYY-MM-DD');
      tasks.push({
        user_id,
        title,
        date: taskDate,
        repeat_type: "daily",
        completed: 0,
        priority: priority
      });
    }
  }
  else if (repeatType === "weekly") {
    for (let i = 0; i < 12; i++) {
      const taskDate = dayjs(startDate).add(i * 7, 'day').format('YYYY-MM-DD');
      tasks.push({
        user_id,
        title,
        date: taskDate,
        repeat_type: "weekly",
        completed: 0,
        priority: priority
      });
    }
  }

  return tasks;
};

// добавление подзадачи
app.post("/api/add_subtask", async (req, res) => {
  const { task_id, subtask_title } = req.body;
  try{
    await db.execute(
        "INSERT INTO subtasks (task_id, subtask_title) VALUES (?, ?)",
        [task_id, subtask_title]
      );
    res.json({message: "Done"});
  }
  catch (error) {
    console.log(error)
    res.json({error: error})
  }
});

// получение подзадачи
app.post("/api/get_subtasks", async (req, res) => {
  const { task_id } = req.body;
  try{
    const [rows] = await db.execute(
        "SELECT * FROM subtasks WHERE task_id = ?",
        [task_id]
      );
    res.json({response: rows});
  }
  catch(error){
    res.json({error: error})
  }
});

// добавление задачи
app.post("/api/add_task", async (req, res) => {
  const { user_id, title, date, repeat_type, repeat_days, priority } = req.body;
  
  try {
    const tasksToCreate = await createRepeatingTasks(user_id, title, date, repeat_type, priority);
    for (const task of tasksToCreate) {
      await db.execute(
        "INSERT INTO tasks (user_id, title, date, repeat_type, repeat_days, priority, completed) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [task.user_id, task.title, task.date, task.repeat_type, repeat_days || null, task.priority, task.completed]
      );
    }

    res.json({ 
      success: true,
      message: `Задача добавлена${repeat_type !== "once" ? ` (${tasksToCreate.length} повторений)` : ''}`
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: "Ошибка при добавлении задачи",
      details: error.message 
    });
  }
});

// получение задачи по дате
app.post("/api/tasks/date/:date", async (req, res) => {
  const { date } = req.params;
  const { user_id } = req.body;
  
  const [rows] = await db.execute("SELECT * FROM tasks WHERE date = ? AND user_id = ?", [date, user_id]);
  res.json(rows);
});

// получение задачи по id
app.get("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.execute("SELECT * FROM tasks WHERE id = ?", [id]);
    const task = rows[0];
    if (!task) return res.status(404).json({ error: "Задача не найдена" });
    res.json(task);
  } catch (error) {
    console.error("Ошибка при получении задачи:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// обновление задачи
app.put("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  
  try {
    await db.execute("UPDATE tasks SET title = ? WHERE id = ?", [title, id]);
    res.json({ message: "Задача обновлена" });
  } catch (error) {
    console.error("Ошибка при обновлении задачи:", error);
    res.status(500).json({ error: "Ошибка при обновлении задачи" });
  }
})

// обновление подзадачи
app.put("/api/subtasks/:id", async (req, res) => {
  const { id } = req.params;
  const { subtask_title } = req.body;
  
  try {
    await db.execute("UPDATE subtasks SET subtask_title = ? WHERE id = ?", [subtask_title, id]);
    res.json({ message: "Подзадача обновлена" });
  } catch (error) {
    console.error("Ошибка при обновлении подзадачи:", error);
    res.status(500).json({ error: "Ошибка при обновлении подзадачи" });
  }
});

// обновление приоритета задачи
app.put("/api/tasks/:id/priority", async (req, res) => {
  const { id } = req.params;
  const { priority } = req.body;
  
  try {
    await db.execute("UPDATE tasks SET priority = ? WHERE id = ?", [priority, id]);
    res.json({ message: "Приоритет обновлен" });
  } catch (error) {
    console.error("Ошибка при обновлении приоритета:", error);
    res.status(500).json({ error: "Ошибка при обновлении приоритета" });
  }
});

// отметка задачи выполненной / невыполненной
app.put("/api/tasks/:id/toggle", async (req, res) => {
  const { id } = req.params;
  const [rows] = await db.execute("SELECT * FROM tasks WHERE id = ?", [id]);
  const task = rows[0];
  if (!task) return res.status(404).json({ error: "Задача не найдена" });

  const newStatus = task.completed ? 0 : 1;
  await db.execute("UPDATE tasks SET completed = ? WHERE id = ?", [newStatus, id]);
  
  if (task.repeat_type && task.repeat_type !== "once") {
    await db.execute(
      "UPDATE tasks SET completed = ? WHERE user_id = ? AND title = ? AND date > ? AND repeat_type = ?",
      [newStatus, task.user_id, task.title, task.date, task.repeat_type]
    );
  }
  
  res.json({ message: `Задача ${newStatus ? "выполнена" : "отмечена как невыполненная"}` });
});

// отметка подзадачи выполненной / невыполненной
app.put("/api/subtasks/:id/toggle", async (req, res) => {
  const { id } = req.params;
  const [rows] = await db.execute("SELECT * FROM subtasks WHERE id = ?", [id]);
  const subtask = rows[0];
  if (!subtask) return res.status(404).json({ error: "Подзадача не найдена" });

  const newStatus = subtask.completed ? 0 : 1;
  await db.execute("UPDATE subtasks SET completed = ? WHERE id = ?", [newStatus, id]);
  
  res.json({ message: `Подзадача ${newStatus ? "выполнена" : "отмечена как невыполненная"}`, completed: newStatus });
});

// удаление задачи
app.delete("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;

  const [rows] = await db.execute("SELECT * FROM tasks WHERE id = ?", [id]);
  const task = rows[0];
  if (!task) return res.status(404).json({ error: "Задача не найдена" });

  await db.execute("DELETE FROM subtasks WHERE task_id = ?", [id]);
  await db.execute("DELETE FROM tasks WHERE id = ?", [id]);
  res.json({ message: "Задача удалена" });
});

// удалить серии повторяющихся задач
app.delete("/api/tasks/:id/series", async (req, res) => {
  const { id } = req.params;
  const { delete_all } = req.body;
  try {
    const [rows] = await db.execute("SELECT * FROM tasks WHERE id = ?", [id]);
    const task = rows[0];
    if (!task) return res.status(404).json({ error: "Задача не найдена" });

    if (task.repeat_type === "once") {
      await db.execute("DELETE FROM subtasks WHERE task_id = ?", [id]);
      await db.execute("DELETE FROM tasks WHERE id = ?", [id]);
      return res.json({ message: "Задача удалена" });
    }

    if (delete_all) {
      const [tasksToDelete] = await db.execute(
        "SELECT id FROM tasks WHERE user_id = ? AND title = ? AND repeat_type = ?",
        [task.user_id, task.title, task.repeat_type]
      );
      
      for (const taskToDelete of tasksToDelete) {
        await db.execute("DELETE FROM subtasks WHERE task_id = ?", [taskToDelete.id]);
      }

      await db.execute(
        "DELETE FROM tasks WHERE user_id = ? AND title = ? AND repeat_type = ?",
        [task.user_id, task.title, task.repeat_type]
      );
      res.json({ message: "Все повторения задачи удалены" });
    } else {
      const [tasksToDelete] = await db.execute(
        "SELECT id FROM tasks WHERE user_id = ? AND title = ? AND repeat_type = ? AND date >= ?",
        [task.user_id, task.title, task.repeat_type, task.date]
      );
      
      for (const taskToDelete of tasksToDelete) {
        await db.execute("DELETE FROM subtasks WHERE task_id = ?", [taskToDelete.id]);
      }

      await db.execute(
        "DELETE FROM tasks WHERE user_id = ? AND title = ? AND repeat_type = ? AND date >= ?",
        [task.user_id, task.title, task.repeat_type, task.date]
      );
      res.json({ message: "Будущие повторения задачи удалены" });
    }
  } catch (error) {
    console.error("Ошибка при удалении серии задач:", error);
    res.status(500).json({ error: "Ошибка при удалении серии задач" });
  }
});

// удаление подзадачи
app.delete("/api/subtasks/:id", async (req, res) => {
  const { id } = req.params;
  
  try{
    const [rows] = await db.execute("SELECT * FROM subtasks WHERE id = ?", [id]);
    const subtask = rows[0];

    if (!subtask) return res.status(404).json({ error: "Подзадача не найдена" });
    await db.execute("DELETE FROM subtasks WHERE id = ?", [id]);
    res.json({ message: "Подзадача удалена" });
  } catch (error) {
    res.status(500).json({error: "Ошибка при удалении подзадачи"});
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Сервер запущен на порту ${PORT}`));