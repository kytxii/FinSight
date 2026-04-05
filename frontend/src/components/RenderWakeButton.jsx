import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useTheme } from "../hooks/useTheme";

const ESTIMATED = 50;
const TIMEOUT = 120;
const POLL_MS = 5000;

export default function RenderWakeButton() {
  const [status, setStatus] = useState("checking");
  const [elapsed, setElapsed] = useState(0);
  const dark = useTheme();

  const pollRef = useRef(null);
  const timerRef = useRef(null);

  const cleanup = () => {
    clearInterval(pollRef.current);
    clearInterval(timerRef.current);
  };

  useEffect(() => {
    const check = async () => {
      try {
        await axios.get((import.meta.env.VITE_API_URL ?? "/api") + "/", { timeout: 5000 });
        setStatus("gone");
      } catch {
        setStatus("idle");
      }
    };
    check();
    return cleanup;
  }, []);

  const ping = async () => {
    try {
      await axios.get((import.meta.env.VITE_API_URL ?? "/api") + "/", { timeout: 8000 });
      cleanup();
      setStatus("online");
      setTimeout(() => setStatus("fading"), 3000);
      setTimeout(() => setStatus("gone"), 3500);
    } catch {
      // still waiting — poll will retry
    }
  };

  const handleWake = () => {
    setStatus("pinging");
    setElapsed(0);
    ping();
    pollRef.current = setInterval(ping, POLL_MS);
    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= TIMEOUT) {
          cleanup();
          setStatus("error");
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const accentColor = dark ? "#81c784" : "#43a047";
  const errorColor = "var(--category-expense)";
  const surface = dark ? "var(--dark-surface)" : "var(--light-surface)";
  const border = dark ? "var(--dark-border)" : "var(--light-border)";
  const textColor = dark ? "var(--dark-text)" : "var(--light-text)";

  const isOnline = status === "online" || status === "fading";

  const r = 22;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(elapsed / ESTIMATED, 1);
  const dash = circumference * progress;

  const remaining = Math.max(0, ESTIMATED - elapsed);
  const labelText =
    status === "pinging"
      ? elapsed < ESTIMATED
        ? `~${remaining}s remaining`
        : "Taking longer than expected…"
      : isOnline
      ? "Online"
      : status === "error"
      ? "Timed out — retry?"
      : null;

  const labelBorderColor =
    isOnline
      ? `${accentColor}55`
      : status === "error"
      ? `${errorColor}55`
      : border;

  const labelTextColor =
    isOnline
      ? accentColor
      : status === "error"
      ? errorColor
      : textColor;

  if (status === "gone" || status === "checking") return null;


  return (
    <>
      <style>{`
        @keyframes pulse-dot {
          0%, 80%, 100% { transform: scale(0.55); opacity: 0.35; }
          40%            { transform: scale(1);    opacity: 1;    }
        }
        @keyframes wake-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "10px",
          opacity: status === "fading" ? 0 : 1,
          transition: status === "fading" ? "opacity 0.5s ease" : "none",
        }}
      >
        {/* Label pill */}
        {labelText && (
          <div
            style={{
              backgroundColor: surface,
              border: `1px solid ${labelBorderColor}`,
              borderRadius: "8px",
              padding: "5px 10px",
              fontSize: "12px",
              color: labelTextColor,
              whiteSpace: "nowrap",
              animation: "wake-fade-in 0.2s ease",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
          >
            {labelText}
          </div>
        )}

        {/* Circle button */}
        <button
          onClick={status === "idle" || status === "error" ? handleWake : undefined}
          disabled={status === "pinging" || isOnline}
          title={status === "idle" ? "Wake up backend" : undefined}
          style={{
            position: "relative",
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            border: `1px solid ${border}`,
            backgroundColor: surface,
            cursor: status === "idle" || status === "error" ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
            transition: "box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            if (status === "idle" || status === "error")
              e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.26)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.18)";
          }}
        >
          {/* SVG progress ring */}
          {status === "pinging" && (
            <svg
              width="52"
              height="52"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                transform: "rotate(-90deg)",
                borderRadius: "50%",
              }}
            >
              <circle
                cx="26" cy="26" r={r}
                fill="none"
                stroke={`${accentColor}20`}
                strokeWidth="2.5"
              />
              <circle
                cx="26" cy="26" r={r}
                fill="none"
                stroke={accentColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference}`}
                style={{ transition: "stroke-dasharray 0.95s linear" }}
              />
            </svg>
          )}

          {/* Idle — power icon */}
          {status === "idle" && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          )}

          {/* Pinging — three dots */}
          {status === "pinging" && (
            <div style={{ display: "flex", gap: "3.5px", alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    backgroundColor: accentColor,
                    animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Online — checkmark */}
          {isOnline && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}

          {/* Error — X */}
          {status === "error" && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke={errorColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
