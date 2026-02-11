import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Header from "./components/Header";
import Week from "./pages/Week";
import TaskCalendar from "./pages/TaskCalendar";

export default function App() {
  const token = localStorage.getItem("token");
  const location = useLocation();

  const hideHeader = ["/login", "/register"].includes(location.pathname);

  return (
    <>
      {!hideHeader && <Header />}
      <div>
         {/* class="reg-login"> */}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={token ? <Week /> : <Navigate to="/login" />}
        />
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/page/TaskCalendar" element={<TaskCalendar />} />
      </Routes>
      </div>
    </>
  );
}
