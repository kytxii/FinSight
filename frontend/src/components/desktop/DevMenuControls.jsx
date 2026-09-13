import { HOME_EXPENSE, HOME_INCOME } from "../shared/categoryVisuals";

// Small building blocks for the desktop Dev Tools panel (#177). Grouped in
// one file rather than four, since they're only ever used together and none
// is meaningful on its own - unlike the other components lifted out of
// Dashboard.jsx alongside these, which each stand alone.

export function DevMenuSection({ label, border, muted }) {
  return (
    <div
      style={{
        padding: "8px 14px 4px",
        borderTop: `1px solid ${border}`,
        marginTop: 4,
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: muted,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function DevMenuInfo({ label, value, muted, text }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "4px 14px",
        gap: 12,
      }}
    >
      <span style={{ fontSize: 12, color: muted }}>{label}</span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: text,
          fontFamily: "monospace",
          textAlign: "right",
          maxWidth: 140,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function DevMenuButton({
  label,
  description,
  onClick,
  muted,
  text,
  border,
  danger,
}) {
  return (
    <div style={{ padding: "3px 14px" }}>
      <button
        onClick={onClick}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "5px 8px",
          borderRadius: 8,
          border: `1px solid ${border}`,
          background: "transparent",
          cursor: "pointer",
          transition: "background-color 150ms ease",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = danger
            ? `color-mix(in srgb, ${HOME_EXPENSE} 8%, transparent)`
            : `color-mix(in srgb, ${text} 6%, transparent)`)
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "transparent")
        }
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: danger ? HOME_EXPENSE : text,
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: 10, color: muted }}>{description}</span>
      </button>
    </div>
  );
}

export function DevMenuRow({ label, active, onToggle, muted, text, border }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 14px",
        gap: 12,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 500, color: text }}>
        {label}
      </span>
      <button
        onClick={onToggle}
        style={{
          width: 38,
          height: 22,
          borderRadius: 999,
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
          backgroundColor: active
            ? HOME_INCOME
            : `color-mix(in srgb, ${text} 18%, transparent)`,
          position: "relative",
          transition: "background-color 180ms ease",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 3,
            left: active ? "calc(100% - 19px)" : 3,
            width: 16,
            height: 16,
            borderRadius: "50%",
            backgroundColor: "#fff",
            transition: "left 180ms ease",
            boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
          }}
        />
      </button>
    </div>
  );
}
