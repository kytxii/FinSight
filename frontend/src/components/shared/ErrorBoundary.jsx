import { Component } from "react";
import {
  HOME_BG, HOME_SURFACE, HOME_TEXT, HOME_MUTED, HOME_DIVIDER, HOME_EXPENSE,
  ACCENT, ACCENT_TEXT,
} from "./categoryVisuals";

// React unmounts the entire tree on an uncaught render error, so without a
// boundary a single mistake anywhere blanks the whole app with nothing on
// screen to explain it - a missing Toggle import in MobileDashboard did
// exactly that, and the only way to find it was opening devtools (#168).
// One of these keeps a crash contained and, in dev, names the cause.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // No error-reporting service is wired up, so the console is the only
    // place this can go - but at least it's now deliberate rather than a
    // silently swallowed white screen.
    console.error("Uncaught render error:", error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100dvh",
          backgroundColor: HOME_BG,
          color: HOME_TEXT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            backgroundColor: HOME_SURFACE,
            border: `1px solid ${HOME_DIVIDER}`,
            borderRadius: 16,
            padding: 28,
          }}
        >
          <div
            style={{
              width: 40, height: 40, borderRadius: 12, marginBottom: 18,
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: `color-mix(in srgb, ${HOME_EXPENSE} 16%, transparent)`,
              color: HOME_EXPENSE,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
          </div>

          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: HOME_MUTED, lineHeight: 1.5 }}>
            This part of the app hit an error and stopped. Your data is safe - reloading
            usually clears it.
          </p>

          {import.meta.env.DEV && (
            <pre
              style={{
                margin: "18px 0 0",
                padding: 12,
                borderRadius: 10,
                backgroundColor: "rgba(255,255,255,0.04)",
                border: `1px solid ${HOME_DIVIDER}`,
                color: HOME_EXPENSE,
                fontSize: 12,
                lineHeight: 1.45,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: 220,
                overflowY: "auto",
              }}
            >
              {String(error?.stack || error?.message || error)}
            </pre>
          )}

          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 22,
              width: "100%",
              padding: "11px 0",
              borderRadius: 12,
              border: "none",
              backgroundColor: ACCENT,
              color: ACCENT_TEXT,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
