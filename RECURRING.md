# Recurring Tables Consolidation

**Status:** Supersedes the `recurring_expenses` section of `finsight_paycheck_feature.md`.

**Decision:** Do **not** create the `recurring_expenses` table. Extend the existing `recurring_payments` table instead.

---

## Why

The paycheck spec proposed a new `recurring_expenses` table for the spendable surplus calculation, alongside the existing `recurring_payments` table used for transaction categorization. These describe the same real-world objects — rent is a recurring payment _and_ a committed expense.

**Dual entry is the killer argument.** Two tables means entering rent twice, and updating it twice when it changes. Miss one and the surplus math silently lies — the exact failure mode the feature exists to prevent.

The `recurring_expenses` design was also written greenfield, without the existing table in view:

|           | `recurring_payments` (existing) | `recurring_expenses` (proposed) |
| --------- | ------------------------------- | ------------------------------- |
| PK        | UUID                            | `SERIAL`                        |
| Ownership | `created_by` / `updated_by`     | `user_id`                       |
| Category  | `Category` enum                 | free-text `VARCHAR(50)`         |

Those aren't intentional choices — they're artifacts of the spec not knowing what already existed. Adopting them would put two identity conventions in one schema.

---

## Migration — three additive changes

```sql
ALTER TABLE recurring_payments ADD COLUMN is_estimate BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE recurring_payments ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE recurring_payments ALTER COLUMN day_of_month DROP NOT NULL;
```

All additive or relaxing. No data loss, no backfill required.

Note: this is separate from the `day_of_month` cap fix (`le=28` → `le=31`) documented in `recurring_rework.md`. Both can land in the same migration.

### Why each column

**`is_estimate`** — for variable items like a $400/mo grocery estimate. Also doubles as a guard in the transaction generator: estimate rows must **not** generate ledger transactions. You want groceries counted against surplus without a fake $400 transaction appearing in the ledger.

**`active`** — currently only hard delete exists. Since `transactions.recurring_payment_id` links back, deleting risks orphaning or cascade-deleting transaction history. Soft-deactivate is safer and allows pausing a subscription without losing the past.

**`day_of_month` nullable** — only needed for `is_estimate` rows with no real due date.

---

## SQLAlchemy model changes

```python
class RecurringPayment(Base):
    __tablename__ = "recurring_payments"

    # ... existing columns unchanged ...

    # Before
    day_of_month: Mapped[int]

    # After
    day_of_month: Mapped[Optional[int]]  # NULL only when is_estimate = True

    # New
    is_estimate: Mapped[bool] = mapped_column(default=False)
    active: Mapped[bool] = mapped_column(default=True)
```

---

## Pydantic schema changes

```python
class RecurringPaymentBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    amount: Decimal
    day_of_month: int | None = Field(default=None, ge=1, le=31)  # was: int, ge=1, le=28
    category: Category
    is_estimate: bool = False   # new
    active: bool = True         # new
```

```python
class UpdateRecurringPayment(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    amount: Decimal | None = None
    day_of_month: int | None = Field(default=None, ge=1, le=31)  # was le=28
    category: Category | None = None
    is_estimate: bool | None = None   # new
    active: bool | None = None        # new
```

**Add a validator:** `day_of_month` may only be NULL when `is_estimate = True`. A non-estimate recurring payment must have a due day.

```python
from pydantic import model_validator

@model_validator(mode="after")
def check_day_required_for_non_estimates(self):
    if not self.is_estimate and self.day_of_month is None:
        raise ValueError("day_of_month is required unless is_estimate is True")
    return self
```

---

## Surplus calculation

Replaces the `recurring_expenses` query in the paycheck spec.

```python
# Committed expenses before next paycheck
#   - exclude REIMBURSEMENT (that's income owed to you, not committed spend)
#   - exclude inactive rows
#   - include is_estimate rows (expected spend, not guaranteed — still counts)
committed = SUM(amount) WHERE
    category != Category.REIMBURSEMENT
    AND active = TRUE
    AND day_of_month falls in [today, next_paycheck_date)

# Expected income before next paycheck — surfaced separately, NOT netted into surplus
expected_income = SUM(amount) WHERE
    category == Category.REIMBURSEMENT
    AND active = TRUE
    AND day_of_month falls in [today, next_paycheck_date)

spendable_surplus = current_balance - committed
```

Reimbursements are deliberately **not** subtracted from or added to the surplus. They're money owed to you on a soft timeline — a late reimbursement doesn't overdraft you. Show it as a separate line ("$175 expected before your next check") rather than inflating spendable surplus with money that may not arrive.

### Open decision — NULL `day_of_month` estimates

An estimate with no due day has no natural place in a date window. Two options:

1. **Conservative (recommended to start):** count the full amount in any window it's evaluated against.
2. **Pro-rated:** scale by `days_in_window / days_in_month`.

Start conservative. Under-reporting surplus is a much friendlier error than over-reporting it.

---

## Transaction generator guard

Wherever recurring payments are applied to generate transactions (the real backend equivalent of `applyRecurringPayments` in `demoStore.js`), add:

```python
if rp.is_estimate:
    continue  # estimates inform surplus math only — never generate ledger transactions

if not rp.active:
    continue  # deactivated rows stop generating, history preserved
```

The existing `Math.min(rp.day_of_month, maxDay)` clamp stays — it's what makes storing days 29–31 safe.

---

## Delete → deactivate

`DELETE /recurring-payments/{id}` should soft-deactivate (`active = FALSE`) rather than hard delete, to preserve `transactions.recurring_payment_id` references.

Frontend impact: the existing delete button and its row-sweep animation stay as-is — only the backend behavior changes. Rows with `active = FALSE` are filtered out of the list response by default.

---

## Frontend impact

Builds on the three-tab modal from `recurring_rework.md`.

- **`is_estimate` toggle** — per-row control, most relevant on the Bills tab. Estimate rows render their amount differently (e.g. `~$400` in muted text) so it's obvious at a glance which numbers are real and which are guesses.
- **`day_of_month` cell** — when `is_estimate = True` and the day is NULL, display "monthly" or "—" instead of "every 15th".
- **`isDraftValid`** — relax so `day_of_month` is optional when `is_estimate` is true:

```js
function isDraftValid(d) {
  return (
    d.name.trim() !== "" &&
    parseFloat(d.amount) > 0 &&
    (d.is_estimate ||
      (parseInt(d.day_of_month, 10) >= 1 && parseInt(d.day_of_month, 10) <= 31))
  );
}
```

- **Reimbursements tab** — unaffected by `is_estimate`; hide the toggle there.

---

## Unresolved — decide before implementing paycheck tables

The `paychecks` and `paycheck_schedule` tables in `finsight_paycheck_feature.md` also use `SERIAL` PKs + `user_id`, while `recurring_payments` uses UUID + `created_by`/`updated_by`.

**Pick one convention and apply it to the new paycheck tables**, or the schema ends up with two identity styles and awkward joins. Recommendation: match the existing UUID + `created_by`/`updated_by` pattern.

---

## Checklist

- [ ] Migration: add `is_estimate`, add `active`, drop NOT NULL on `day_of_month`
- [ ] Migration: relax `day_of_month` cap 28 → 31 (per `recurring_rework.md`)
- [ ] SQLAlchemy model: add two columns, make `day_of_month` Optional
- [ ] Pydantic: add fields + `model_validator` for the estimate/day rule
- [ ] Transaction generator: skip `is_estimate` and `active = FALSE` rows
- [ ] List endpoint: filter `active = FALSE` by default
- [ ] DELETE endpoint: soft-deactivate instead of hard delete
- [ ] Surplus service: exclude REIMBURSEMENT from committed, return as separate `expected_income` field
- [ ] `SpendableSurplusResponse`: add `expected_income` field
- [ ] Do **not** create `recurring_expenses`
- [ ] Decide paycheck table PK convention before generating that migration
