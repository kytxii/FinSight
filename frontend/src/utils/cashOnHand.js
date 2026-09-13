// Mirrors app/services/tip_deposit_service.py's get_cash_on_hand. Single
// source of truth on the frontend for demo mode, same pattern as
// installmentMath.js (#176).
//
// cash_on_hand is this month's earned cash tips, not earned minus deposited:
// a deposit isn't tied to the month its cash was earned, so netting the two
// would go negative whenever a prior month's undeposited cash gets deposited
// this month. Scoped to a calendar month rather than all-time, since it's
// shown alongside other per-month Tips figures (#157).

// `period` is a "YYYY-MM" string (the caller resolves which month - "this
// month" by default, or a specific year/month) - kept as a string rather
// than a Date so this matches how transaction_date/deposit_date are already
// stored (ISO date strings), with no parsing/timezone surface to get wrong.
export function computeCashOnHand(transactions, deposits, period) {
  const tipsEarned = transactions
    .filter((t) => t.category === "TIPS" && t.transaction_date.slice(0, 7) === period)
    .reduce((s, t) => s + parseFloat(t.amount), 0);
  const tipsDeposited = deposits
    .filter((d) => d.deposit_date.slice(0, 7) === period)
    .reduce((s, d) => s + parseFloat(d.amount), 0);

  return {
    cash_on_hand: tipsEarned.toFixed(2),
    tips_earned: tipsEarned.toFixed(2),
    tips_deposited: tipsDeposited.toFixed(2),
  };
}
