import { useLayoutEffect, useRef, useState } from "react";

// A two-option segmented pill - "Cash" / "Deposit" - used both as a plain
// choice (the Add Transaction flow, Cash default) and, in edit contexts, to
// show which one a row currently is; picking the other side there fires the
// convert action rather than just setting local state.
export default function Toggle({ checked, onChange, disabled = false, activeColor = "#14b8a6", onLabel = "Deposit", offLabel = "Cash" }) {
  const offRef = useRef(null);
  const onRef = useRef(null);
  const [optionWidth, setOptionWidth] = useState(null);

  // Both options are pinned to the same fixed width - whichever label is
  // wider ("Deposit") sets it, rather than splitting the track in half and
  // letting each side's own text width pull it off-center.
  useLayoutEffect(() => {
    const widths = [offRef.current?.offsetWidth, onRef.current?.offsetWidth].filter(Boolean);
    if (widths.length) setOptionWidth(Math.max(...widths));
  }, [onLabel, offLabel]);

  const optionStyle = (active) => ({
    position: "relative",
    zIndex: 1,
    width: optionWidth ?? "auto",
    padding: "5px 12px",
    borderRadius: 999,
    border: "none",
    background: "transparent",
    fontSize: 12.5,
    fontWeight: 600,
    textAlign: "center",
    whiteSpace: "nowrap",
    cursor: disabled || active ? "default" : "pointer",
    color: active ? "#fff" : "rgba(255,255,255,0.55)",
    transition: "color 200ms ease",
  });

  return (
    <div
      role="radiogroup"
      style={{
        position: "relative",
        display: "flex", padding: 2, borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.08)",
        opacity: disabled ? 0.5 : 1,
        width: "fit-content",
      }}
    >
      {/* Sliding thumb - matches the fixed option width exactly, so it lands
          flush under whichever option is active instead of drifting. */}
      {optionWidth != null && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 2, bottom: 2, left: 2,
            width: optionWidth,
            borderRadius: 999,
            backgroundColor: activeColor,
            boxShadow: "0 1px 2px rgba(0,0,0,0.25), 0 1px 1px rgba(0,0,0,0.15)",
            transform: checked ? "translateX(100%)" : "translateX(0)",
            transition: "transform 260ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      )}
      <button
        ref={offRef}
        type="button"
        role="radio"
        aria-checked={!checked}
        disabled={disabled}
        onClick={() => !disabled && checked && onChange(false)}
        style={optionStyle(!checked)}
      >
        {offLabel}
      </button>
      <button
        ref={onRef}
        type="button"
        role="radio"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && !checked && onChange(true)}
        style={optionStyle(checked)}
      >
        {onLabel}
      </button>
    </div>
  );
}
