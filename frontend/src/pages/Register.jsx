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

  const getPasswordStrength = (pw) => {
    const checks = [
      pw.length >= 8,
      pw.length >= 12,
      /\d/.test(pw),
      /[^a-zA-Z0-9]/.test(pw),
    ];
    const score = checks.filter(Boolean).length;
    const levels = [
      null,
      { label: "Weak", color: "#e53935" },
      { label: "Fair", color: "#fb8c00" },
      { label: "Good", color: "#fdd835" },
      { label: "Strong", color: "#43a047" },
    ];
    return { score, ...(levels[score] ?? { label: "", color: "transparent" }) };
  };

  const strength = getPasswordStrength(password);

  const FIELD_LABELS = {
    first_name: "First name",
    last_name: "Last name",
    email_address: "Email",
    password: "Password",
  };

  const MSG_MAP = {
    string_too_short: (ctx) => `must be at least ${ctx?.min_length} characters`,
    string_too_long: (ctx) => `must be at most ${ctx?.max_length} characters`,
    value_error: () => "is invalid",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (/\s/.test(password)) {
      setError("Password cannot contain whitespaces.");
      return;
    }
    if (!/\d/.test(password)) {
      setError("Password must contain at least one number.");
      return;
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      setError("Password must contain at least one special character.");
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
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 403) {
        setError("Registration is closed.");
      } else if (status === 422 && Array.isArray(detail)) {
        const first = detail[0];
        const field = FIELD_LABELS[first.loc?.[1]] ?? first.loc?.[1];
        const msg = MSG_MAP[first.type]?.(first.ctx) ?? first.msg;
        setError(`${field} ${msg}.`);
      } else {
        setError("Something went wrong. Try again.");
      }
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
        @keyframes strength-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
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
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  ...inputStyle,
                  paddingRight: "36px",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  color: dark ? "var(--dark-text)" : "var(--light-text)",
                  opacity: 0.5,
                }}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {password.length > 0 && (
              <div style={{ marginTop: "6px" }}>
                <div
                  style={{
                    position: "relative",
                    height: "4px",
                    borderRadius: "4px",
                    backgroundColor: dark
                      ? "var(--dark-border)"
                      : "var(--light-border)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: "0 auto 0 0",
                      width: `${(strength.score / 4) * 100}%`,
                      borderRadius: "4px",
                      background:
                        strength.score === 4
                          ? `linear-gradient(90deg, ${strength.color}, #81c784, ${strength.color})`
                          : strength.color,
                      backgroundSize: "200% auto",
                      animation:
                        strength.score === 4
                          ? "strength-shimmer 2s linear infinite"
                          : "none",
                      transition:
                        "width 0.35s ease, background-color 0.35s ease",
                    }}
                  />
                </div>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "11px",
                    color: strength.color,
                    fontWeight: 600,
                    transition: "color 0.35s ease",
                  }}
                >
                  {strength.label}
                </p>
                <div
                  style={{
                    marginTop: "8px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: `1px solid ${dark ? "var(--dark-border)" : "var(--light-border)"}`,
                    backgroundColor: dark
                      ? "var(--dark-bg)"
                      : "var(--light-bg)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                  }}
                >
                  {[
                    {
                      label: "At least 8 characters",
                      met: password.length >= 8,
                    },
                    { label: "At least one number", met: /\d/.test(password) },
                    {
                      label: "At least one special character",
                      met: /[^a-zA-Z0-9]/.test(password),
                    },
                    { label: "No whitespaces", met: !/\s/.test(password) },
                  ].map(({ label, met }) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "7px",
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={
                          met
                            ? "#43a047"
                            : dark
                              ? "var(--dark-border)"
                              : "var(--light-border)"
                        }
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          flexShrink: 0,
                          transition: "stroke 0.2s ease",
                        }}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span
                        style={{
                          fontSize: "11px",
                          color: met
                            ? "#43a047"
                            : dark
                              ? "var(--dark-text)"
                              : "var(--light-text)",
                          opacity: met ? 1 : 0.45,
                          transition: "color 0.2s ease, opacity 0.2s ease",
                        }}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Confirm Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  ...inputStyle,
                  paddingRight: "36px",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((p) => !p)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  color: dark ? "var(--dark-text)" : "var(--light-text)",
                  opacity: 0.5,
                }}
              >
                {showConfirmPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
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
