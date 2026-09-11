import { useState } from "react";
import { HOME_TEXT, HOME_MUTED, HOME_SURFACE, HOME_DIVIDER } from "../../shared/categoryVisuals";

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function IconChevron({ dir, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}

// A small dropdown under whichever of month/year was tapped, not a full
// sheet. Centering under the tapped span (align="center") only works when
// that span is itself centered on screen - anchored variants whose block
// sits near the left edge (align="left") would otherwise push half the
// dropdown off-screen (#196 follow-up).
function PickerList({ options, onSelect, onClose, align = "center" }) {
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 20 }} onClick={onClose} />
      <div style={{
        position: "absolute", top: "calc(100% + 6px)",
        ...(align === "left" ? { left: 0 } : { left: "50%", transform: "translateX(-50%)" }),
        zIndex: 21, backgroundColor: HOME_SURFACE, border: `1px solid ${HOME_DIVIDER}`, borderRadius: 14,
        padding: 6, maxHeight: 260, overflowY: "auto", boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, minWidth: 220,
      }}>
        {options.map(({ value, label, disabled }) => (
          <button
            key={value}
            disabled={disabled}
            onClick={() => onSelect(value)}
            style={{
              padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent",
              color: disabled ? HOME_DIVIDER : HOME_TEXT, fontSize: 13.5, fontWeight: 600,
              cursor: disabled ? "default" : "pointer", textAlign: "center",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}

// Three sizings for the same interaction, so one component can sit in the
// Analytics tab's own standalone row, MobileHome's hero line (next to the Net
// badge), and MobileCategory's compact summary label (#122/#196).
const VARIANTS = {
  standalone: {
    wrap: { position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, margin: "4px 2px 18px" },
    arrowSize: 44,
    iconSize: 22,
    textSize: 20,
    weight: 800,
    upper: false,
    pickerAlign: "center",
    block: { display: "flex", alignItems: "baseline", justifyContent: "center", gap: 10, position: "relative", width: 175, flexShrink: 0 },
  },
  hero: {
    wrap: { position: "relative", display: "inline-flex", alignItems: "center", gap: 2 },
    arrowSize: 28,
    iconSize: 18,
    textSize: 20,
    weight: 800,
    upper: false,
    pickerAlign: "left",
    // Fixed width (longest month name, "September", plus the year) so the
    // arrows don't shift as the selected month's label changes length.
    block: { display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8, position: "relative", width: 168, flexShrink: 0 },
  },
  compact: {
    wrap: { position: "relative", display: "inline-flex", alignItems: "center", gap: 2, marginBottom: 12 },
    arrowSize: 28,
    iconSize: 18,
    textSize: 17,
    weight: 700,
    upper: false,
    pickerAlign: "left",
    block: { display: "flex", alignItems: "baseline", justifyContent: "center", gap: 7, position: "relative", width: 142, flexShrink: 0 },
  },
};

export default function MonthStepperHeader({
  year, month, onShiftMonth, onSelectMonth, onSelectYear, isCurrentMonth, yearOptions, variant = "standalone",
}) {
  const [picker, setPicker] = useState(null); // null | "month" | "year"
  const v = VARIANTS[variant];
  const closePicker = () => setPicker(null);

  return (
    <div style={v.wrap}>
      <button
        onClick={() => onShiftMonth(-1)}
        aria-label="Previous month"
        style={{ color: HOME_MUTED, background: "none", border: "none", cursor: "pointer", width: v.arrowSize, height: v.arrowSize, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      >
        <IconChevron dir="left" size={v.iconSize} />
      </button>

      <div style={v.block}>
        <span
          onClick={() => setPicker(picker === "month" ? null : "month")}
          style={{ fontSize: v.textSize, fontWeight: v.weight, letterSpacing: "-0.4px", color: HOME_TEXT, cursor: "pointer", textTransform: v.upper ? "uppercase" : "none" }}
        >
          {v.upper ? MONTH_NAMES[month].slice(0, 3) : MONTH_NAMES[month]}
        </span>
        <span
          onClick={() => setPicker(picker === "year" ? null : "year")}
          style={{ fontSize: v.textSize, fontWeight: v.weight, letterSpacing: "-0.4px", color: HOME_MUTED, cursor: "pointer", textTransform: v.upper ? "uppercase" : "none" }}
        >
          {year}
        </span>

        {picker === "month" && (
          <PickerList
            options={MONTH_NAMES.map((label, i) => ({ value: i, label: label.slice(0, 3) }))}
            onSelect={(m) => { onSelectMonth(m); closePicker(); }}
            onClose={closePicker}
            align={v.pickerAlign}
          />
        )}
        {picker === "year" && (
          <PickerList
            options={yearOptions.map((y) => ({ value: y, label: String(y) }))}
            onSelect={(y) => { onSelectYear(y); closePicker(); }}
            onClose={closePicker}
            align={v.pickerAlign}
          />
        )}
      </div>

      <button
        onClick={() => onShiftMonth(1)}
        disabled={isCurrentMonth}
        aria-label="Next month"
        style={{ color: isCurrentMonth ? HOME_DIVIDER : HOME_MUTED, background: "none", border: "none", cursor: isCurrentMonth ? "default" : "pointer", width: v.arrowSize, height: v.arrowSize, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      >
        <IconChevron dir="right" size={v.iconSize} />
      </button>
    </div>
  );
}
