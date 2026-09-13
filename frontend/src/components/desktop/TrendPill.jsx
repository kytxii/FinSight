import { HOME_MUTED, HOME_TEXT } from "../shared/categoryVisuals";

// A single category's colored dot + label + value pill in the trend chart
// legend (#177).
export default function TrendPill({ label, value, color }) {
  return (
    <div
      style={{
        flex: "0 0 auto",
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 11px",
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.05)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          whiteSpace: "nowrap",
          fontSize: 13,
          fontWeight: 600,
          color: HOME_MUTED,
        }}
      >
        {label}
      </span>
      <span
        style={{
          whiteSpace: "nowrap",
          fontSize: 13,
          fontWeight: 700,
          color: HOME_TEXT,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}
