import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";
import { useTheme } from "../hooks/useTheme";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const dark = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await client.post("/auth/login", {
        email_address: email,
        password,
      });
      login(res.data.access_token);
      navigate("/");
    } catch (err) {
      setError("Invalid email or password");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "100%",
        maxWidth: "384px",
        padding: "32px",
        borderRadius: "16px",
        border: `1px solid ${dark ? "var(--dark-border)" : "var(--light-border)"}`,
        backgroundColor: dark ? "var(--dark-surface)" : "var(--light-surface)",
      }}
    >
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 600, color: dark ? "var(--dark-text)" : "var(--light-text)" }}>FinSight</h1>
        <p style={{ margin: "4px 0 0", fontSize: "14px", opacity: 0.5, color: dark ? "var(--dark-text)" : "var(--light-text)" }}>Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.5, color: dark ? "var(--dark-text)" : "var(--light-text)" }}>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "8px", border: `1px solid ${dark ? "var(--dark-border)" : "var(--light-border)"}`, backgroundColor: dark ? "var(--dark-bg)" : "var(--light-bg)", color: dark ? "var(--dark-text)" : "var(--light-text)", fontSize: "14px", outline: "none" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.5, color: dark ? "var(--dark-text)" : "var(--light-text)" }}>Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "8px", border: `1px solid ${dark ? "var(--dark-border)" : "var(--light-border)"}`, backgroundColor: dark ? "var(--dark-bg)" : "var(--light-bg)", color: dark ? "var(--dark-text)" : "var(--light-text)", fontSize: "14px", outline: "none" }}
          />
        </div>

        {error && <p style={{ margin: 0, fontSize: "12px", color: "var(--category-expense)" }}>{error}</p>}

        <button type="submit"
          style={{ padding: "8px 16px", borderRadius: "8px", border: "none", backgroundColor: "var(--category-income)", color: "#fff", fontSize: "14px", fontWeight: 500, cursor: "pointer", transition: "opacity 0.15s" }}
          onMouseEnter={e => e.target.style.opacity = "0.8"}
          onMouseLeave={e => e.target.style.opacity = "1"}
        >
          Sign in
        </button>

        <p style={{ margin: 0, fontSize: "13px", textAlign: "center", color: dark ? "var(--dark-text)" : "var(--light-text)", opacity: 0.5 }}>
          Don't have an account?{" "}
          <a href="/register" style={{ opacity: 1, color: "var(--category-income)", textDecoration: "none", fontWeight: 600 }}>Register</a>
        </p>
      </form>
    </div>
  );
}
