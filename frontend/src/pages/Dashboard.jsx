import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import {
  PieChart,
  Pie,
  Sector,
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
import { getTransactions } from "../api/transactions";
import {
  CATEGORIES,
  CATEGORY_CONFIG,
  INCOME_TYPES,
  fmt,
} from "../utils/finance";
import Navbar from "../components/Navbar";
import CategoryTabs from "../components/CategoryTabs";
import SummaryCard from "../components/SummaryCard";
import ChartCard from "../components/ChartCard";
import TransactionTable from "../components/TransactionTable";
import AddTransactionModal from "../components/AddTransactionModal";

export default function Dashboard() {
  const dark = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [showModal, setShowModal] = useState(false);

  function refreshTransactions() {
    getTransactions()
      .then((res) => setTransactions(Array.isArray(res.data) ? res.data : []))
      .catch((err) =>
        console.error(
          "Failed to load transactions:",
          err?.response?.status,
          err?.response?.data,
        ),
      );
  }

  useEffect(() => {
    refreshTransactions();
  }, []);

  const filtered = useMemo(
    () =>
      activeTab === "ALL"
        ? transactions
        : transactions.filter((t) => t.category === activeTab),
    [transactions, activeTab],
  );

  const summary = useMemo(() => {
    const totalIn = filtered
      .filter((t) => INCOME_TYPES.has(t.category))
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalOut = filtered
      .filter((t) => !INCOME_TYPES.has(t.category))
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    return {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      count: filtered.length,
    };
  }, [filtered]);

  const pieData = useMemo(() => {
    if (activeTab !== "ALL") {
      const grouped = {};
      filtered.forEach((t) => {
        grouped[t.name] = (grouped[t.name] ?? 0) + parseFloat(t.amount);
      });
      return Object.entries(grouped)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({
          name,
          value: parseFloat(value.toFixed(2)),
          color: `var(--category-${activeTab.toLowerCase()})`,
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
      grouped[month] = (grouped[month] ?? 0) + parseFloat(t.amount);
    });
    return Object.entries(grouped)
      .sort((a, b) => new Date("1 " + a[0]) - new Date("1 " + b[0]))
      .map(([month, total]) => ({
        month,
        total: parseFloat(total.toFixed(2)),
      }));
  }, [filtered, activeTab]);

  const activeColor = `var(--category-${activeTab.toLowerCase()})`;

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
          <SummaryCard
            label="NET"
            value={fmt(summary.net)}
            activeColor={activeColor}
          />
          <SummaryCard
            label="TRANSACTIONS"
            value={summary.count}
            activeColor={activeColor}
          />
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
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    strokeWidth={0}
                    activeShape={(props) => (
                      <Sector {...props} outerRadius={props.outerRadius} />
                    )}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend iconType="circle" iconSize={9} />
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
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} barSize={32}>
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
                            const val = props.value ?? "";
                            const label =
                              val.length > 12 ? val.slice(0, 12) + "…" : val;
                            return (
                              <text
                                x={props.x}
                                y={props.y}
                                dy={8}
                                textAnchor="end"
                                fontSize={12}
                                transform={`rotate(-35, ${props.x}, ${props.y})`}
                              >
                                {label}
                              </text>
                            );
                          }
                        : { fontSize: 12 }
                    }
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip formatter={(v) => fmt(v)} cursor={false} />
                  <Bar
                    dataKey="total"
                    fill={activeColor}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </ChartCard>
        </div>

        <TransactionTable
          filtered={filtered}
          onAdd={() => setShowModal(true)}
          activeColor={activeColor}
        />
      </main>

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
