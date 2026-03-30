import { useTheme } from "../hooks/useTheme";

export default function SummaryCard({ label, value, activeColor }) {
  const dark = useTheme();

  const bg     = dark ? "var(--dark-surface)" : "var(--light-surface)";
  const border = dark ? "var(--dark-border)"  : "var(--light-border)";
  const text   = dark ? "var(--dark-text)"    : "var(--light-text)";

  return (
    <div className="rounded-2xl px-5 py-5 border" style={{ backgroundColor: bg, color: text, borderTopColor: activeColor, borderTopWidth: "3px", borderRightColor: border, borderBottomColor: border, borderLeftColor: border }}>
      <p className="text-base font-medium mb-1">{label}</p>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
