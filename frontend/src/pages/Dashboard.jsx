import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
// import { getTransactions } from "../api/transactions";
import { TEMP_DB } from "../utils/temp_db";
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
import Footer from "../components/Footer";

export default function Dashboard() {
  const dark = useTheme();
  const [transactions, setTransactions] = useState(TEMP_DB);
  const [activeTab, setActiveTab] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  });

  function refreshTransactions() {
    setTransactions(TEMP_DB);
  }

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

    const savingsRate = totalIn > 0 ? ((totalIn - totalOut) / totalIn) * 100 : null;

    // Avg daily spend
    let days = 1;
    if (dateRange.from && dateRange.to) {
      days = Math.max(1, Math.round((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24)));
    } else if (filtered.length > 0) {
      const timestamps = filtered.map((t) => new Date(t.transaction_date).getTime());
      days = Math.max(1, Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / (1000 * 60 * 60 * 24)) + 1);
    }
    const avgDailySpend = totalOut / days;

    // Previous period savings rate delta
    let savingsRateDelta = null;
    if (dateRange.from) {
      const periodMs = (dateRange.to ?? new Date()).getTime() - dateRange.from.getTime();
      const prevFrom = new Date(dateRange.from.getTime() - periodMs);
      const prevTo = dateRange.from;
      const prevFiltered = transactions
        .filter((t) => activeTab === "ALL" || t.category === activeTab)
        .filter((t) => {
          const d = new Date(t.transaction_date + "T00:00:00");
          return d >= prevFrom && d < prevTo;
        });
      const prevIn = prevFiltered.filter((t) => INCOME_TYPES.has(t.category)).reduce((s, t) => s + parseFloat(t.amount), 0);
      const prevOut = prevFiltered.filter((t) => !INCOME_TYPES.has(t.category)).reduce((s, t) => s + parseFloat(t.amount), 0);
      if (prevIn > 0 && savingsRate !== null) {
        savingsRateDelta = savingsRate - ((prevIn - prevOut) / prevIn) * 100;
      }
    }

    let avgDailySpendDelta = null;
    if (dateRange.from) {
      const periodMs = (dateRange.to ?? new Date()).getTime() - dateRange.from.getTime();
      const prevFrom = new Date(dateRange.from.getTime() - periodMs);
      const prevTo = dateRange.from;
      const prevTotalOut = transactions
        .filter((t) => activeTab === "ALL" || t.category === activeTab)
        .filter((t) => { const d = new Date(t.transaction_date + "T00:00:00"); return d >= prevFrom && d < prevTo; })
        .filter((t) => !INCOME_TYPES.has(t.category))
        .reduce((s, t) => s + parseFloat(t.amount), 0);
      avgDailySpendDelta = avgDailySpend - prevTotalOut / days;
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
        .filter((t) => isIncomeCategory ? INCOME_TYPES.has(t.category) : !INCOME_TYPES.has(t.category))
        .reduce((s, t) => s + parseFloat(t.amount), 0);
      if (allPeriodTotal > 0) pctOfTotal = (categoryTotal / allPeriodTotal) * 100;

      if (dateRange.from) {
        const periodMs = (dateRange.to ?? new Date()).getTime() - dateRange.from.getTime();
        const prevFrom = new Date(dateRange.from.getTime() - periodMs);
        const prevTo = dateRange.from;
        const prevTotal = transactions
          .filter((t) => t.category === activeTab)
          .filter((t) => { const d = new Date(t.transaction_date + "T00:00:00"); return d >= prevFrom && d < prevTo; })
          .reduce((s, t) => s + parseFloat(t.amount), 0);
        if (prevTotal > 0) categoryDelta = ((categoryTotal - prevTotal) / prevTotal) * 100;
      }
    }

    return { totalIn, totalOut, savingsRate, savingsRateDelta, avgDailySpend, avgDailySpendDelta, categoryTotal, pctOfTotal, categoryDelta };
  }, [filtered, transactions, activeTab, dateRange]);

  const pieData = useMemo(() => {
    if (activeTab !== "ALL") {
      const grouped = {};
      filtered.forEach((t) => {
        grouped[t.name] = (grouped[t.name] ?? 0) + parseFloat(t.amount);
      });
      return Object.entries(grouped)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value], i) => ({
          name,
          value: parseFloat(value.toFixed(2)),
          color: `color-mix(in srgb, var(--category-${activeTab.toLowerCase()}) ${100 - i * 10}%, black)`,
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
      return Object.entries(grouped)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([name, total]) => ({
          month: name,
          total: parseFloat(total.toFixed(2)),
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

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date)),
    [filtered],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { setPage(1); }, [filtered, perPage]);

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
      <Navbar />

      <CategoryTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeColor={activeColor}
      />
      <DateRangeFilter activeColor={activeColor} onChange={setDateRange} blackActiveText={activeTab === "ALL" && !dark} />

      <main className="px-6 py-6 space-y-5 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          {activeTab === "ALL" ? (
            <>
              <SummaryCard
                label="SAVINGS RATE"
                value={summary.savingsRate !== null ? `${summary.savingsRate.toFixed(1)}%` : "—"}
                activeColor={activeColor}
                deltaLabel={summary.savingsRateDelta != null ? `${summary.savingsRateDelta >= 0 ? "↑" : "↓"} ${Math.abs(summary.savingsRateDelta).toFixed(1)}% vs last month` : null}
                deltaUp={summary.savingsRateDelta >= 0}
              />
              <SummaryCard
                label="AVG DAILY SPEND"
                value={fmt(summary.avgDailySpend)}
                activeColor={activeColor}
                deltaLabel={summary.avgDailySpendDelta != null ? `${summary.avgDailySpendDelta >= 0 ? "↑" : "↓"} ${fmt(Math.abs(summary.avgDailySpendDelta))} vs last month` : null}
                deltaUp={summary.avgDailySpendDelta <= 0}
              />
            </>
          ) : (
            <>
              <SummaryCard
                label="VS LAST MONTH"
                value={summary.categoryDelta != null ? `${summary.categoryDelta >= 0 ? "+" : ""}${summary.categoryDelta.toFixed(1)}%` : "—"}
                activeColor={activeColor}
                deltaLabel={summary.categoryDelta != null ? (summary.categoryDelta >= 0 ? "↑ higher than last month" : "↓ lower than last month") : null}
                deltaUp={INCOME_TYPES.has(activeTab) ? summary.categoryDelta >= 0 : summary.categoryDelta <= 0}
                valueColor={summary.categoryDelta != null ? ((INCOME_TYPES.has(activeTab) ? summary.categoryDelta >= 0 : summary.categoryDelta <= 0) ? "var(--category-income)" : "var(--category-expense)") : undefined}
              />
              <SummaryCard
                label={INCOME_TYPES.has(activeTab) ? "% OF INCOME" : "% OF SPENDING"}
                value={summary.pctOfTotal != null ? `${summary.pctOfTotal.toFixed(1)}%` : "—"}
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
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280} style={{ pointerEvents: "none" }}>
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
                  <Legend iconType="circle" iconSize={9} formatter={(value) => <span style={{ color: text }}>{value}</span>} />
                </PieChart>
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
              <ResponsiveContainer width="100%" height={280} style={{ pointerEvents: "none" }}>
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
                  <Tooltip {...tooltipProps} formatter={(v) => fmt(v)} cursor={false} />
                  {activeTab === "ALL" ? (
                    <>
                      <Bar dataKey="income" fill="var(--category-income)" radius={[6, 6, 0, 0]} barSize={20} />
                      <Bar dataKey="expense" fill="var(--category-expense)" radius={[6, 6, 0, 0]} barSize={20} />
                    </>
                  ) : (
                    <Bar dataKey="total" fill={activeColor} radius={[6, 6, 0, 0]} barSize={32} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </ChartCard>
        </div>

        <TransactionTable
          rows={paginated}
          page={page}
          perPage={perPage}
          total={sorted.length}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
          onAdd={() => setShowModal(true)}
          activeColor={activeColor}
        />
      </main>

      <Footer />

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
