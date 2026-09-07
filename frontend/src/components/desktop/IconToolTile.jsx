// Rounded dark tile wrapping a Tools-sidebar icon (#177).
export default function IconToolTile({ children }) {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: 9,
        flexShrink: 0,
        background: "#2a2a2e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#c7c7cc"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </div>
  );
}
