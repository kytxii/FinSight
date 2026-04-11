import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";
import { useTheme } from "../hooks/useTheme";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [attempts, setAttempts] = useState(0);
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
      if (err.response?.status === 429) {
        setRateLimited(true);
        setAttempts(0);
        setCountdown(30);
        setError("Too many attempts.");
        const interval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              setRateLimited(false);
              setError(null);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setAttempts((prev) => prev + 1);
        setError("Invalid email or password.");
      }
    }
  };

  const accentColor = dark ? "#81c784" : "#43a047";
  const bgColor = dark ? "#191919" : "#d7d7d7";

  return (
    <>
      <style>{`
        @keyframes finsight-float-1 {
          0%   { transform: translate(0px,   0px)   scale(1);    }
          33%  { transform: translate(40px,  -30px) scale(1.08); }
          66%  { transform: translate(-20px, 25px)  scale(0.95); }
          100% { transform: translate(0px,   0px)   scale(1);    }
        }
        @keyframes finsight-float-2 {
          0%   { transform: translate(0px,  0px)   scale(1);    }
          40%  { transform: translate(-35px, 20px) scale(1.06); }
          70%  { transform: translate(25px, -40px) scale(0.97); }
          100% { transform: translate(0px,  0px)   scale(1);    }
        }
        @keyframes finsight-float-3 {
          0%   { transform: translate(0px,   0px)  scale(1);    }
          50%  { transform: translate(20px,  35px) scale(1.05); }
          100% { transform: translate(0px,   0px)  scale(1);    }
        }
        @keyframes finsight-grid-fade {
          0%, 100% { opacity: 0.03; }
          50%       { opacity: 0.06; }
        }
      `}</style>

      {/* Full-screen background layer */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: bgColor,
          overflow: "hidden",
          zIndex: 0,
        }}
      >
        {/* Subtle dot-grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `radial-gradient(circle, ${accentColor} 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
            animation: "finsight-grid-fade 8s ease-in-out infinite",
          }}
        />

        {/* Blob 1 — large green glow, top-left */}
        <div
          style={{
            position: "absolute",
            top: "-10%",
            left: "-10%",
            width: "55vw",
            height: "55vw",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accentColor}28 0%, transparent 70%)`,
            filter: "blur(48px)",
            animation: "finsight-float-1 18s ease-in-out infinite",
          }}
        />

        {/* Blob 2 — medium green glow, bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: "-15%",
            right: "-10%",
            width: "45vw",
            height: "45vw",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`,
            filter: "blur(56px)",
            animation: "finsight-float-2 22s ease-in-out infinite",
          }}
        />

        {/* Blob 3 — small surface-tinted glow, center-right */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            right: "10%",
            width: "28vw",
            height: "28vw",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${dark ? "#252527" : "#e6e6e6"}cc 0%, transparent 70%)`,
            filter: "blur(40px)",
            animation: "finsight-float-3 15s ease-in-out infinite",
          }}
        />
      </div>

      {/* Card — unchanged positioning */}
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
          zIndex: 1,
        }}
      >
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: dark ? "var(--dark-text)" : "var(--light-text)" }}>FinSight</h1>
          <p style={{ margin: "4px 0 0", fontSize: "14px", opacity: 0.65, color: dark ? "var(--dark-text)" : "var(--light-text)" }}>Sign in to your account</p>
        </div>

        <form onSubmit={rateLimited ? (e) => e.preventDefault() : handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.65, color: dark ? "var(--dark-text)" : "var(--light-text)" }}>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: `1px solid ${dark ? "var(--dark-border)" : "var(--light-border)"}`, backgroundColor: dark ? "var(--dark-bg)" : "var(--light-bg)", color: dark ? "var(--dark-text)" : "var(--light-text)", fontSize: "14px", outline: "none" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.65, color: dark ? "var(--dark-text)" : "var(--light-text)" }}>Password</label>
            <div style={{ position: "relative" }}>
              <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                style={{ padding: "8px 36px 8px 12px", borderRadius: "8px", border: `1px solid ${dark ? "var(--dark-border)" : "var(--light-border)"}`, backgroundColor: dark ? "var(--dark-bg)" : "var(--light-bg)", color: dark ? "var(--dark-text)" : "var(--light-text)", fontSize: "14px", outline: "none", width: "100%", boxSizing: "border-box" }}
              />
              <button type="button" onClick={() => setShowPassword(p => !p)}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, color: dark ? "var(--dark-text)" : "var(--light-text)", opacity: 0.5 }}
              >
                {showPassword
                  ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: "12px", color: "var(--category-expense)", display: "flex", justifyContent: "space-between" }}>
              <span>{error}{rateLimited && countdown > 0 ? ` Retry in ${countdown}s.` : ""}</span>
              {!rateLimited && attempts > 0 && <span style={{ opacity: 0.6 }}>{attempts}/5</span>}
            </p>
          )}

          <button type="submit" disabled={rateLimited}
            style={{ padding: "8px 16px", borderRadius: "8px", border: "none", backgroundColor: "var(--category-income)", color: "#fff", fontSize: "14px", fontWeight: 500, cursor: rateLimited ? "not-allowed" : "pointer", transition: "opacity 0.15s", opacity: rateLimited ? 0.45 : 0.85, textDecoration: rateLimited ? "line-through" : "none" }}
            onMouseEnter={e => { if (!rateLimited) e.target.style.opacity = "0.7"; }}
            onMouseLeave={e => { if (!rateLimited) e.target.style.opacity = "0.85"; }}
          >
            Sign in
          </button>

          <p style={{ margin: 0, fontSize: "13px", textAlign: "center", color: dark ? "var(--dark-text)" : "var(--light-text)", opacity: 0.5 }}>
            Don't have an account?{" "}
            <a href="/register" style={{ opacity: rateLimited ? 0.35 : 1, color: "var(--category-income)", textDecoration: rateLimited ? "line-through" : "none", fontWeight: 600, pointerEvents: rateLimited ? "none" : "auto" }}>Register</a>
          </p>
        </form>
      </div>
    </>
  );
}
