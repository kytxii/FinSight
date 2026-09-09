import { useEffect, useRef, useState } from "react";
import { sendChatMessage, getAssistantUsage } from "../../api/assistant";
import { useAuth } from "../../context/AuthContext";
import {
  HOME_TEXT, HOME_MUTED, HOME_DIVIDER, HOME_SURFACE, ACCENT, ACCENT_DEEP, ACCENT_TEXT, HOME_EXPENSE, FIELD,
} from "../shared/categoryVisuals";
import { DAILY_REQUEST_LIMIT, MINUTE_REQUEST_LIMIT, parseAssistantBlocks } from "../../utils/assistantMessages";

// Mobile port of the desktop AssistantPanel (#13 phase 4) - same wire format, quota
// behavior, and message parsing (all in utils/assistantMessages.js), but laid out as the
// dedicated "AI" tab MobileDashboard already routes to, not a floating trigger + panel -
// mobile has no free corner to float a launcher in, and the tab already exists for this.
//
// Uses the same fixed dark palette as the Dashboard/Analytics tabs (HOME_* from
// categoryVisuals) rather than the light/dark theme toggle - "ai" sits in the same
// bottom-nav row as those two tabs, which MobileDashboard also pins to this palette, so
// all three read as one continuous surface instead of the AI tab alone flashing light.
//
// History is session-only, same scoping decision as desktop: kept in this component's
// state, capped client-side, and re-sent whole with every message - nothing here persists
// across a reload.
const MAX_HISTORY_SENT = 10;

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
          <p key={i} className="m-0">{b.text}</p>
        ) : (
          <div key={i} className="flex flex-col gap-1.5">
            {b.items.map((item, j) => (
              <div key={j} className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: ACCENT, marginTop: 6, flexShrink: 0 }} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.amount && (
                  <div className="text-right shrink-0">
                    <div className="font-semibold" style={{ fontVariantNumeric: "tabular-nums", color: text }}>{item.amount}</div>
                    {item.detail && <div className="text-xs" style={{ color: muted }}>{item.detail}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// Compact single-row gauge - two of these sit side by side under the tab header, so each
// is narrower than desktop's version (which has more header width to spend).
function UsageGauge({ label, remaining, max, muted, countdown }) {
  return (
    <div className="flex flex-col gap-1 items-center">
      <span className="flex items-center gap-1">
        <span className="text-[10px] font-semibold uppercase" style={{ color: muted, letterSpacing: "0.08em" }}>
          {label}
        </span>
        {countdown != null && (
          <span className="text-[10px] font-semibold" style={{ color: ACCENT, fontVariantNumeric: "tabular-nums" }}>
            {countdown}s
          </span>
        )}
      </span>
      <div
        className="relative rounded-full overflow-hidden flex items-center justify-center shrink-0"
        style={{ width: 88, height: 18, backgroundColor: `color-mix(in srgb, ${HOME_TEXT} 12%, transparent)` }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, (remaining / max) * 100))}%`,
            background: `linear-gradient(90deg, ${ACCENT_DEEP}, ${ACCENT})`,
            transition: "width 300ms ease",
          }}
        />
        <span className="relative text-[10px] font-semibold" style={{ color: "#fff", fontVariantNumeric: "tabular-nums" }}>
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
            width: 5, height: 5, borderRadius: "50%", backgroundColor: color,
            animation: `assistant-typing-bounce 1.1s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

export default function MobileAssistant() {
  const { isDemo } = useAuth();
  const [messages, setMessages] = useState([]); // {role: 'user'|'assistant', content}
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Starts full - nothing's been sent yet, so a full gauge is the correct state, not an
  // absent one. The real counts from the server overwrite these the moment the first
  // message resolves (same rationale as desktop).
  const [dailyRemaining, setDailyRemaining] = useState(DAILY_REQUEST_LIMIT);
  const [minuteRemaining, setMinuteRemaining] = useState(MINUTE_REQUEST_LIMIT);
  const [minuteCountdown, setMinuteCountdown] = useState(() => 60 - new Date().getSeconds());
  const [inputFocused, setInputFocused] = useState(false);
  const listRef = useRef(null);

  const border = HOME_DIVIDER;
  const text = HOME_TEXT;
  const muted = HOME_MUTED;
  const field = FIELD;
  // The assistant's reply bubble sits directly on HOME_BG now that the card wrapper is
  // gone - FIELD (the input's background, a step below the surface) reads as almost
  // invisible against it. HOME_SURFACE is the same fixed step *up*, brighter than the
  // screen bg and legible without going anywhere near the user bubble's accent color.
  const assistantBubble = HOME_SURFACE;

  // Corrects the gauge from its optimistic full-quota default as soon as possible after
  // mount - the tab can be switched to and from freely (no unmount between visits isn't
  // guaranteed either way), so this runs every time it's shown rather than tying to a
  // one-time app-level mount. Failure is silent: worst case the gauge stays at its last
  // known value until the next real message corrects it.
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
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Ticks continuously - unlike desktop's floating panel (which only ticks while open),
  // this component is only ever mounted while its tab is the active one, so there's no
  // separate "visible" state to gate on.
  useEffect(() => {
    const interval = setInterval(() => {
      const secondsLeft = 60 - new Date().getSeconds();
      setMinuteCountdown(secondsLeft);
      if (secondsLeft === 60) setMinuteRemaining(MINUTE_REQUEST_LIMIT);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const submit = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    setError("");
    const history = messages.slice(-MAX_HISTORY_SENT).map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setLoading(true);
    try {
      const res = await sendChatMessage(trimmed, history);
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.reply }]);
      setDailyRemaining(res.data.requests_remaining_today);
      setMinuteRemaining(res.data.requests_remaining_this_minute);
    } catch (err) {
      setError(err?.response?.data?.detail || "The assistant isn't available right now.");
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
    <div className="flex flex-col h-[calc(100dvh-12rem)]">
      <style>{`
        @keyframes assistant-msg-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes assistant-typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30%           { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>

      {/* Header - title on the left, both usage gauges on the right. Mirrors the desktop
          panel's header, just without a close button (this is a tab, not an overlay).
          Extra top padding clears the floating MobileTopbar above it - the tab's own
          shared padding-top only accounts for the topbar itself, not this header too. */}
      <div className="flex items-center justify-between px-1 pt-3 pb-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="rounded-full flex items-center justify-center shrink-0"
            style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})`, color: ACCENT_TEXT }}
          >
            <SparkleIcon size={16} />
          </div>
          <span className="text-base font-semibold" style={{ color: text }}>AI Assistant</span>
        </div>
        <div className="flex items-center gap-3">
          <UsageGauge label="Today" remaining={dailyRemaining} max={DAILY_REQUEST_LIMIT} muted={muted} />
          <UsageGauge label="Per min" remaining={minuteRemaining} max={MINUTE_REQUEST_LIMIT} muted={muted} countdown={minuteCountdown} />
        </div>
      </div>

      {/* Fills the rest of the tab directly on the screen bg - no card wrapper, just an
          internal scroll region so the input stays pinned at the bottom regardless of
          message count. Message bubbles carry their own background for contrast; nothing
          else in this tab needs one. Top/bottom border marks where the chat area starts
          and ends, since there's no card outline doing that anymore. */}
      <div className="flex-1 flex flex-col min-h-0">
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-1 py-3 flex flex-col gap-3 border-t border-b"
          style={{ borderColor: border }}
        >
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center text-center gap-4 mt-4 px-2">
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: 44, height: 44,
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
                    className="text-sm text-left px-3.5 py-2.5 rounded-xl cursor-pointer active:scale-[0.98]"
                    style={{ border: `1px solid ${border}`, color: text, backgroundColor: "transparent", transition: "transform 150ms ease" }}
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
                background: m.role === "user" ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})` : assistantBubble,
                color: m.role === "user" ? ACCENT_TEXT : text,
                borderBottomRightRadius: m.role === "user" ? 4 : 16,
                borderBottomLeftRadius: m.role === "assistant" ? 4 : 16,
                animation: "assistant-msg-in 220ms ease both",
              }}
            >
              {m.role === "assistant"
                ? <AssistantMessageContent content={m.content} text={text} muted={muted} />
                : m.content}
            </div>
          ))}
          {loading && (
            <div
              className="px-3.5 py-3 rounded-2xl self-start"
              style={{ backgroundColor: assistantBubble, borderBottomLeftRadius: 4, animation: "assistant-msg-in 200ms ease both" }}
            >
              <TypingDots color={muted} />
            </div>
          )}
        </div>

        {error && (
          <div className="px-1 pb-2 text-xs shrink-0 flex items-center gap-1.5" style={{ color: HOME_EXPENSE }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="13" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <div className="pt-3 flex items-end gap-2 shrink-0">
          <div
            className="flex-1 rounded-2xl"
            style={{
              backgroundColor: field,
              border: `1px solid ${inputFocused ? `color-mix(in srgb, ${ACCENT} 55%, transparent)` : border}`,
              boxShadow: inputFocused ? `0 0 0 3px color-mix(in srgb, ${ACCENT} 14%, transparent)` : "none",
              transition: "border-color 150ms ease, box-shadow 150ms ease",
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              disabled={loading || isDemo()}
              placeholder={isDemo() ? "Not available in demo mode" : "Ask about your finances…"}
              className="w-full text-sm px-3.5 py-2.5"
              style={{ backgroundColor: "transparent", border: "none", color: text, outline: "none" }}
            />
          </div>
          <button
            onClick={() => submit(input)}
            disabled={loading || !input.trim() || isDemo()}
            aria-label="Send"
            className="rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
            style={{
              width: 40, height: 40, border: "none",
              background: input.trim() && !loading && !isDemo()
                ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})`
                : `color-mix(in srgb, ${text} 8%, transparent)`,
              color: input.trim() && !loading && !isDemo() ? ACCENT_TEXT : muted,
              transition: "background 150ms ease",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
