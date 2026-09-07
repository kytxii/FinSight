import { describe, it, expect } from "vitest";
import { computeCashOnHand } from "./cashOnHand";

const tip = (amount, date) => ({ category: "TIPS", amount, transaction_date: date });
const deposit = (amount, date) => ({ amount, deposit_date: date });

describe("computeCashOnHand", () => {
  // Mirrors tests/test_tips_deposit.py's backend suite one-for-one, so a
  // fix or regression on either side is guaranteed to be caught by the
  // other running the same scenario.

  it("is this month's tips earned, not net of deposits", () => {
    const transactions = [tip(150, "2026-09-05"), tip(100, "2026-09-12")];
    const deposits = [deposit(200, "2026-09-20")];

    const result = computeCashOnHand(transactions, deposits, "2026-09");

    expect(result.tips_earned).toBe("250.00");
    expect(result.tips_deposited).toBe("200.00");
    expect(result.cash_on_hand).toBe("250.00");
  });

  it("does not go negative when a prior month's undeposited cash is deposited this month", () => {
    const transactions = [tip(300, "2026-08-31"), tip(50, "2026-09-03")];
    const deposits = [deposit(300, "2026-09-15")];

    const result = computeCashOnHand(transactions, deposits, "2026-09");

    expect(result.tips_earned).toBe("50.00");
    expect(result.tips_deposited).toBe("300.00");
    expect(result.cash_on_hand).toBe("50.00");
  });

  it("is scoped to the given month, not all-time", () => {
    const transactions = [tip(80, "2026-08-15"), tip(150, "2026-09-05"), tip(100, "2026-09-12")];
    const deposits = [deposit(80, "2026-08-15"), deposit(200, "2026-09-20")];

    const thisMonth = computeCashOnHand(transactions, deposits, "2026-09");
    expect(thisMonth.tips_earned).toBe("250.00");
    expect(thisMonth.tips_deposited).toBe("200.00");
    expect(thisMonth.cash_on_hand).toBe("250.00");

    const lastMonth = computeCashOnHand(transactions, deposits, "2026-08");
    expect(lastMonth.tips_earned).toBe("80.00");
    expect(lastMonth.tips_deposited).toBe("80.00");
    expect(lastMonth.cash_on_hand).toBe("80.00");
  });

  it("ignores non-TIPS transactions", () => {
    const transactions = [tip(50, "2026-09-01"), { category: "EXPENSE", amount: 999, transaction_date: "2026-09-01" }];
    const result = computeCashOnHand(transactions, [], "2026-09");
    expect(result.tips_earned).toBe("50.00");
  });

  it("returns zeroes for a month with no tips or deposits", () => {
    const result = computeCashOnHand([], [], "2026-09");
    expect(result).toEqual({ cash_on_hand: "0.00", tips_earned: "0.00", tips_deposited: "0.00" });
  });
});
