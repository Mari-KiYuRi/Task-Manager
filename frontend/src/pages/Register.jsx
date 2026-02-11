import React, {useState} from "react";
import { useNavigate, Link } from "react-router-dom";

import { API } from "../api";

export default function Register(){
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  async function submit(e){
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      alert("Заполните все поля");
      return;
    }

    if (password !== confirmPassword) {
      alert("Пароли не совпадают");
      return;
    }

    if (password.length < 6) {
      alert("Пароль должен содержать минимум 6 символов");
      return;
    }

    try {
      const res = await fetch(`${API}/auth/register`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({username,password})
      });

      if(res.ok){
        alert("Регистрация успешна");
        navigate("/login");
      } else {
        const data = await res.json();
        alert(data.error || "Ошибка регистрации");
      }
    } catch (error) {
      alert("Ошибка сети");
    } finally {
      setIsLoading(false);
    }
  }

  return (
<div className="auth-container">
      <div className="auth-background">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <img src="/watch.ico" alt="Часы" className="logo-icon" />
              <h1>Марти</h1>
            </div>
            <p className="auth-subtitle">Создайте новый аккаунт</p>
          </div>

          <form onSubmit={submit} className="auth-form">
            <div className="input-group">
              <label htmlFor="reg-username">Логин</label>
              <input
                id="reg-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Придумайте логин"
                disabled={isLoading}
                className="input-login_register"
              />
            </div>

            <div className="input-group">
              <label htmlFor="reg-password">Пароль</label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Придумайте пароль"
                disabled={isLoading}
                className="input-login_register"
              />
            </div>

            <div className="input-group">
              <label htmlFor="confirm-password">Подтвердите пароль</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
                disabled={isLoading}
                className="input-login_register"
              />
            </div>

            <button 
              type="submit" 
              className="auth-btn primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  Регистрация...
                </>
              ) : (
                "Создать аккаунт"
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>Уже есть аккаунт?</p>
            <Link to="/login" className="auth-link">
              Войти
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
