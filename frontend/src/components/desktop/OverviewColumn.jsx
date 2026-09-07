import { useState } from "react";
import { HOME_TEXT, HOME_MUTED, HOME_DIVIDER } from "../shared/categoryVisuals";

// One column of the unified overview panel (#123, extracted #177).
export default function OverviewColumn({
  label,
  value,
  valueNode,
  color,
  caption,
  onClick,
  active,
  first,
}) {
  const [hovered, setHovered] = useState(false);
  const tint = color ?? HOME_TEXT;
  const interactive = onClick != null;
  const Tag = interactive ? "button" : "div";
  return (
    <Tag
      type={interactive ? "button" : undefined}
      onClick={onClick}
      onMouseEnter={interactive ? () => setHovered(true) : undefined}
      onMouseLeave={interactive ? () => setHovered(false) : undefined}
      className={`text-left transition-all duration-150 ${interactive ? "cursor-pointer active:scale-[0.98]" : ""}`}
      style={{
        position: "relative",
        flex: 1,
        minWidth: 0,
        padding: "16px 20px",
        border: "none",
        borderRadius: 0,
        borderLeft: first ? "none" : `1px solid ${HOME_DIVIDER}`,
        backgroundColor: active
          ? `color-mix(in srgb, ${tint} 12%, transparent)`
          : hovered
            ? `color-mix(in srgb, ${tint} 7%, transparent)`
            : "transparent",
        font: "inherit",
        color: "inherit",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: HOME_MUTED,
            margin: 0,
          }}
        >
          {label}
        </p>
        {interactive && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: active || hovered ? tint : HOME_MUTED,
              flexShrink: 0,
              transform: active ? "rotate(180deg)" : "none",
              transition: "transform 200ms ease, color 150ms ease",
            }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </div>
      {valueNode ?? (
        <p
          style={{
            fontSize: 22,
            fontWeight: 700,
            color,
            margin: "6px 0 0",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </p>
      )}
      {caption != null && (
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: HOME_MUTED,
            margin: "5px 0 0",
          }}
        >
          {caption}
        </p>
      )}
    </Tag>
  );
}
