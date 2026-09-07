import { describe, it, expect } from "vitest";
import {
  toDateStr,
  nextMonthStart,
  addMonthsClamped,
  iterPayDates,
  generatePayDatesThrough,
  nextOccurrence,
  averageRecentAmounts,
  committedItems,
  computeSpendableSurplus,
  computeEstimatedSavings,
} from "./paycheckMath";

describe("toDateStr", () => {
  it("formats as YYYY-MM-DD, zero-padded", () => {
    expect(toDateStr(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toDateStr(new Date(2026, 11, 25))).toBe("2026-12-25");
  });
});

describe("nextMonthStart", () => {
  it("returns the 1st of next month", () => {
    expect(toDateStr(nextMonthStart(new Date(2026, 5, 15)))).toBe("2026-07-01");
  });

  it("rolls over into the next year in December", () => {
    expect(toDateStr(nextMonthStart(new Date(2026, 11, 15)))).toBe("2027-01-01");
  });
});

describe("addMonthsClamped", () => {
  it("adds months normally", () => {
    expect(toDateStr(addMonthsClamped(new Date(2026, 0, 15), 2))).toBe("2026-03-15");
  });

  it("clamps the day when the target month is shorter (Jan 31 + 1 month)", () => {
    expect(toDateStr(addMonthsClamped(new Date(2026, 0, 31), 1))).toBe("2026-02-28");
  });

  it("goes backward for negative months", () => {
    expect(toDateStr(addMonthsClamped(new Date(2026, 2, 1), -3))).toBe("2025-12-01");
  });
});

describe("iterPayDates / generatePayDatesThrough", () => {
  it("generates weekly pay dates 7 days apart", () => {
    const schedule = { frequency: "WEEKLY", start_date: "2026-09-04" };
    const dates = generatePayDatesThrough(schedule, new Date(2026, 8, 25)).map(toDateStr);
    expect(dates).toEqual(["2026-09-04", "2026-09-11", "2026-09-18", "2026-09-25", "2026-10-02"]);
  });

  it("generates monthly pay dates anchored to the start day, clamped in short months", () => {
    const schedule = { frequency: "MONTHLY", start_date: "2026-01-31" };
    const dates = generatePayDatesThrough(schedule, new Date(2026, 3, 1)).map(toDateStr);
    expect(dates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("generates semi-monthly pay dates 15 days apart within each month", () => {
    const schedule = { frequency: "SEMI_MONTHLY", start_date: "2026-09-01" };
    const dates = generatePayDatesThrough(schedule, new Date(2026, 9, 1)).map(toDateStr);
    expect(dates).toEqual(["2026-09-01", "2026-09-16", "2026-10-01", "2026-10-16"]);
  });

  it("stops as soon as a date passes the horizon, one date past it", () => {
    const schedule = { frequency: "WEEKLY", start_date: "2026-09-04" };
    const dates = generatePayDatesThrough(schedule, new Date(2026, 8, 10));
    expect(dates.at(-1) > new Date(2026, 8, 10)).toBe(true);
    expect(dates.at(-2) <= new Date(2026, 8, 10)).toBe(true);
  });

  it("iterPayDates is a true generator - can be taken lazily without a horizon", () => {
    const schedule = { frequency: "BIWEEKLY", start_date: "2026-01-01" };
    const it_ = iterPayDates(schedule);
    expect(toDateStr(it_.next().value)).toBe("2026-01-01");
    expect(toDateStr(it_.next().value)).toBe("2026-01-15");
    expect(toDateStr(it_.next().value)).toBe("2026-01-29");
  });
});

describe("nextOccurrence", () => {
  it("returns this month's occurrence when it hasn't passed yet", () => {
    expect(toDateStr(nextOccurrence(20, new Date(2026, 8, 5)))).toBe("2026-09-20");
  });

  it("rolls to next month once the day has passed", () => {
    expect(toDateStr(nextOccurrence(5, new Date(2026, 8, 20)))).toBe("2026-10-05");
  });

  it("treats the day itself as not yet passed (>=, not >)", () => {
    expect(toDateStr(nextOccurrence(20, new Date(2026, 8, 20)))).toBe("2026-09-20");
  });

  it("clamps to the last day of a short month", () => {
    expect(toDateStr(nextOccurrence(31, new Date(2026, 1, 5)))).toBe("2026-02-28");
  });
});

describe("averageRecentAmounts", () => {
  const paychecks = [
    { schedule_id: "s1", pay_date: "2026-07-01", amount: "1000" },
    { schedule_id: "s1", pay_date: "2026-08-01", amount: "1100" },
    { schedule_id: "s1", pay_date: "2026-09-01", amount: "1200" },
    { schedule_id: "s1", pay_date: "2026-06-01", amount: "900" }, // outside the limit-3 window
    { schedule_id: "s2", pay_date: "2026-09-01", amount: "500" },
    { schedule_id: "s1", pay_date: "2026-10-01", amount: null }, // unfilled - excluded
  ];

  it("averages the most recent `limit` filled paychecks for that schedule", () => {
    expect(averageRecentAmounts("s1", paychecks)).toBeCloseTo(1100); // (1200+1100+1000)/3
  });

  it("returns null when a schedule has no filled paychecks yet", () => {
    expect(averageRecentAmounts("s3", paychecks)).toBeNull();
  });
});

describe("committedItems", () => {
  it("includes a fixed-date bill only when its next occurrence is on/before the horizon", () => {
    const recurring = [
      { name: "Rent", amount: "1500", day_of_month: 20, category: "BILL" },
      { name: "Gym", amount: "40", day_of_month: 28, category: "SUBSCRIPTION" },
    ];
    const today = new Date(2026, 8, 5);
    const horizon = new Date(2026, 8, 25); // covers Rent's 20th, not Gym's 28th
    const { total, items } = committedItems(recurring, today, horizon);
    expect(total).toBe(1500);
    expect(items.map((i) => i.name)).toEqual(["Rent"]);
  });

  it("always includes a no-fixed-date estimate in full", () => {
    const recurring = [{ name: "Groceries estimate", amount: "300", day_of_month: null, category: "EXPENSE" }];
    const { total, items } = committedItems(recurring, new Date(2026, 8, 5), new Date(2026, 8, 6));
    expect(total).toBe(300);
    expect(items[0].due_date).toBeNull();
  });

  it("sorts dated items by due date, with no-fixed-date estimates last", () => {
    const recurring = [
      { name: "Estimate", amount: "50", day_of_month: null, category: "EXPENSE" },
      { name: "Late bill", amount: "20", day_of_month: 25, category: "BILL" },
      { name: "Early bill", amount: "10", day_of_month: 6, category: "BILL" },
    ];
    const { items } = committedItems(recurring, new Date(2026, 8, 5), new Date(2026, 8, 30));
    expect(items.map((i) => i.name)).toEqual(["Early bill", "Late bill", "Estimate"]);
  });
});

describe("computeSpendableSurplus", () => {
  it("running balance plus the next paycheck estimate, minus bills due before then", () => {
    const { spendableSurplus, freeToAllocate } = computeSpendableSurplus(1000, 1200, 400, 100);
    expect(spendableSurplus).toBe(1800);
    expect(freeToAllocate).toBe(1700);
  });

  it("treats a null next-payday estimate as 0, not NaN", () => {
    const { spendableSurplus } = computeSpendableSurplus(1000, null, 400, 0);
    expect(spendableSurplus).toBe(600);
  });
});

describe("computeEstimatedSavings", () => {
  it("income minus committed bills minus discretionary spend (actual + projected remainder)", () => {
    // avg 600, spent 200 so far -> 400 projected remaining
    const { estimatedSavings, discretionaryProjectedRemaining } = computeEstimatedSavings(3000, 1000, 200, 600);
    expect(discretionaryProjectedRemaining).toBe(400);
    expect(estimatedSavings).toBe(3000 - 1000 - 200 - 400); // 1400
  });

  it("does not double-bill a front-loaded month - spend already over the average projects nothing further (#133)", () => {
    const { estimatedSavings, discretionaryProjectedRemaining } = computeEstimatedSavings(3000, 1000, 700, 600);
    expect(discretionaryProjectedRemaining).toBe(0); // spent more than the average already
    expect(estimatedSavings).toBe(3000 - 1000 - 700 - 0); // 1300, not 900
  });

  it("floors at 0 rather than going negative (#130 - not clamped to savedSoFar)", () => {
    const { estimatedSavings } = computeEstimatedSavings(500, 1000, 200, 300);
    expect(estimatedSavings).toBe(0);
  });
});
