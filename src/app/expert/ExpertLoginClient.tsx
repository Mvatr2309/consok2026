"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import s from "./expert.module.css";

export default function ExpertLoginClient() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/expert/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        router.refresh();
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.loginWrapper}>
      <form className={s.loginForm} onSubmit={handleSubmit}>
        <h1 className={s.loginTitle}>Личный кабинет эксперта</h1>
        <p className={s.loginSubtitle}>Войдите с помощью логина и пароля</p>

        {error && <p className={s.loginError}>{error}</p>}

        <div className={s.loginField}>
          <label className={s.loginLabel}>Логин</label>
          <input
            className={s.loginInput}
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
            autoComplete="username"
          />
        </div>

        <div className={s.loginField}>
          <label className={s.loginLabel}>Пароль</label>
          <input
            className={s.loginInput}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <button className={s.loginBtn} type="submit" disabled={loading}>
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>
    </div>
  );
}
