import { describe, it, expect } from "vitest";
import { balanceDelta, computeRunningBalance } from "./runningBalance";

const tx = (category, amount, date, extra = {}) => ({
  category,
  amount,
  transaction_date: date,
  ...extra,
});

describe("balanceDelta", () => {
  it("adds income categories", () => {
    expect(balanceDelta(tx("INCOME", "500", "2026-09-01"))).toBe(500);
    expect(balanceDelta(tx("REIMBURSEMENT", "20", "2026-09-01"))).toBe(20);
  });

  it("subtracts non-income categories", () => {
    expect(balanceDelta(tx("EXPENSE", "40", "2026-09-01"))).toBe(-40);
    expect(balanceDelta(tx("BILL", "100", "2026-09-01"))).toBe(-100);
  });

  it("never counts a TIPS transaction - cash reaches checking only via a deposit", () => {
    expect(balanceDelta(tx("TIPS", "150", "2026-09-01"))).toBe(0);
  });

  it("never counts a settled credit card charge - already counted via its payment (#54)", () => {
    expect(balanceDelta(tx("EXPENSE", "40", "2026-09-01", { credit_card_charge_id: "c1" }))).toBe(0);
  });

  it("never counts a cash-funded expense - the cash that paid it was never counted as income either (#151)", () => {
    expect(balanceDelta(tx("EXPENSE", "40", "2026-09-01", { paid_with_cash: true }))).toBe(0);
  });
});

describe("computeRunningBalance", () => {
  // Mirrors tests/test_tips_deposit.py's backend suite scenario-for-scenario.

  it("a tip never counts toward checking", () => {
    const anchor = { current_balance: "1000.00", as_of_date: "2026-09-01" };
    const transactions = [tx("TIPS", "150", "2026-09-05")];
    expect(computeRunningBalance(anchor, transactions, [], "2026-09-10")).toBe(1000);
  });

  it("a cash-funded expense never counts, but a normal bank-paid expense still does", () => {
    const anchor = { current_balance: "1000.00", as_of_date: "2026-09-01" };
    const transactions = [
      tx("EXPENSE", "40", "2026-09-05", { paid_with_cash: true }),
      tx("EXPENSE", "40", "2026-09-06"),
    ];
    expect(computeRunningBalance(anchor, transactions, [], "2026-09-10")).toBe(960);
  });

  it("a deposit adds to checking", () => {
    const anchor = { current_balance: "1000.00", as_of_date: "2026-09-01" };
    const deposits = [{ amount: "200.00", deposit_date: "2026-09-05" }];
    expect(computeRunningBalance(anchor, [], deposits, "2026-09-10")).toBe(1200);
  });

  it("does not double-count a transaction or deposit dated the same day as the anchor", () => {
    // The bug this guards against: demoStore.js used to filter with >=
    // instead of > on as_of_date, so anything dated the anchor's own day
    // got replayed on top of a balance that already included it.
    const anchor = { current_balance: "1000.00", as_of_date: "2026-09-05" };
    const deposits = [{ amount: "200.00", deposit_date: "2026-09-05" }];
    expect(computeRunningBalance(anchor, [], deposits, "2026-09-10")).toBe(1000);
  });

  it("does not let a future-dated transaction inflate the current balance", () => {
    const anchor = { current_balance: "1000.00", as_of_date: "2026-09-01" };
    const transactions = [tx("INCOME", "500", "2026-09-20")];
    expect(computeRunningBalance(anchor, transactions, [], "2026-09-10")).toBe(1000);
  });
});
