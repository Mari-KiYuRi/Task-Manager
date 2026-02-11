import jwt from "jsonwebtoken";

const SECRET = "supersecretkey"; // тот же, что в auth.js

export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // формат: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: "Нет токена доступа" });
  }

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Недействительный токен" });

    req.user = user; // добавляем пользователя в запрос
    next();
  });
}
