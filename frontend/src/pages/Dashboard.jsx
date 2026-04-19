import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { getTransactions, deleteTransaction } from "../api/transactions";
import { deleteRecurringPayment } from "../api/recurringPayments";
import {
  CATEGORIES,
  CATEGORY_CONFIG,
  INCOME_TYPES,
  fmt,
} from "../utils/finance";
import Navbar from "../components/Navbar";
import CategoryTabs from "../components/CategoryTabs";
import DateRangeFilter from "../components/DateRangeFilter";
import SummaryCard from "../components/SummaryCard";
import ChartCard from "../components/ChartCard";
import TransactionTable from "../components/TransactionTable";
import AddTransactionModal from "../components/AddTransactionModal";
import EditTransactionModal from "../components/EditTransactionModal";
import Footer from "../components/Footer";
import RenderWakeButton from "../components/RenderWakeButton";

export default function Dashboard() {
  const dark = useTheme();
  const { isDemo } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [highlightId, setHighlightId] = useState(null);
  const tableRef = useRef(null);
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setMonth(to.getMonth() + 1, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  });

  useEffect(() => {
    getTransactions().then((res) => setTransactions(res.data));
  }, []);

  function refreshTransactions() {
    getTransactions().then((res) => setTransactions(res.data));
  }

  async function handleDelete(t) {
    if (t.recurring_payment_id) {
      await deleteRecurringPayment(t.recurring_payment_id);
      setTransactions((prev) =>
        prev.filter((tx) => tx.recurring_payment_id !== t.recurring_payment_id),
      );
    } else {
      await deleteTransaction(t.id);
      setTransactions((prev) => prev.filter((tx) => tx.id !== t.id));
    }
  }

  const handleSelectTransaction = useCallback(
    (t) => {
      setActiveTab("ALL");
      setDateRange({ from: null, to: null });
      const allSorted = [...transactions].sort(
        (a, b) => new Date(b.transaction_date) - new Date(a.transaction_date),
      );
      const idx = allSorted.findIndex((tx) => tx.id === t.id);
      if (idx !== -1) setPage(Math.ceil((idx + 1) / perPage));
      setHighlightId(t.id);
      setTimeout(() => setHighlightId(null), 2500);
      setTimeout(
        () =>
          tableRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        50,
      );
    },
    [transactions, perPage],
  );

  const filtered = useMemo(() => {
    let result =
      activeTab === "ALL"
        ? transactions
        : transactions.filter((t) => t.category === activeTab);

    if (dateRange.from || dateRange.to) {
      result = result.filter((t) => {
        const date = new Date(t.transaction_date + "T00:00:00");
        if (dateRange.from && date < dateRange.from) return false;
        if (dateRange.to && date > dateRange.to) return false;
        return true;
      });
    }

    return result;
  }, [transactions, activeTab, dateRange]);

  const summary = useMemo(() => {
    const totalIn = filtered
      .filter((t) => INCOME_TYPES.has(t.category))
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalOut = filtered
      .filter((t) => !INCOME_TYPES.has(t.category))
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const savingsRate =
      totalIn > 0 ? ((totalIn - totalOut) / totalIn) * 100 : null;

    // Avg daily spend
    let days = 1;
    if (dateRange.from && dateRange.to) {
      days = Math.max(
        1,
        Math.round((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24)),
      );
    } else if (filtered.length > 0) {
      const timestamps = filtered.map((t) =>
        new Date(t.transaction_date).getTime(),
      );
      days = Math.max(
        1,
        Math.round(
          (Math.max(...timestamps) - Math.min(...timestamps)) /
            (1000 * 60 * 60 * 24),
        ) + 1,
      );
    }
    const avgDailySpend = totalOut / days;
    const refDate = dateRange.from ?? new Date();
    const daysInMonth = new Date(
      refDate.getFullYear(),
      refDate.getMonth() + 1,
      0,
    ).getDate();
    const projectedMonthlySpend = avgDailySpend * daysInMonth;

    // Previous period savings rate delta
    let savingsRateDelta = null;
    if (dateRange.from) {
      const periodMs =
        (dateRange.to ?? new Date()).getTime() - dateRange.from.getTime();
      const prevFrom = new Date(dateRange.from.getTime() - periodMs);
      const prevTo = dateRange.from;
      const prevFiltered = transactions
        .filter((t) => activeTab === "ALL" || t.category === activeTab)
        .filter((t) => {
          const d = new Date(t.transaction_date + "T00:00:00");
          return d >= prevFrom && d < prevTo;
        });
      const prevIn = prevFiltered
        .filter((t) => INCOME_TYPES.has(t.category))
        .reduce((s, t) => s + parseFloat(t.amount), 0);
      const prevOut = prevFiltered
        .filter((t) => !INCOME_TYPES.has(t.category))
        .reduce((s, t) => s + parseFloat(t.amount), 0);
      if (prevIn > 0 && savingsRate !== null) {
        savingsRateDelta = savingsRate - ((prevIn - prevOut) / prevIn) * 100;
      }
    }

    let projectedMonthlySpendDelta = null;
    if (dateRange.from) {
      const periodMs =
        (dateRange.to ?? new Date()).getTime() - dateRange.from.getTime();
      const prevFrom = new Date(dateRange.from.getTime() - periodMs);
      const prevTo = dateRange.from;
      const prevTotalOut = transactions
        .filter((t) => activeTab === "ALL" || t.category === activeTab)
        .filter((t) => {
          const d = new Date(t.transaction_date + "T00:00:00");
          return d >= prevFrom && d < prevTo;
        })
        .filter((t) => !INCOME_TYPES.has(t.category))
        .reduce((s, t) => s + parseFloat(t.amount), 0);
      projectedMonthlySpendDelta =
        projectedMonthlySpend - (prevTotalOut / days) * daysInMonth;
    }

    // Category-specific metrics (non-ALL tabs)
    const categoryTotal = totalIn + totalOut;
    let categoryDelta = null;
    let pctOfTotal = null;
    if (activeTab !== "ALL") {
      const isIncomeCategory = INCOME_TYPES.has(activeTab);
      const allPeriodTotal = transactions
        .filter((t) => {
          if (!dateRange.from && !dateRange.to) return true;
          const d = new Date(t.transaction_date + "T00:00:00");
          if (dateRange.from && d < dateRange.from) return false;
          if (dateRange.to && d > dateRange.to) return false;
          return true;
        })
        .filter((t) =>
          isIncomeCategory
            ? INCOME_TYPES.has(t.category)
            : !INCOME_TYPES.has(t.category),
        )
        .reduce((s, t) => s + parseFloat(t.amount), 0);
      if (allPeriodTotal > 0)
        pctOfTotal = (categoryTotal / allPeriodTotal) * 100;

      if (dateRange.from) {
        const periodMs =
          (dateRange.to ?? new Date()).getTime() - dateRange.from.getTime();
        const prevFrom = new Date(dateRange.from.getTime() - periodMs);
        const prevTo = dateRange.from;
        const prevTotal = transactions
          .filter((t) => t.category === activeTab)
          .filter((t) => {
            const d = new Date(t.transaction_date + "T00:00:00");
            return d >= prevFrom && d < prevTo;
          })
          .reduce((s, t) => s + parseFloat(t.amount), 0);
        if (prevTotal > 0)
          categoryDelta = ((categoryTotal - prevTotal) / prevTotal) * 100;
      }
    }

    const txCount = filtered.length;
    const avgTx = txCount > 0 ? categoryTotal / txCount : 0;

    return {
      totalIn,
      totalOut,
      savingsRate,
      savingsRateDelta,
      projectedMonthlySpend,
      projectedMonthlySpendDelta,
      categoryTotal,
      txCount,
      avgTx,
      pctOfTotal,
      categoryDelta,
    };
  }, [filtered, transactions, activeTab, dateRange]);

  const pieData = useMemo(() => {
    if (activeTab !== "ALL") {
      const grouped = {};
      filtered.forEach((t) => {
        grouped[t.name] = (grouped[t.name] ?? 0) + parseFloat(t.amount);
      });
      const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
      const START = 100,
        END = 40;
      const step =
        entries.length > 1 ? (START - END) / (entries.length - 1) : 0;
      return entries.map(([name, value], i) => ({
        name,
        value: parseFloat(value.toFixed(2)),
        color: `color-mix(in srgb, var(--category-${activeTab.toLowerCase()}) ${Math.round(START - i * step)}%, black)`,
      }));
    }
    const grouped = {};
    filtered.forEach((t) => {
      grouped[t.category] = (grouped[t.category] ?? 0) + parseFloat(t.amount);
    });
    return Object.entries(grouped).map(([cat, value]) => ({
      name: CATEGORY_CONFIG[cat]?.label ?? cat,
      value: parseFloat(value.toFixed(2)),
      color: `var(--category-${cat.toLowerCase()})`,
    }));
  }, [filtered, activeTab]);

  const barData = useMemo(() => {
    if (activeTab !== "ALL") {
      const grouped = {};
      filtered.forEach((t) => {
        grouped[t.name] = (grouped[t.name] ?? 0) + parseFloat(t.amount);
      });
      const entries = Object.entries(grouped)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12);
      const START = 100,
        END = 30;
      const step =
        entries.length > 1 ? (START - END) / (entries.length - 1) : 0;
      return entries.map(([name, total], i) => ({
        month: name,
        total: parseFloat(total.toFixed(2)),
        color: `color-mix(in srgb, var(--category-${activeTab.toLowerCase()}) ${Math.round(START - i * step)}%, black)`,
      }));
    }
    const grouped = {};
    filtered.forEach((t) => {
      const month = new Date(t.transaction_date).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      if (!grouped[month]) grouped[month] = { income: 0, expense: 0 };
      if (INCOME_TYPES.has(t.category)) {
        grouped[month].income += parseFloat(t.amount);
      } else {
        grouped[month].expense += parseFloat(t.amount);
      }
    });
    return Object.entries(grouped)
      .sort((a, b) => new Date("1 " + a[0]) - new Date("1 " + b[0]))
      .map(([month, { income, expense }]) => ({
        month,
        income: parseFloat(income.toFixed(2)),
        expense: parseFloat(expense.toFixed(2)),
      }));
  }, [filtered, activeTab]);

  const areaData = useMemo(() => {
    if (activeTab === "ALL") return [];
    const grouped = {};
    filtered.forEach((t) => {
      grouped[t.transaction_date] =
        (grouped[t.transaction_date] ?? 0) + parseFloat(t.amount);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({
        date: new Date(date + "T00:00:00").getTime(),
        total: parseFloat(total.toFixed(2)),
      }));
  }, [filtered, activeTab]);

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(b.transaction_date) - new Date(a.transaction_date),
      ),
    [filtered],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    setPage(1);
  }, [filtered, perPage]);

  const activeColor = `var(--category-${activeTab.toLowerCase()})`;
  const text = dark ? "var(--dark-text)" : "var(--light-text)";
  const tooltipProps = {
    contentStyle: {
      backgroundColor: dark ? "var(--dark-surface)" : "var(--light-surface)",
      borderColor: dark ? "var(--dark-border)" : "var(--light-border)",
      borderRadius: "12px",
      color: text,
    },
    labelStyle: { color: text },
    itemStyle: { color: text },
  };

  return (
    <div
      className="min-h-dvh"
      style={{ backgroundColor: dark ? "var(--dark-bg)" : "var(--light-bg)" }}
    >
      <Navbar
        transactions={transactions}
        onSelectTransaction={handleSelectTransaction}
        onDeleteRecurringPayment={refreshTransactions}
        onSaveRecurringPayment={refreshTransactions}
      />

      <CategoryTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeColor={activeColor}
      />
      <DateRangeFilter
        activeColor={activeColor}
        onChange={setDateRange}
        blackActiveText={activeTab === "ALL" && !dark}
      />

      <main className="px-6 py-6 space-y-5 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {activeTab === "ALL" ? (
            <>
              <SummaryCard
                label="INCOME"
                value={fmt(summary.totalIn)}
                activeColor={activeColor}
              />
              <SummaryCard
                label="EXPENSES"
                value={fmt(summary.totalOut)}
                activeColor={activeColor}
              />
              <SummaryCard
                label="CASH FLOW"
                value={
                  summary.savingsRate !== null
                    ? `${summary.savingsRate.toFixed(1)}%`
                    : "—"
                }
                activeColor={activeColor}
                deltaLabel={
                  summary.savingsRateDelta != null
                    ? `${summary.savingsRateDelta >= 0 ? "↑" : "↓"} ${Math.abs(summary.savingsRateDelta).toFixed(1)}% vs last month`
                    : null
                }
                deltaUp={summary.savingsRateDelta >= 0}
              />
              <SummaryCard
                label="PROJECTED MONTHLY SPENDING"
                value={fmt(summary.projectedMonthlySpend)}
                activeColor={activeColor}
                deltaLabel={
                  summary.projectedMonthlySpendDelta != null
                    ? `${summary.projectedMonthlySpendDelta >= 0 ? "↑" : "↓"} ${fmt(Math.abs(summary.projectedMonthlySpendDelta))} vs last month`
                    : null
                }
                deltaUp={summary.projectedMonthlySpendDelta <= 0}
              />
            </>
          ) : (
            <>
              <SummaryCard
                label={`${CATEGORY_CONFIG[activeTab].label.toUpperCase()} TOTAL`}
                value={fmt(summary.categoryTotal)}
                activeColor={activeColor}
              />
              {INCOME_TYPES.has(activeTab) ? (
                <SummaryCard
                  label="PAYMENTS"
                  value={String(summary.txCount)}
                  activeColor={activeColor}
                  deltaLabel={
                    summary.txCount > 0
                      ? `avg ${fmt(summary.avgTx)} each`
                      : null
                  }
                  deltaUp={true}
                />
              ) : (
                <SummaryCard
                  label="AVG TRANSACTION"
                  value={fmt(summary.avgTx)}
                  activeColor={activeColor}
                />
              )}
              <SummaryCard
                label="VS LAST MONTH"
                value={
                  summary.categoryDelta != null
                    ? `${summary.categoryDelta >= 0 ? "+" : ""}${summary.categoryDelta.toFixed(1)}%`
                    : "—"
                }
                activeColor={activeColor}
                deltaLabel={
                  summary.categoryDelta != null
                    ? summary.categoryDelta >= 0
                      ? "↑ higher than last month"
                      : "↓ lower than last month"
                    : null
                }
                deltaUp={
                  INCOME_TYPES.has(activeTab)
                    ? summary.categoryDelta >= 0
                    : summary.categoryDelta <= 0
                }
                valueColor={
                  summary.categoryDelta != null
                    ? (
                        INCOME_TYPES.has(activeTab)
                          ? summary.categoryDelta >= 0
                          : summary.categoryDelta <= 0
                      )
                      ? "var(--category-income)"
                      : "var(--category-expense)"
                    : undefined
                }
              />
              <SummaryCard
                label={
                  INCOME_TYPES.has(activeTab) ? "% OF INCOME" : "% OF EXPENSES"
                }
                value={
                  summary.pctOfTotal != null
                    ? `${summary.pctOfTotal.toFixed(1)}%`
                    : "—"
                }
                activeColor={activeColor}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard
            title={
              activeTab === "ALL"
                ? "Breakdown by Category"
                : `${CATEGORY_CONFIG[activeTab].label} Breakdown`
            }
            activeColor={activeColor}
          >
            {activeTab === "ALL" ? (
              pieData.length > 0 ? (
                <>
                  <ResponsiveContainer
                    width="100%"
                    height={280}
                    style={{ pointerEvents: "none" }}
                  >
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        strokeWidth={0}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipProps} formatter={(v) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px 16px",
                      justifyContent: "center",
                      marginTop: 8,
                    }}
                  >
                    {pieData.map((entry) => (
                      <div
                        key={entry.name}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: "50%",
                            backgroundColor: entry.color,
                            flexShrink: 0,
                            display: "inline-block",
                          }}
                        />
                        <span style={{ color: text, fontSize: 12 }}>
                          {entry.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <Empty />
              )
            ) : areaData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height={280}
                style={{ pointerEvents: "none" }}
              >
                <AreaChart data={areaData}>
                  <defs>
                    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={activeColor}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={activeColor}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={
                      dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
                    }
                  />
                  <XAxis
                    dataKey="date"
                    type="number"
                    scale="time"
                    domain={["dataMin", "dataMax"]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: text }}
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                    tick={{ fontSize: 12, fill: text }}
                  />
                  <Tooltip
                    {...tooltipProps}
                    cursor={{
                      stroke: activeColor,
                      strokeWidth: 1,
                      strokeDasharray: "4 4",
                    }}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const { date, total } = payload[0].payload;
                      return (
                        <div
                          style={{
                            ...tooltipProps.contentStyle,
                            padding: "8px 12px",
                          }}
                        >
                          <p style={{ margin: 0, opacity: 0.7, fontSize: 12 }}>
                            {new Date(date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          <p style={{ margin: 0, fontWeight: 600 }}>
                            {fmt(total)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    key={activeTab}
                    type="monotone"
                    dataKey="total"
                    stroke={activeColor}
                    strokeWidth={2}
                    fill="url(#areaFill)"
                    dot={{ fill: activeColor, r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </ChartCard>

          <ChartCard
            title={
              activeTab === "ALL"
                ? "Monthly Totals"
                : `${CATEGORY_CONFIG[activeTab].label} Total`
            }
            activeColor={activeColor}
          >
            {barData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height={280}
                style={{ pointerEvents: "none" }}
              >
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    height={activeTab !== "ALL" ? 60 : 30}
                    tick={
                      activeTab !== "ALL"
                        ? (props) => {
                            const val = props.payload?.value ?? "";
                            const label =
                              val.length > 12 ? val.slice(0, 12) + "…" : val;
                            return (
                              <text
                                x={props.x}
                                y={props.y}
                                dy={8}
                                textAnchor="end"
                                fontSize={12}
                                style={{ fill: text }}
                                transform={`rotate(-35, ${props.x}, ${props.y})`}
                              >
                                {label}
                              </text>
                            );
                          }
                        : { fontSize: 12, fill: text }
                    }
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                    tick={{ fontSize: 12, fill: text }}
                  />
                  <Tooltip
                    {...tooltipProps}
                    formatter={(v) => fmt(v)}
                    cursor={false}
                  />
                  {activeTab === "ALL" ? (
                    <>
                      <Bar
                        dataKey="income"
                        fill="var(--category-income)"
                        radius={[6, 6, 0, 0]}
                        barSize={20}
                      />
                      <Bar
                        dataKey="expense"
                        fill="var(--category-expense)"
                        radius={[6, 6, 0, 0]}
                        barSize={20}
                      />
                    </>
                  ) : (
                    <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={32}>
                      {barData.map((entry) => (
                        <Cell key={entry.month} fill={entry.color} />
                      ))}
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </ChartCard>
        </div>

        <div ref={tableRef}>
          <TransactionTable
            rows={paginated}
            page={page}
            perPage={perPage}
            total={sorted.length}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
            onAdd={() => setShowModal(true)}
            onEdit={setEditingTransaction}
            onDelete={handleDelete}
            activeColor={activeColor}
            highlightId={highlightId}
          />
        </div>
      </main>

      <Footer />

      <RenderWakeButton />

      {isDemo() && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "24px",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "6px 12px",
            borderRadius: "8px",
            border: `1px solid ${dark ? "rgba(251,191,36,0.2)" : "rgba(217,119,6,0.25)"}`,
            backgroundColor: dark
              ? "rgba(251,191,36,0.08)"
              : "rgba(251,191,36,0.12)",
            backdropFilter: "blur(8px)",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#fbbf24",
              flexShrink: 0,
              animation: "demo-pulse 1.8s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: dark ? "rgba(251,191,36,0.7)" : "rgba(146,64,14,0.75)",
              whiteSpace: "nowrap",
            }}
          >
            Demo · Not live data
          </span>
        </div>
      )}

      {showModal && (
        <AddTransactionModal
          activeTab={activeTab}
          activeColor={activeColor}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            refreshTransactions();
          }}
        />
      )}

      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSaved={() => {
            setEditingTransaction(null);
            refreshTransactions();
          }}
        />
      )}
    </div>
  );
}

function Empty() {
  return (
    <div className="h-70 flex items-center justify-center text-base dark:text-(--dark-text) text-(--light-text)">
      No data yet
    </div>
  );
}
