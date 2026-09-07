// Mirrors app/services/paycheck_service.py. Single source of truth on the
// frontend for demo mode (#176). Covers the date math and pure aggregation
// paycheck_service.py uses to build safe-to-spend and estimated-savings -
// the top-level orchestration (which transactions/schedules to read, when to
// backfill) stays in demoStore.js since that's inherently storage-bound, not
// pure.

export function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function nextMonthStart(today) {
  const month = today.getMonth();
  const year = today.getFullYear();
  return month === 11 ? new Date(year + 1, 0, 1) : new Date(year, month + 1, 1);
}

// Adds months to a date, clamping the day if the target month is shorter
// (Jan 31 + 1 month -> Feb 28). Mirrors _add_months.
export function addMonthsClamped(base, months) {
  const year = base.getFullYear();
  const month = base.getMonth();
  const day = base.getDate();
  const targetIndex = month + months;
  const targetYear = year + Math.floor(targetIndex / 12);
  const targetMonth = ((targetIndex % 12) + 12) % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  return new Date(targetYear, targetMonth, Math.min(day, lastDay));
}

// Yields a schedule's pay dates going forward, indefinitely. SEMI_MONTHLY
// produces two dates 15 days apart per month, anchored to start_date's
// day-of-month. Mirrors _iter_pay_dates.
export function* iterPayDates(schedule) {
  const start = new Date(schedule.start_date + "T00:00:00");

  if (schedule.frequency === "WEEKLY" || schedule.frequency === "BIWEEKLY") {
    const stepDays = schedule.frequency === "WEEKLY" ? 7 : 14;
    let current = start;
    while (true) {
      yield current;
      current = new Date(current);
      current.setDate(current.getDate() + stepDays);
    }
  } else if (schedule.frequency === "MONTHLY") {
    let months = 0;
    while (true) {
      yield addMonthsClamped(start, months);
      months += 1;
    }
  } else if (schedule.frequency === "SEMI_MONTHLY") {
    let months = 0;
    while (true) {
      const anchor = addMonthsClamped(start, months);
      yield anchor;
      const second = new Date(anchor);
      second.setDate(second.getDate() + 15);
      yield second;
      months += 1;
    }
  }
}

export function generatePayDatesThrough(schedule, through) {
  const dates = [];
  for (const d of iterPayDates(schedule)) {
    dates.push(d);
    if (d > through) break;
  }
  return dates;
}

// Mirrors _next_occurrence.
export function nextOccurrence(dayOfMonth, fromDate) {
  const lastDay = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0).getDate();
  const candidate = new Date(fromDate.getFullYear(), fromDate.getMonth(), Math.min(dayOfMonth, lastDay));
  if (candidate >= fromDate) return candidate;

  const nextMonth = addMonthsClamped(new Date(fromDate.getFullYear(), fromDate.getMonth(), 1), 1);
  const nextLastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
  return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), Math.min(dayOfMonth, nextLastDay));
}

// Mirrors _average_recent_amounts - the schedule's `limit` most recent
// filled paychecks, averaged. Returns null with nothing to average.
export function averageRecentAmounts(scheduleId, allPaychecks, limit = 3) {
  const amounts = allPaychecks
    .filter((p) => p.schedule_id === scheduleId && p.amount != null)
    .sort((a, b) => b.pay_date.localeCompare(a.pay_date))
    .slice(0, limit)
    .map((p) => parseFloat(p.amount));
  if (amounts.length === 0) return null;
  return amounts.reduce((a, b) => a + b, 0) / amounts.length;
}

// Bills committed before `horizon`, as { total, items }. Mirrors
// _committed_items: fixed-date bills count when their next occurrence is
// on/before horizon; estimates with no fixed due date count in full
// (due_date null). Conservative - under-reporting surplus is safer than
// over-reporting it. Items sorted by due date, no-fixed-date estimates last.
export function committedItems(recurring, today, horizon) {
  let total = 0;
  const items = [];
  recurring.forEach((rp) => {
    if (rp.day_of_month == null) {
      total += parseFloat(rp.amount);
      items.push({
        name: rp.name,
        amount: parseFloat(rp.amount).toFixed(2),
        day_of_month: null,
        due_date: null,
        category: rp.category,
      });
    } else {
      const occurrence = nextOccurrence(rp.day_of_month, today);
      if (occurrence <= horizon) {
        total += parseFloat(rp.amount);
        items.push({
          name: rp.name,
          amount: parseFloat(rp.amount).toFixed(2),
          day_of_month: rp.day_of_month,
          due_date: toDateStr(occurrence),
          category: rp.category,
        });
      }
    }
  });
  items.sort(
    (a, b) =>
      (a.due_date == null) - (b.due_date == null) ||
      (a.due_date ?? "").localeCompare(b.due_date ?? ""),
  );
  return { total, items };
}

// The headline formula behind get_spendable_surplus, once the caller has
// gathered runningBalance/nextPaydayEstimate/billsBeforeNextPayday/reserve.
export function computeSpendableSurplus(runningBalance, nextPaydayEstimate, billsBeforeNextPayday, reserve) {
  const spendableSurplus = runningBalance + (nextPaydayEstimate ?? 0) - billsBeforeNextPayday;
  return { spendableSurplus, freeToAllocate: spendableSurplus - reserve };
}

// The headline formula behind get_estimated_savings, once the caller has
// gathered wholeMonthIncome/committedRecurring/discretionarySpentSoFar and
// the 3-month discretionary average. Blends real month-to-date spend with a
// projection for the days still ahead: discretionaryProjectedRemaining is
// whatever's left of the historical average once actual spend is netted out,
// floored at 0 - not a full remaining-days share of the average stacked on
// top of actual spend unconditionally, which double-billed a front-loaded
// month (#133). The final floor is 0, not savedSoFar (#130) - a negative
// ceiling means the month has no room to save, not that saving stops being
// possible.
export function computeEstimatedSavings(wholeMonthIncome, committedRecurring, discretionarySpentSoFar, monthlyDiscretionaryAvg) {
  const discretionaryProjectedRemaining = Math.max(monthlyDiscretionaryAvg - discretionarySpentSoFar, 0);
  const rawCeiling = wholeMonthIncome - committedRecurring - discretionarySpentSoFar - discretionaryProjectedRemaining;
  return {
    estimatedSavings: Math.max(rawCeiling, 0),
    discretionaryProjectedRemaining,
  };
}
