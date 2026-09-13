// Mirrors app/services/paycheck_service.py's _balance_delta / _get_running_balance.
// Single source of truth on the frontend for demo mode (#176).

export const PAYCHECK_INCOME_CATEGORIES = new Set(["INCOME", "REIMBURSEMENT", "TIPS"]);

// Signed contribution of a transaction to the checking running balance.
//
// Tips are cash on hand, not money in checking, so they never count here -
// cash reaches checking only via a deposit. Other income adds, expenses
// subtract.
//
// A settled credit card charge (t.credit_card_charge_id set) is also 0: it's
// a re-categorized breakdown of money that already left checking once, via
// its payment's own anchor transaction. Counting it again here would double
// the cash impact of a single real payment (#54).
//
// An expense paid_with_cash is also 0, for the same reason from the other
// direction: it's money that left cash-on-hand, not checking - and the cash
// tips that funded it were never counted as income here either (#131).
// Counting the expense side without the income side is exactly the
// asymmetry #151 fixes.
export function balanceDelta(t) {
  const amt = parseFloat(t.amount);
  if (t.category === "TIPS" || t.credit_card_charge_id || t.paid_with_cash) return 0;
  return PAYCHECK_INCOME_CATEGORIES.has(t.category) ? amt : -amt;
}

// anchor: { current_balance, as_of_date }. `today` is a "YYYY-MM-DD" string
// (the caller's notion of today - real or demo-pinned).
//
// Strictly after as_of_date - current_balance is treated as already
// inclusive of that day's activity (it's the real balance the user read off
// their bank), so replaying same-day transactions on top would double-count
// them. Bounded to today - an already-entered future-dated paycheck
// transaction must not inflate the *current* running balance.
export function computeRunningBalance(anchor, transactions, deposits, today) {
  const net = transactions
    .filter((t) => t.transaction_date > anchor.as_of_date && t.transaction_date <= today)
    .reduce((sum, t) => sum + balanceDelta(t), 0);

  // Cash deposits credit checking as transfers-in, over the same window.
  const depositTotal = deposits
    .filter((d) => d.deposit_date > anchor.as_of_date && d.deposit_date <= today)
    .reduce((sum, d) => sum + parseFloat(d.amount), 0);

  return parseFloat(anchor.current_balance) + net + depositTotal;
}
