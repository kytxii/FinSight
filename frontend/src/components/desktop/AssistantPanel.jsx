import { useEffect, useRef, useState } from "react";
import { sendChatMessage, getAssistantUsage } from "../../api/assistant";
import { useAuth } from "../../context/AuthContext";
import {
  HOME_SURFACE,
  HOME_TEXT,
  HOME_MUTED,
  HOME_DIVIDER,
  ACCENT,
  ACCENT_DEEP,
  ACCENT_TEXT,
  HOME_EXPENSE,
  FIELD,
} from "../shared/categoryVisuals";
import { DAILY_REQUEST_LIMIT, MINUTE_REQUEST_LIMIT, parseAssistantBlocks } from "../../utils/assistantMessages";

const MAX_HISTORY_SENT = 10;
const TRIGGER_OFFSET = 64;
const TRIGGER_SIZE = 52;
const PANEL_GAP = 12;
const SUGGESTIONS = [
  "Am I spending more this month than last?",
  "How much do my bills and subscriptions add up to each month?",
  "Which merchant do I spend the most at?",
];

function SparkleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.5c.3 3.4 1 5.6 2.1 6.7 1.1 1.1 3.3 1.8 6.7 2.1-3.4.3-5.6 1-6.7 2.1-1.1 1.1-1.8 3.3-2.1 6.7-.3-3.4-1-5.6-2.1-6.7-1.1-1.1-3.3-1.8-6.7-2.1 3.4-.3 5.6-1 6.7-2.1 1.1-1.1 1.8-3.3 2.1-6.7z" />
    </svg>
  );
}

function AssistantMessageContent({ content, text, muted }) {
  const blocks = parseAssistantBlocks(content);
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((b, i) =>
        b.type === "text" ? (
          <p key={i} className="m-0">
            {b.text}
          </p>
        ) : (
          <div key={i} className="flex flex-col gap-1.5">
            {b.items.map((item, j) => (
              <div key={j} className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      backgroundColor: ACCENT,
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.amount && (
                  <div className="text-right shrink-0">
                    <div
                      className="font-semibold"
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        color: text,
                      }}
                    >
                      {item.amount}
                    </div>
                    {item.detail && (
                      <div className="text-xs" style={{ color: muted }}>
                        {item.detail}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ),
      )}
    </div>
  );
}

function UsageGauge({ label, remaining, max, text, muted, countdown }) {
  return (
    <div className="flex flex-col gap-1 items-center">
      <span className="flex items-center gap-1">
        <span
          className="text-[9px] font-semibold uppercase"
          style={{ color: muted, letterSpacing: "0.08em" }}
        >
          {label}
        </span>
        {countdown != null && (
          <span
            className="text-[9px] font-semibold"
            style={{ color: ACCENT, fontVariantNumeric: "tabular-nums" }}
          >
            {countdown}s
          </span>
        )}
      </span>
      <div
        className="relative rounded-full overflow-hidden flex items-center justify-center shrink-0"
        style={{
          width: 92,
          height: 16,
          backgroundColor: `color-mix(in srgb, ${text} 12%, transparent)`,
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, (remaining / max) * 100))}%`,
            background: `linear-gradient(90deg, ${ACCENT_DEEP}, ${ACCENT})`,
            transition: "width 300ms ease",
          }}
        />
        <span
          className="relative text-[9px] font-semibold"
          style={{
            color: "#fff",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "0.02em",
          }}
        >
          {remaining}/{max}
        </span>
      </div>
    </div>
  );
}

function TypingDots({ color }) {
  return (
    <span className="flex items-center gap-1" style={{ height: 14 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            backgroundColor: color,
            animation: `assistant-typing-bounce 1.1s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

export default function AssistantPanel() {
  const { isDemo } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // {role: 'user'|'assistant', content}
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dailyRemaining, setDailyRemaining] = useState(DAILY_REQUEST_LIMIT);
  const [minuteRemaining, setMinuteRemaining] = useState(MINUTE_REQUEST_LIMIT);
  const [minuteCountdown, setMinuteCountdown] = useState(
    () => 60 - new Date().getSeconds(),
  );
  const [inputFocused, setInputFocused] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const bg = HOME_SURFACE;
  const border = HOME_DIVIDER;
  const text = HOME_TEXT;
  const muted = HOME_MUTED;

  useEffect(() => {
    getAssistantUsage()
      .then((res) => {
        setDailyRemaining(res.data.requests_remaining_today);
        setMinuteRemaining(res.data.requests_remaining_this_minute);
      })
      .catch((err) => {
        console.error("Failed to fetch assistant usage:", err);
      });
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 260);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      const secondsLeft = 60 - new Date().getSeconds();
      setMinuteCountdown(secondsLeft);
      if (secondsLeft === 60) setMinuteRemaining(MINUTE_REQUEST_LIMIT);
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  const submit = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    setError("");
    const history = messages
      .slice(-MAX_HISTORY_SENT)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setLoading(true);
    try {
      const res = await sendChatMessage(trimmed, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.reply },
      ]);
      setDailyRemaining(res.data.requests_remaining_today);
      setMinuteRemaining(res.data.requests_remaining_this_minute);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "The assistant isn't available right now.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(input);
    }
  };

  return (
    <>
      <style>{`
        @keyframes assistant-panel-in {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes assistant-msg-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes assistant-typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30%           { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          bottom: TRIGGER_OFFSET,
          right: TRIGGER_OFFSET,
          zIndex: 50,
          width: 52,
          height: 52,
        }}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close AI assistant" : "Open AI assistant"}
          className="rounded-full flex items-center justify-center cursor-pointer shadow-2xl"
          style={{
            position: "relative",
            width: 52,
            height: 52,
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})`,
            color: ACCENT_TEXT,
            border: "none",
            transition: "transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.07)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: "absolute",
              transform: open
                ? "rotate(-90deg) scale(0.5)"
                : "rotate(0deg) scale(1)",
              opacity: open ? 0 : 1,
              transition:
                "transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 150ms ease",
            }}
          >
            <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: "absolute",
              transform: open
                ? "rotate(0deg) scale(1)"
                : "rotate(90deg) scale(0.5)",
              opacity: open ? 1 : 0,
              transition:
                "transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 150ms ease",
            }}
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div
        className="fixed z-50 flex flex-col rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          bottom: TRIGGER_OFFSET + TRIGGER_SIZE + PANEL_GAP,
          right: TRIGGER_OFFSET,
          width: 380,
          maxWidth: "calc(100vw - 48px)",
          maxHeight: "calc(100dvh - 140px)",
          height: 540,
          backgroundColor: bg,
          borderColor: border,
          color: text,
          transformOrigin: "bottom right",
          animation: open
            ? "assistant-panel-in 280ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
            : "none",
          opacity: open ? 1 : 0,
          transform: open ? "none" : "translateY(28px) scale(0.97)",
          pointerEvents: open ? "auto" : "none",
          transition: open
            ? "none"
            : "opacity 150ms ease, transform 150ms ease",
        }}
      >
        <div
          className="px-5 py-3.5 flex items-center justify-between border-b shrink-0"
          style={{
            borderColor: border,
            background: `linear-gradient(135deg, color-mix(in srgb, ${ACCENT} 12%, transparent), transparent 70%)`,
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="rounded-full flex items-center justify-center shrink-0"
              style={{
                width: 26,
                height: 26,
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})`,
                color: ACCENT_TEXT,
              }}
            >
              <SparkleIcon size={13} />
            </div>
            <span className="text-sm font-semibold">AI Assistant</span>
          </div>
          <div className="flex items-center gap-2.5">
            <UsageGauge
              label="Today"
              remaining={dailyRemaining}
              max={DAILY_REQUEST_LIMIT}
              text={text}
              muted={muted}
            />
            <UsageGauge
              label="Per min"
              remaining={minuteRemaining}
              max={MINUTE_REQUEST_LIMIT}
              text={text}
              muted={muted}
              countdown={minuteCountdown}
            />
          </div>
        </div>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
        >
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center text-center gap-4 mt-4 px-4">
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: 44,
                  height: 44,
                  background: `linear-gradient(135deg, color-mix(in srgb, ${ACCENT} 25%, transparent), color-mix(in srgb, ${ACCENT_DEEP} 25%, transparent))`,
                  color: ACCENT,
                }}
              >
                <SparkleIcon size={20} />
              </div>
              <p className="text-sm" style={{ color: muted }}>
                Ask about your spending, balance, or upcoming bills.
              </p>
              <div className="flex flex-col gap-2 w-full">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    disabled={isDemo()}
                    className="text-sm text-left px-3.5 py-2.5 rounded-xl cursor-pointer"
                    style={{
                      border: `1px solid ${border}`,
                      color: text,
                      backgroundColor: "transparent",
                      transition:
                        "background-color 150ms ease, border-color 150ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${ACCENT} 8%, transparent)`;
                      e.currentTarget.style.borderColor = `color-mix(in srgb, ${ACCENT} 40%, transparent)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.borderColor = border;
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`text-sm px-3.5 py-2.5 rounded-2xl ${m.role === "user" ? "whitespace-pre-wrap" : ""}`}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                lineHeight: 1.45,
                background:
                  m.role === "user"
                    ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})`
                    : FIELD,
                color: m.role === "user" ? ACCENT_TEXT : text,
                borderBottomRightRadius: m.role === "user" ? 4 : 16,
                borderBottomLeftRadius: m.role === "assistant" ? 4 : 16,
                animation: "assistant-msg-in 220ms ease both",
              }}
            >
              {m.role === "assistant" ? (
                <AssistantMessageContent
                  content={m.content}
                  text={text}
                  muted={muted}
                />
              ) : (
                m.content
              )}
            </div>
          ))}
          {loading && (
            <div
              className="px-3.5 py-3 rounded-2xl self-start"
              style={{
                backgroundColor: FIELD,
                borderBottomLeftRadius: 4,
                animation: "assistant-msg-in 200ms ease both",
              }}
            >
              <TypingDots color={muted} />
            </div>
          )}
        </div>

        {error && (
          <div
            className="px-4 pb-2 text-xs shrink-0 flex items-center gap-1.5"
            style={{ color: HOME_EXPENSE }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="13" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <div
          className="p-3 border-t flex items-end gap-2 shrink-0"
          style={{ borderColor: border }}
        >
          <div
            className="flex-1 rounded-2xl"
            style={{
              backgroundColor: FIELD,
              border: `1px solid ${inputFocused ? `color-mix(in srgb, ${ACCENT} 55%, transparent)` : border}`,
              boxShadow: inputFocused
                ? `0 0 0 3px color-mix(in srgb, ${ACCENT} 14%, transparent)`
                : "none",
              transition: "border-color 150ms ease, box-shadow 150ms ease",
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              disabled={loading || isDemo()}
              placeholder={
                isDemo()
                  ? "Not available in demo mode"
                  : "Ask about your finances…"
              }
              className="w-full text-sm px-3.5 py-2.5"
              style={{
                backgroundColor: "transparent",
                border: "none",
                color: text,
                outline: "none",
              }}
            />
          </div>
          <button
            onClick={() => submit(input)}
            disabled={loading || !input.trim() || isDemo()}
            aria-label="Send"
            className="rounded-full flex items-center justify-center shrink-0 cursor-pointer"
            style={{
              width: 40,
              height: 40,
              border: "none",
              background:
                input.trim() && !loading && !isDemo()
                  ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})`
                  : `color-mix(in srgb, ${text} 8%, transparent)`,
              color:
                input.trim() && !loading && !isDemo() ? ACCENT_TEXT : muted,
              cursor:
                loading || !input.trim() || isDemo() ? "default" : "pointer",
              transition:
                "transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1), background 150ms ease",
            }}
            onMouseEnter={(e) => {
              if (input.trim() && !loading)
                e.currentTarget.style.transform = "scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
