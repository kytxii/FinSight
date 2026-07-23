import { getNow, getToday } from "./time";

export function periodLabel() {
  return getNow().toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function relativeDate(dateStr) {
  const today = getToday();
  if (dateStr === today) return "Today";
  const yesterday = new Date(today + "T00:00:00");
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === isoDate(yesterday)) return "Yesterday";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
