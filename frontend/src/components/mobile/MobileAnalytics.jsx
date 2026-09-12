import { useState, useMemo, useRef } from "react";
import MobileActivity from "./MobileActivity";
import MobileCategory from "./MobileCategory";
import MobileTips from "./MobileTips";
import MobilePageSlide from "./MobilePageSlide";
import MonthStepperHeader from "./shared/MonthStepperHeader";
import Skel from "../shared/Skel";
import { CATEGORY_CONFIG, MONEY_IN_TYPES, MONEY_OUT_TYPES, fmt } from "../../utils/finance";
import { useMonthPeriod, yearOptionsFromTransactions } from "../../hooks/mobile/useMonthPeriod";
import {
  HOME_TEXT, HOME_MUTED, HOME_SURFACE, HOME_DIVIDER, HOME_INCOME, HOME_EXPENSE, ACCENT,
  TILE_COLOR, CATEGORY_ICON, TIPS_DEPOSITED,
} from "../shared/categoryVisuals";
import { IconBank } from "../shared/TipsIcons";


const TREND_MONTHS = 6;

function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

// Trailing `n` months ending at (and including) anchorYear/anchorMonth - the
// selected period, not necessarily today (#152). JS Date normalizes a
// negative month index by rolling the year back, so this handles the
// anchor sitting in January (or earlier) correctly with no special-casing.
function lastMonths(n, anchorYear, anchorMonth) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(anchorYear, anchorMonth - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
    });
  }
  return out;
}

function SectionCard({ title, right, children }) {
  return (
    <div style={{ backgroundColor: HOME_SURFACE, borderRadius: 18, padding: "16px 16px 18px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: HOME_TEXT }}>{title}</p>
        {right}
      </div>
      {children}
    </div>
  );
}

function fmtShort(amount) {
  const rounded = Math.round(amount);
  if (Math.abs(rounded) >= 1000) {
    return `$${(rounded / 1000).toFixed(rounded % 1000 === 0 ? 0 : 1)}k`;
  }
  return `$${rounded}`;
}

function Empty() {
  return <p style={{ fontSize: 13, color: HOME_MUTED, textAlign: "center", padding: "18px 0" }}>Not enough data yet</p>;
}

// Loading placeholders shaped like the real chart, not the empty-state text.
function CategoryBreakdownSkel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[70, 55, 62, 40].map((w, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Skel w={34} h={34} style={{ borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <Skel w={`${w}%`} h={13} />
              <Skel w={40} h={13} />
            </div>
            <Skel w="100%" h={6} style={{ borderRadius: 999 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Mirrors the real bar charts: month columns, each with 1-2 bars and a label.
function TrendChartSkel({ bars = 1 }) {
  const heights = [55, 80, 40, 95, 65, 70];
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 6, height: 130 }}>
      {heights.map((h, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 3, width: "100%", justifyContent: "center" }}>
            {Array.from({ length: bars }).map((_, b) => (
              <Skel key={b} w={bars === 1 ? 14 : 8} h={`${h}%`} style={{ borderRadius: "3px 3px 0 0" }} />
            ))}
          </div>
          <Skel w={20} h={11} style={{ marginTop: 4 }} />
        </div>
      ))}
    </div>
  );
}

const CATEGORY_HISTORY_MONTHS = 6;

// Category Breakdown's own range presets (#102) - independent of the page's
// month stepper above it, which keeps stepping the anchor month either way;
// a preset just widens Category Breakdown (and its drill-through, #77) to a
// trailing window ending at that anchor instead of the anchor month alone.
const RANGE_PRESETS = [
  { months: 1, label: "1M" },
  { months: 3, label: "3M" },
  { months: 6, label: "6M" },
  { months: 12, label: "1Y" },
];

function formatRangeLabel(months, year, month) {
  if (months === 1) {
    return new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  const start = new Date(year, month - (months - 1), 1);
  const end = new Date(year, month, 1);
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString("en-US", { month: "short", year: sameYear ? undefined : "numeric" });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

function nextRangeMonths(current) {
  const idx = RANGE_PRESETS.findIndex((p) => p.months === current);
  return RANGE_PRESETS[(idx + 1) % RANGE_PRESETS.length].months;
}

// One button, not four - tapping anywhere on it cycles 1M -> 3M -> 6M -> 1Y
// -> 1M. The highlight is a single absolutely-positioned pill that slides
// between slots (same translateX(N * 100%) pattern as the bottom nav's
// active-tab indicator, MobileDashboard.jsx) rather than four independently
// colored segments, so switching reads as one thing moving, not four toggles.
function RangePresetToggle({ months, onCycle }) {
  const activeIndex = RANGE_PRESETS.findIndex((p) => p.months === months);
  const lastClickRef = useRef(0);

  // Rate-limited to the slide's own duration - a rapid double/triple tap
  // would otherwise queue several cycles faster than the highlight can
  // visibly slide between them.
  function handleClick() {
    const now = Date.now();
    if (now - lastClickRef.current < 240) return;
    lastClickRef.current = now;
    onCycle();
  }

  return (
    <button
      onClick={handleClick}
      aria-label={`Range: ${RANGE_PRESETS[activeIndex]?.label}. Tap to cycle.`}
      style={{
        position: "relative", display: "flex", padding: 3, borderRadius: 999, border: "none", cursor: "pointer",
        backgroundColor: "rgba(255,255,255,0.06)", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute", top: 3, bottom: 3, left: 3,
          width: `calc((100% - 6px) / ${RANGE_PRESETS.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
          transition: "transform 240ms cubic-bezier(0.32, 0.72, 0, 1)",
          borderRadius: 999, backgroundColor: ACCENT, boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
        }}
      />
      {RANGE_PRESETS.map((p, i) => (
        <span
          key={p.label}
          style={{
            position: "relative", zIndex: 1,
            padding: "5px 12px", borderRadius: 999,
            fontSize: 12, fontWeight: 700,
            color: i === activeIndex ? "#fff" : HOME_MUTED,
            transition: "color 200ms ease",
          }}
        >
          {p.label}
        </span>
      ))}
    </button>
  );
}

export default function MobileAnalytics({ transactions, deposits = [], loading, onEditTransaction, onDeleteTransaction, onEditDeposit, onDeleteDeposit, onOpenPaychecks, onRefresh, jump, onJumpHandled }) {
  const { period, periodKey, isCurrentMonth, shiftMonth, setMonth, setYear, goTo, slideDir } = useMonthPeriod();

  // Local drill-down (#77) - kept independent of MobileDashboard's own
  // categoryView rather than stretched across tabs, since that one assumes
  // the real current month while this tab's period can be any month.
  const [categoryView, setCategoryView] = useState(null);

  // MobileActivity is scoped to this period now (#191), so locating a
  // transaction elsewhere in its month has to move `period` there first.
  // Done during render (not in an effect) so the corrected period is what
  // MobileActivity actually mounts/re-renders with - an effect would land
  // one render late, after MobileActivity's own jump effect already ran
  // against the old, not-yet-matching period's transactions.
  const [handledJumpToken, setHandledJumpToken] = useState(null);
  if (jump && jump.token !== handledJumpToken) {
    const target = transactions.find((t) => t.id === jump.id);
    if (target) {
      const d = new Date(target.transaction_date + "T00:00:00");
      if (d.getFullYear() !== period.year || d.getMonth() !== period.month) {
        goTo(d.getFullYear(), d.getMonth());
      }
    }
    // A drill-down would otherwise keep rendering instead of the Activity
    // list the highlight/scroll below actually targets.
    if (categoryView) setCategoryView(null);
    setHandledJumpToken(jump.token);
  }

  const yearOptions = useMemo(() => yearOptionsFromTransactions(transactions), [transactions]);

  const monthStepper = useMemo(() => ({
    year: period.year,
    month: period.month,
    onShiftMonth: shiftMonth,
    onSelectMonth: setMonth,
    onSelectYear: setYear,
    isCurrentMonth,
    yearOptions,
    periodKey,
    slideDir,
  }), [period, shiftMonth, setMonth, setYear, isCurrentMonth, yearOptions, periodKey, slideDir]);

  // Category Breakdown's own range preset (#102) - defaults to just the
  // anchor month, same as before this issue.
  const [rangeMonths, setRangeMonths] = useState(1);
  const rangeMonthKeys = useMemo(
    () => new Set(lastMonths(rangeMonths, period.year, period.month).map((m) => m.key)),
    [rangeMonths, period],
  );
  const rangeLabel = useMemo(
    () => formatRangeLabel(rangeMonths, period.year, period.month),
    [rangeMonths, period],
  );

  // This period's transactions, and a rolling N-month history ending at it -
  // MobileCategory's own "vs Last Month" card and history bars, scoped to
  // whatever month is selected up here rather than always the current one.
  const periodTransactions = useMemo(
    () => transactions.filter((t) => monthKey(t.transaction_date) === periodKey),
    [transactions, periodKey],
  );
  // Also scopes MobileActivity's list to this period (#191) - it just
  // renders whatever transactions/deposits it's given, so filtering here
  // once replaces its own month-by-month infinite scroll. Deliberately the
  // single anchor month, not the Category Breakdown range above - Activity
  // is a different section and isn't part of #102's ask.
  const periodDepositsList = useMemo(
    () => deposits.filter((d) => monthKey(d.deposit_date) === periodKey),
    [deposits, periodKey],
  );
  // Category Breakdown's actual data source, and what a drill-through
  // (#77) shows when a multi-month preset is active - the whole range,
  // not just the anchor month, so the drilled total matches what was shown.
  const rangeTransactions = useMemo(
    () => transactions.filter((t) => rangeMonthKeys.has(monthKey(t.transaction_date))),
    [transactions, rangeMonthKeys],
  );
  const rangeDepositsTotal = useMemo(
    () => deposits.reduce((s, d) => (rangeMonthKeys.has(monthKey(d.deposit_date)) ? s + parseFloat(d.amount) : s), 0),
    [deposits, rangeMonthKeys],
  );
  const categoryHistory = useMemo(() => {
    const { year, month } = period;
    const buckets = [];
    for (let i = CATEGORY_HISTORY_MONTHS - 1; i >= 0; i--) {
      const monthStart = new Date(year, month - i, 1);
      const monthEnd = new Date(year, month - i + 1, 0, 23, 59, 59, 999);
      buckets.push(transactions.filter((t) => {
        const d = new Date(t.transaction_date + "T00:00:00");
        return d >= monthStart && d <= monthEnd;
      }));
    }
    return buckets;
  }, [transactions, period]);

  const categoryBreakdown = useMemo(() => {
    const totals = {};
    rangeTransactions.forEach((t) => {
      totals[t.category] = (totals[t.category] ?? 0) + parseFloat(t.amount);
    });
    const rows = Object.entries(totals).map(([category, total]) => ({ category, total }));
    // A deposit is cash tips *after* they're banked, not additional income on
    // top of them - folding it into TIPS double-counted the same money as
    // both "still cash" and "now in the bank" (#197). Shown as its own
    // synthetic row instead, same as desktop's separate "Tip deposits" line.
    if (rangeDepositsTotal) rows.push({ category: "DEPOSITS", total: rangeDepositsTotal });
    rows.sort((a, b) => b.total - a.total);
    const max = rows[0]?.total ?? 0;
    return { rows, max };
  }, [rangeTransactions, rangeDepositsTotal]);

  // Ends at the selected month, not today (#152) - was previously anchored
  // to getNow() with an empty dependency array, so navigating the month
  // picker never actually moved this window at all.
  const months = useMemo(
    () => lastMonths(TREND_MONTHS, period.year, period.month),
    [period.year, period.month],
  );

  const monthlyTotals = useMemo(() => {
    const byMonth = {};
    months.forEach((m) => { byMonth[m.key] = { income: 0, expense: 0, savings: 0 }; });
    transactions.forEach((t) => {
      const key = monthKey(t.transaction_date);
      const bucket = byMonth[key];
      if (!bucket) return; // outside the trend window
      const amt = parseFloat(t.amount);
      if (MONEY_IN_TYPES.has(t.category)) bucket.income += amt;
      else if (t.category === "SAVINGS") bucket.savings += amt;
      else if (MONEY_OUT_TYPES.has(t.category)) bucket.expense += amt;
    });
    deposits.forEach((d) => {
      const bucket = byMonth[monthKey(d.deposit_date)];
      if (bucket) bucket.income += parseFloat(d.amount);
    });
    return byMonth;
  }, [transactions, deposits, months]);

  const trendMax = useMemo(
    () => Math.max(1, ...months.map((m) => Math.max(monthlyTotals[m.key].income, monthlyTotals[m.key].expense))),
    [months, monthlyTotals],
  );

  const hasTrendData = months.some((m) => monthlyTotals[m.key].income > 0 || monthlyTotals[m.key].expense > 0);

  // Plain $ saved per month (#78) - no rate/ratio framing, so there's no
  // >100% case to fake an answer for. Just the measured amount.
  const savingsSummary = useMemo(
    () => months.map((m) => ({ ...m, amount: monthlyTotals[m.key]?.savings ?? 0 })),
    [months, monthlyTotals],
  );

  const hasSavingsData = savingsSummary.some((m) => m.amount > 0);
  const savingsMax = Math.max(1, ...savingsSummary.map((m) => m.amount));

  // Drill-down page/back transition, matching MobileDashboard's own
  // categoryView (#77 follow-up) - "activity" (the list) is the base page,
  // drilling into a category or Tips slides forward, backing out of either
  // slides back.
  const pageKey = categoryView === "TIPS" ? "tips" : categoryView ? `category:${categoryView}` : "activity";
  const pageOrder = categoryView ? 0.5 : 0;

  // Drill-down (#77): Tips routes to MobileTips, same as Home's categoryView
  // convention, since it's not a real transaction category page.
  const content = categoryView === "TIPS" ? (
    <MobileTips
      transactions={transactions}
      deposits={deposits}
      loading={loading}
      onBack={() => setCategoryView(null)}
      onEditTransaction={onEditTransaction}
      onDeleteTransaction={onDeleteTransaction}
      onRefresh={onRefresh}
    />
  ) : categoryView ? (
    <MobileCategory
      category={categoryView}
      transactions={rangeTransactions}
      monthlyHistory={categoryHistory}
      loading={loading}
      monthStepper={rangeMonths > 1 ? { ...monthStepper, rangeLabel } : monthStepper}
      onBack={() => setCategoryView(null)}
      onEditTransaction={onEditTransaction}
      onDeleteTransaction={onDeleteTransaction}
      onOpenPaychecks={onOpenPaychecks}
      onRefresh={onRefresh}
    />
  ) : (
    <>
      {/* Own instance of the shared stepper (#191: intentionally independent
          of MobileHome/MobileCategory's, unaffected by this extraction) */}
      <MonthStepperHeader
        variant="standalone"
        year={period.year}
        month={period.month}
        onShiftMonth={shiftMonth}
        onSelectMonth={setMonth}
        onSelectYear={setYear}
        isCurrentMonth={isCurrentMonth}
        yearOptions={yearOptions}
      />

      <div
        key={`category-${periodKey}`}
        style={{
          animation: slideDir ? "mob-month-slide 260ms ease" : undefined,
          "--mob-slide-from": slideDir > 0 ? "24px" : "-24px",
        }}
      >
      <style>{`@keyframes mob-month-slide {
        from { opacity: 0; transform: translateX(var(--mob-slide-from, 0)); }
        to   { opacity: 1; transform: translateX(0); }
      }`}</style>
      <SectionCard title="Category Breakdown" right={<RangePresetToggle months={rangeMonths} onCycle={() => setRangeMonths(nextRangeMonths)} />}>
        {loading ? (
          <CategoryBreakdownSkel />
        ) : categoryBreakdown.rows.length === 0 ? (
          <p style={{ fontSize: 13, color: HOME_MUTED, textAlign: "center", padding: "10px 0" }}>No transactions in {rangeLabel}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {categoryBreakdown.rows.map(({ category, total }) => {
              // DEPOSITS is synthetic - not a real transaction category (#197) -
              // so it isn't in CATEGORY_ICON/TILE_COLOR/CATEGORY_CONFIG and gets
              // its own visuals, but drills into the same Tips page as TIPS.
              const isDeposits = category === "DEPOSITS";
              const Icon = CATEGORY_ICON[category];
              const color = isDeposits ? TIPS_DEPOSITED : (TILE_COLOR[category] ?? HOME_MUTED);
              const label = isDeposits ? "Deposits" : (CATEGORY_CONFIG[category]?.label ?? category);
              const pct = categoryBreakdown.max > 0 ? (total / categoryBreakdown.max) * 100 : 0;
              return (
                <div
                  key={category}
                  onClick={() => setCategoryView(isDeposits ? "TIPS" : category)}
                  style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                >
                  <div style={{
                    flex: "0 0 auto", width: 34, height: 34, borderRadius: "50%",
                    background: isDeposits ? "transparent" : color,
                    border: isDeposits ? `1.5px solid ${TIPS_DEPOSITED}` : "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: isDeposits ? "none" : "inset 0 1px 0 rgba(255,255,255,0.16)",
                  }}>
                    {/* Same "deposited" tile treatment as MobileTips.jsx: a
                        transparent/bordered circle with a TIPS_DEPOSITED-colored
                        IconBank, not a solid fill. */}
                    {isDeposits ? <IconBank color={TIPS_DEPOSITED} size={16} /> : (Icon && <Icon />)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: HOME_TEXT }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: HOME_TEXT, fontVariantNumeric: "tabular-nums" }}>{fmt(total)}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, backgroundColor: HOME_DIVIDER, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, backgroundColor: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
      </div>

      <div key={`income-expense-${periodKey}`} style={{ animation: slideDir ? "mob-month-slide 260ms ease" : undefined, "--mob-slide-from": slideDir > 0 ? "24px" : "-24px" }}>
      <SectionCard title="Income vs. Expense">
        {loading ? (
          <TrendChartSkel bars={2} />
        ) : !hasTrendData ? (
          <Empty />
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 6, height: 130 }}>
              {months.map((m) => {
                const { income, expense } = monthlyTotals[m.key];
                const incomeH = Math.max(2, (income / trendMax) * 100);
                const expenseH = Math.max(2, (expense / trendMax) * 100);
                return (
                  <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 3, width: "100%", justifyContent: "center" }}>
                      <div title={fmt(income)} style={{ width: 8, height: `${incomeH}%`, borderRadius: "3px 3px 0 0", backgroundColor: HOME_INCOME }} />
                      <div title={fmt(expense)} style={{ width: 8, height: `${expenseH}%`, borderRadius: "3px 3px 0 0", backgroundColor: HOME_EXPENSE }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: HOME_MUTED, marginTop: 4 }}>{m.label}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 14 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: HOME_MUTED }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: HOME_INCOME }} /> Income
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: HOME_MUTED }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: HOME_EXPENSE }} /> Expense
              </span>
            </div>
          </>
        )}
      </SectionCard>
      </div>

      <div key={`savings-${periodKey}`} style={{ animation: slideDir ? "mob-month-slide 260ms ease" : undefined, "--mob-slide-from": slideDir > 0 ? "24px" : "-24px" }}>
      <SectionCard title="Savings">
        {loading ? (
          <TrendChartSkel bars={1} />
        ) : !hasSavingsData ? (
          <Empty />
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 6, height: 110 }}>
            {savingsSummary.map((m) => {
              const h = Math.max(2, (m.amount / savingsMax) * 100);
              return (
                <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%", justifyContent: "center" }}>
                    <div title={fmt(m.amount)} style={{ width: 14, height: `${h}%`, borderRadius: "3px 3px 0 0", backgroundColor: TILE_COLOR.SAVINGS }} />
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 11.5, fontWeight: 700, color: HOME_TEXT }}>{fmtShort(m.amount)}</p>
                  <span style={{ fontSize: 11, fontWeight: 600, color: HOME_MUTED, marginTop: 1 }}>{m.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
      </div>

      <MobileActivity
        transactions={periodTransactions}
        deposits={periodDepositsList}
        periodKey={periodKey}
        loading={loading}
        onEditTransaction={onEditTransaction}
        onDeleteTransaction={onDeleteTransaction}
        onEditDeposit={onEditDeposit}
        onDeleteDeposit={onDeleteDeposit}
        jump={jump}
        onJumpHandled={onJumpHandled}
      />
    </>
  );

  return (
    <MobilePageSlide pageKey={pageKey} order={pageOrder} layerClassName="space-y-4">
      {content}
    </MobilePageSlide>
  );
}
