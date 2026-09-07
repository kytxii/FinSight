import { HOME_MUTED } from "../shared/categoryVisuals";

// A numerator over a denominator, stacked and rule-divided (#177) - e.g. the
// TIPS TOTAL overview column's "this period / vs last period" figure.
export default function StackedFraction({ num, den, color }) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        lineHeight: 1.2,
      }}
    >
      <span
        style={{
          fontSize: 20,
          fontWeight: 700,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {num}
      </span>
      <span
        style={{
          width: "100%",
          borderTop: `1.5px solid color-mix(in srgb, ${color} 45%, transparent)`,
          margin: "3px 0",
        }}
      />
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: HOME_MUTED,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {den}
      </span>
    </span>
  );
}
