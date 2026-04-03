import { useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useTheme } from "../hooks/useTheme";

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const dark = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await client.post("/auth/register", {
        first_name: firstName,
        last_name: lastName,
        email_address: email,
        password,
      });
      navigate("/login");
    } catch (err) {
      setError("Registration failed. Try again.");
    }
  };

  const inputStyle = {
    padding: "8px 12px",
    borderRadius: "8px",
    border: `1px solid ${dark ? "var(--dark-border)" : "var(--light-border)"}`,
    backgroundColor: dark ? "var(--dark-bg)" : "var(--light-bg)",
    color: dark ? "var(--dark-text)" : "var(--light-text)",
    fontSize: "14px",
    outline: "none",
  };

  const labelStyle = {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    opacity: 0.5,
    color: dark ? "var(--dark-text)" : "var(--light-text)",
  };

  const fieldStyle = { display: "flex", flexDirection: "column", gap: "6px" };

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
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 600, color: dark ? "var(--dark-text)" : "var(--light-text)" }}>
          FinSight
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: "14px", opacity: 0.5, color: dark ? "var(--dark-text)" : "var(--light-text)" }}>
          Create your account
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ ...fieldStyle, flex: 1, minWidth: 0 }}>
            <label style={labelStyle}>First name</label>
            <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div style={{ ...fieldStyle, flex: 1, minWidth: 0 }}>
            <label style={labelStyle}>Last name</label>
            <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        </div>

        {error && <p style={{ margin: 0, fontSize: "12px", color: "var(--category-expense)" }}>{error}</p>}

        <button
          type="submit"
          style={{ padding: "8px 16px", borderRadius: "8px", border: "none", backgroundColor: "var(--category-income)", color: "#fff", fontSize: "14px", fontWeight: 500, cursor: "pointer", transition: "opacity 0.15s" }}
          onMouseEnter={(e) => (e.target.style.opacity = "0.8")}
          onMouseLeave={(e) => (e.target.style.opacity = "1")}
        >
          Create account
        </button>

        <p style={{ margin: 0, fontSize: "13px", textAlign: "center", color: dark ? "var(--dark-text)" : "var(--light-text)", opacity: 0.5 }}>
          Already have an account?{" "}
          <a href="/login" style={{ opacity: 1, color: "var(--category-income)", textDecoration: "none", fontWeight: 600 }}>
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
}
