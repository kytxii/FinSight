import { useState } from "react";
import { getNow } from "../../utils/time";

// Shared month-stepping state behind the "< September 2026 >" header used
// across MobileDashboard's Home tab, MobileCategory, and MobileAnalytics
// (#122/#196) - each page owns its own instance (Analytics' stays
// independent per #191), but all of them step/label months the same way.
export function useMonthPeriod() {
  const now = getNow();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [slideDir, setSlideDir] = useState(0);

  const periodKey = `${period.year}-${String(period.month + 1).padStart(2, "0")}`;
  const periodLabel = new Date(period.year, period.month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const isCurrentMonth = period.year === now.getFullYear() && period.month === now.getMonth();

  function shiftMonth(delta) {
    setSlideDir(delta);
    setPeriod((p) => {
      let month = p.month + delta;
      let year = p.year;
      if (month < 0) { month = 11; year -= 1; }
      else if (month > 11) { month = 0; year += 1; }
      return { year, month };
    });
  }

  function setMonth(month) {
    setSlideDir(0);
    setPeriod((p) => ({ ...p, month }));
  }

  function setYear(year) {
    setSlideDir(0);
    setPeriod((p) => ({ ...p, year }));
  }

  return { period, periodKey, periodLabel, isCurrentMonth, shiftMonth, setMonth, setYear, slideDir };
}

// Years selectable in the picker: current year down through the earliest
// transaction on record, so the list never offers a year with no data.
export function yearOptionsFromTransactions(transactions) {
  const now = getNow();
  let minYear = now.getFullYear();
  transactions.forEach((t) => {
    const y = parseInt(t.transaction_date.slice(0, 4), 10);
    if (y < minYear) minYear = y;
  });
  const years = [];
  for (let y = now.getFullYear(); y >= minYear; y--) years.push(y);
  return years;
}
