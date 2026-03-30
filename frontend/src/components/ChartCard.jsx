import { useTheme } from "../hooks/useTheme";

export default function ChartCard({ title, children, activeColor }) {
  const dark = useTheme();

  const bg = dark ? "var(--dark-surface)" : "var(--light-surface)";
  const text = dark ? "var(--dark-text)" : "var(--light-text)";

  return (
    <div
      className="rounded-2xl p-6 border"
      style={{ backgroundColor: bg, borderColor: activeColor, color: text }}
    >
      <h3 className="text-xl font-semibold mb-5">{title}</h3>
      {children}
    </div>
  );
}
