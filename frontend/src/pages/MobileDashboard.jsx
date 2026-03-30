import { useState, useEffect, useMemo } from "react";
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
import { getTransactions, createTransaction } from "../api/transactions";
import {
  CATEGORIES,
  CATEGORY_CONFIG,
  INCOME_TYPES,
  fmt,
} from "../utils/finance";
import { useTheme } from "../hooks/useTheme";

export default function MobileDashboard() {
  const dark = useTheme();

  const bg = dark ? "var(--dark-bg)" : "var(--light-bg)";
  const surface = dark ? "var(--dark-surface)" : "var(--light-surface)";
  const border = dark ? "var(--dark-border)" : "var(--light-border)";
  const text = dark ? "var(--dark-text)" : "var(--light-text)";
  const muted = `color-mix(in srgb, ${text} 50%, transparent)`;

  const [transactions, setTransactions] = useState([]);
  const [quickMode, setQuickMode] = useState(true);
  const [quickCat, setQuickCat] = useState("EXPENSE");
  const [quickForm, setQuickForm] = useState({
    name: "",
    amount: "",
    transaction_date: new Date().toISOString().split("T")[0],
  });
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");

  function refresh() {
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
    refresh();
  }, []);

  const activeColor = `var(--category-${activeTab.toLowerCase()})`;
  const quickColor = `var(--category-${quickCat.toLowerCase()})`;

  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    setQuickError("");
    setQuickLoading(true);
    try {
      await createTransaction({
        ...quickForm,
        category: quickCat,
        amount: parseFloat(quickForm.amount),
      });
      setQuickForm((f) => ({ ...f, name: "", amount: "" }));
      refresh();
    } catch (err) {
      setQuickError(err.response?.data?.detail ?? "Something went wrong");
    } finally {
      setQuickLoading(false);
    }
  };

  const recent = useMemo(
    () =>
      [...transactions]
        .sort(
          (a, b) => new Date(b.transaction_date) - new Date(a.transaction_date),
        )
        .slice(0, 5),
    [transactions],
  );

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
      .reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalOut = filtered
      .filter((t) => !INCOME_TYPES.has(t.category))
      .reduce((s, t) => s + parseFloat(t.amount), 0);
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
          color: activeColor,
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
        .slice(0, 10)
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

  const inputStyle = { backgroundColor: bg, borderColor: border, color: text };

  return (
    <div className="min-h-dvh" style={{ backgroundColor: bg, color: text }}>
      {/* Header */}
      <header
        className="border-b sticky top-0 z-20 px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: surface, borderColor: border }}
      >
        <span
          className="font-mono text-2xl font-bold bg-clip-text text-transparent shrink-0"
          style={{
            backgroundImage: dark
              ? "linear-gradient(to right, #ffffff, #d1d5db, #9ca3af)"
              : "linear-gradient(to right, #111827, #374151, #6b7280)",
          }}
        >
          FinSight
        </span>
        <input
          disabled
          placeholder="Search coming soon..."
          className="flex-1 min-w-0 rounded-xl px-3 py-1.5 text-sm cursor-not-allowed"
          style={{
            backgroundColor: bg,
            borderColor: border,
            color: muted,
            border: `1px solid ${border}`,
          }}
        />
        <button
          onClick={() => document.documentElement.classList.toggle("dark")}
          className="p-2 rounded-lg cursor-pointer shrink-0"
          aria-label="Toggle theme"
        >
          {dark ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
        </button>
      </header>

      {/* Mode toggle */}
      <div className="px-4 pt-4 pb-2 flex justify-center">
        <div
          className="rounded-xl p-1 flex w-full max-w-xs"
          style={{ backgroundColor: bg, border: `1px solid ${border}` }}
        >
          {["Quick Entry", "Analytics"].map((label, i) => {
            const active = i === 0 ? quickMode : !quickMode;
            return (
              <button
                key={label}
                onClick={() => setQuickMode(i === 0)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold cursor-pointer"
                style={{
                  backgroundColor: active ? surface : "transparent",
                  color: active ? text : muted,
                  boxShadow: active ? "0 1px 6px rgba(0,0,0,0.18)" : "none",
                  transition: "background-color 200ms ease, color 200ms ease, box-shadow 200ms ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="px-4 pb-8 space-y-4">
        {quickMode ? (
          <>
            {/* Quick entry card */}
            <div
              className="rounded-2xl border p-4"
              style={{ backgroundColor: surface, borderColor: quickColor }}
            >
              <p className="text-base font-semibold mb-3">Quick Entry</p>

              <select
                value={quickCat}
                onChange={(e) => setQuickCat(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none mb-3 cursor-pointer border"
                style={inputStyle}
              >
                {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>

              <form onSubmit={handleQuickSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="Name (e.g. Groceries, Utilities…)"
                  value={quickForm.name}
                  onChange={(e) =>
                    quickCat !== "TIPS" &&
                    setQuickForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required={quickCat !== "TIPS"}
                  disabled={quickCat === "TIPS"}
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none border"
                  style={
                    quickCat === "TIPS"
                      ? {
                          ...inputStyle,
                          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 5px, color-mix(in srgb, ${text} 10%, transparent) 5px, color-mix(in srgb, ${text} 10%, transparent) 10px)`,
                          cursor: "not-allowed",
                          opacity: 0.5,
                        }
                      : inputStyle
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={quickForm.amount}
                    onChange={(e) =>
                      setQuickForm((f) => ({ ...f, amount: e.target.value }))
                    }
                    required
                    min="0.01"
                    step="0.01"
                    className="w-full min-w-0 rounded-xl px-4 py-2.5 text-sm focus:outline-none border"
                    style={inputStyle}
                  />
                  <input
                    type="date"
                    value={quickForm.transaction_date}
                    onChange={(e) =>
                      setQuickForm((f) => ({
                        ...f,
                        transaction_date: e.target.value,
                      }))
                    }
                    required
                    className="w-full min-w-0 rounded-xl px-3 py-2.5 text-sm focus:outline-none border"
                    style={inputStyle}
                  />
                </div>
                {quickError && (
                  <p className="text-xs text-red-500">{quickError}</p>
                )}
                <button
                  type="submit"
                  disabled={quickLoading}
                  className="w-full py-2.5 rounded-xl text-sm font-bold tracking-wide disabled:opacity-50 transition-all cursor-pointer active:scale-95 border"
                  style={{
                    color: quickColor,
                    borderColor: quickColor,
                    backgroundColor: `color-mix(in srgb, ${quickColor} 12%, transparent)`,
                    boxShadow: `0 0 0 2px color-mix(in srgb, ${quickColor} 20%, transparent)`,
                  }}
                >
                  {quickLoading
                    ? "Saving…"
                    : `Add ${CATEGORY_CONFIG[quickCat].label}`}
                </button>
              </form>
            </div>

            {/* Recent */}
            <div
              className="rounded-2xl border"
              style={{ backgroundColor: surface, borderColor: border }}
            >
              <p
                className="px-4 py-3 text-base font-semibold border-b"
                style={{ borderColor: border }}
              >
                Recent
              </p>
              {recent.length === 0 ? (
                <p
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: muted }}
                >
                  No transactions yet
                </p>
              ) : (
                recent.map((t) => {
                  const isIncome = INCOME_TYPES.has(t.category);
                  return (
                    <div
                      key={t.id}
                      className="px-4 py-3 border-t flex items-center gap-3"
                      style={{ borderColor: border }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        <p className="text-xs" style={{ color: muted }}>
                          <span
                            className="font-medium"
                            style={{
                              color: `var(--category-${t.category.toLowerCase()})`,
                            }}
                          >
                            {CATEGORY_CONFIG[t.category]?.label}
                          </span>
                          {" · "}
                          {new Date(t.transaction_date).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" },
                          )}
                        </p>
                      </div>
                      <p
                        className="text-sm font-bold shrink-0"
                        style={{
                          color: isIncome
                            ? "var(--category-income)"
                            : "var(--category-expense)",
                        }}
                      >
                        {isIncome ? "+" : "-"}
                        {fmt(t.amount)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <>
            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {CATEGORIES.map((cat) => {
                const catColor = `var(--category-${cat.toLowerCase()})`;
                const isActive = activeTab === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveTab(cat)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl border whitespace-nowrap transition-all cursor-pointer active:scale-95 shrink-0"
                    style={
                      isActive
                        ? {
                            color: catColor,
                            borderColor: catColor,
                            backgroundColor: `color-mix(in srgb, ${catColor} 12%, transparent)`,
                            boxShadow: `0 0 0 2px color-mix(in srgb, ${catColor} 20%, transparent)`,
                          }
                        : {
                            borderColor: border,
                            color: text,
                            opacity: 0.4,
                          }
                    }
                  >
                    {cat === "ALL" ? "All" : CATEGORY_CONFIG[cat].label}
                  </button>
                );
              })}
            </div>

            {/* Summary 2×2 */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "INCOME", value: fmt(summary.totalIn) },
                { label: "EXPENSES", value: fmt(summary.totalOut) },
                { label: "NET", value: fmt(summary.net) },
                { label: "TRANSACTIONS", value: summary.count },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-2xl px-4 py-4 border"
                  style={{
                    backgroundColor: surface,
                    borderColor: border,
                    color: text,
                    borderTopColor: activeColor,
                    borderTopWidth: "3px",
                  }}
                >
                  <p
                    className="text-xs font-medium mb-1"
                    style={{ color: muted }}
                  >
                    {label}
                  </p>
                  <p className="text-lg font-bold tracking-tight">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* Pie chart */}
            {pieData.length > 0 && (
              <div
                className="rounded-2xl border p-4"
                style={{ backgroundColor: surface, borderColor: activeColor }}
              >
                <p className="text-base font-semibold mb-3">
                  {activeTab === "ALL"
                    ? "Breakdown By Category"
                    : `${CATEGORY_CONFIG[activeTab].label} Breakdown`}
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
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
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Bar chart */}
            {barData.length > 0 && (
              <div
                className="rounded-2xl border p-4"
                style={{ backgroundColor: surface, borderColor: activeColor }}
              >
                <p className="text-base font-semibold mb-3">
                  {activeTab === "ALL"
                    ? "Monthly Totals"
                    : `Top ${CATEGORY_CONFIG[activeTab].label} by Name`}
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      height={activeTab !== "ALL" ? 50 : 24}
                      tick={
                        activeTab !== "ALL"
                          ? (props) => {
                              const val = props.value ?? "";
                              const label =
                                val.length > 10 ? val.slice(0, 10) + "…" : val;
                              return (
                                <text
                                  x={props.x}
                                  y={props.y}
                                  dy={6}
                                  textAnchor="end"
                                  fontSize={11}
                                  transform={`rotate(-35, ${props.x}, ${props.y})`}
                                >
                                  {label}
                                </text>
                              );
                            }
                          : { fontSize: 11 }
                      }
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${v}`}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip formatter={(v) => fmt(v)} cursor={false} />
                    <Bar
                      dataKey="total"
                      fill={activeColor}
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Transaction list */}
            <div
              className="rounded-2xl border"
              style={{ backgroundColor: surface, borderColor: activeColor }}
            >
              <p
                className="px-4 py-3 text-base font-semibold border-b"
                style={{ borderColor: border }}
              >
                Transactions
              </p>
              {filtered.length === 0 ? (
                <p
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: muted }}
                >
                  No transactions
                </p>
              ) : (
                [...filtered]
                  .sort(
                    (a, b) =>
                      new Date(b.transaction_date) -
                      new Date(a.transaction_date),
                  )
                  .map((t) => {
                    const isIncome = INCOME_TYPES.has(t.category);
                    return (
                      <div
                        key={t.id}
                        className="px-4 py-3 border-t flex items-center gap-3"
                        style={{ borderColor: border }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {t.name}
                          </p>
                          <p className="text-xs" style={{ color: muted }}>
                            <span
                              className="font-medium"
                              style={{
                                color: `var(--category-${t.category.toLowerCase()})`,
                              }}
                            >
                              {CATEGORY_CONFIG[t.category]?.label}
                            </span>
                            {" · "}
                            {new Date(t.transaction_date).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </p>
                        </div>
                        <p
                          className="text-sm font-bold shrink-0"
                          style={{
                            color: isIncome
                              ? "var(--category-income)"
                              : "var(--category-expense)",
                          }}
                        >
                          {isIncome ? "+" : "-"}
                          {fmt(t.amount)}
                        </p>
                      </div>
                    );
                  })
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
