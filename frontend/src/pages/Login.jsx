import React, {useState} from "react";
import { useNavigate, Link } from "react-router-dom";

import { API } from "../api";

export default function Login(){
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e){
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      alert("Заполните все поля");
      return;
    }

    try{
      const res = await fetch(`${API}/auth/login`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({username,password})
      });

      const data = await res.json();

      if(data.token){
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        localStorage.setItem("id", data.id);
        localStorage.setItem("theme", data.theme);
        navigate("/");
      } else {
        alert(data.error || "Ошибка входа");
      }
    }catch(err){ alert("Ошибка сети") }
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
            <p className="auth-subtitle">Добро пожаловать</p>
          </div>

          <form onSubmit={submit} className="auth-form">
            <div className="input-group">
              <label htmlFor="username">Логин</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Введите ваш логин"
                disabled={isLoading}
                className="input-login_register"
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Пароль</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Введите ваш пароль"
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
                  Вход...
                </>
              ) : (
                "Войти"
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>Еще нет аккаунта?</p>
            <Link to="/register" className="auth-link">
              Зарегистрироваться
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
