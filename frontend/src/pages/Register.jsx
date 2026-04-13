import { useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useTheme } from "../hooks/useTheme";

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const dark = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

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
    opacity: 0.65,
    color: dark ? "var(--dark-text)" : "var(--light-text)",
  };

  const fieldStyle = { display: "flex", flexDirection: "column", gap: "6px" };

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

        {/* Blob 1 — large green glow, top-right */}
        <div
          style={{
            position: "absolute",
            top: "-10%",
            right: "-10%",
            width: "55vw",
            height: "55vw",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accentColor}28 0%, transparent 70%)`,
            filter: "blur(48px)",
            animation: "finsight-float-1 18s ease-in-out infinite",
          }}
        />

        {/* Blob 2 — medium green glow, bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: "-15%",
            left: "-10%",
            width: "45vw",
            height: "45vw",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`,
            filter: "blur(56px)",
            animation: "finsight-float-2 22s ease-in-out infinite",
          }}
        />

        {/* Blob 3 — small surface-tinted glow, center-left */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "10%",
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
          backgroundColor: dark
            ? "var(--dark-surface)"
            : "var(--light-surface)",
          zIndex: 1,
        }}
      >
        <div style={{ marginBottom: "24px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: 700,
              color: dark ? "var(--dark-text)" : "var(--light-text)",
            }}
          >
            FinSight
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "14px",
              opacity: 0.65,
              color: dark ? "var(--dark-text)" : "var(--light-text)",
            }}
          >
            Create your account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ ...fieldStyle, flex: 1, minWidth: 0 }}>
              <label style={labelStyle}>First name</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={{
                  ...inputStyle,
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ ...fieldStyle, flex: 1, minWidth: 0 }}>
              <label style={labelStyle}>Last name</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={{
                  ...inputStyle,
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative" }}>
              <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: "36px", width: "100%", boxSizing: "border-box" }}
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

          <div style={fieldStyle}>
            <label style={labelStyle}>Confirm Password</label>
            <div style={{ position: "relative" }}>
              <input type={showConfirmPassword ? "text" : "password"} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: "36px", width: "100%", boxSizing: "border-box" }}
              />
              <button type="button" onClick={() => setShowConfirmPassword(p => !p)}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, color: dark ? "var(--dark-text)" : "var(--light-text)", opacity: 0.5 }}
              >
                {showConfirmPassword
                  ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {error && (
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: "var(--category-expense)",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "var(--category-income)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "opacity 0.15s",
              opacity: 0.85,
            }}
            onMouseEnter={(e) => (e.target.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.target.style.opacity = "0.85")}
          >
            Create account
          </button>

          <p
            style={{
              margin: 0,
              fontSize: "13px",
              textAlign: "center",
              color: dark ? "var(--dark-text)" : "var(--light-text)",
              opacity: 0.5,
            }}
          >
            Already have an account?{" "}
            <a
              href="/login"
              style={{
                opacity: 1,
                color: "var(--category-income)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Sign in
            </a>
          </p>
        </form>
      </div>
    </>
  );
}
