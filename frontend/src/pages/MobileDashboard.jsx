import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
} from "recharts";
import { getTransactions, createTransaction } from "../api/transactions";
import {
  CATEGORIES,
  CATEGORY_CONFIG,
  INCOME_TYPES,
  fmt,
} from "../utils/finance";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../context/AuthContext";
import { PRESETS, getPresetRange } from "../components/DateRangeFilter";
import Footer from "../components/Footer";
import RenderWakeButton from "../components/RenderWakeButton";
import RecurringPaymentsModal from "../components/RecurringPaymentsModal";

export default function MobileDashboard() {
  const dark = useTheme();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [rpSave, setRpSave] = useState({ isDirty: false, isSaving: false, onSave: null });

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
    transaction_date: new Date().toLocaleDateString("en-CA"),
  });
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const debounceRef = useRef(null);
  const searchContainerRef = useRef(null);
  const tableRef = useRef(null);
  const [activeTab, setActiveTab] = useState("ALL");
  const [activePreset, setActivePreset] = useState("Current Month");
  const [fromVal, setFromVal] = useState("");
  const [toVal, setToVal] = useState("");
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  });

  function handlePreset(label) {
    setActivePreset(label);
    setFromVal("");
    setToVal("");
    setDateRange(getPresetRange(label));
  }

  function handleCustom(from, to) {
    setActivePreset(null);
    setDateRange({
      from: from ? new Date(from + "T00:00:00") : null,
      to: to ? new Date(to + "T23:59:59") : null,
    });
  }

  useEffect(() => {
    getTransactions().then((res) => setTransactions(res.data));
  }, []);

  function refresh() {
    getTransactions().then((res) => setTransactions(res.data));
  }

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setSearchOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(val), 300);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      setSearchOpen(false);
      setQuery("");
      setDebouncedQuery("");
    }
  };

  useEffect(() => {
    function onMouseDown(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const suggestions = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return [];
    return transactions
      .filter((t) =>
        t.name?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        (CATEGORY_CONFIG[t.category]?.label ?? "").toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      )
      .slice(0, 5);
  }, [debouncedQuery, transactions]);

  const handleSelectTransaction = useCallback((t) => {
    setQuery("");
    setDebouncedQuery("");
    setSearchOpen(false);
    setActiveTab("ALL");
    setDateRange({ from: null, to: null });
    const allSorted = [...transactions].sort(
      (a, b) => new Date(b.transaction_date) - new Date(a.transaction_date)
    );
    const idx = allSorted.findIndex((tx) => tx.id === t.id);
    if (idx !== -1) setPage(Math.ceil((idx + 1) / perPage));
    setQuickMode(false);
    setHighlightId(t.id);
    setTimeout(() => setHighlightId(null), 2500);
    setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, [transactions, perPage]);

  const activeColor = `var(--category-${activeTab.toLowerCase()})`;
  const quickColor = `var(--category-${quickCat.toLowerCase()})`;
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
      .reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalOut = filtered
      .filter((t) => !INCOME_TYPES.has(t.category))
      .reduce((s, t) => s + parseFloat(t.amount), 0);

    const savingsRate =
      totalIn > 0 ? ((totalIn - totalOut) / totalIn) * 100 : null;

    let days = 1;
    if (dateRange.from && dateRange.to) {
      days = Math.max(
        1,
        Math.round((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24)),
      );
    } else if (filtered.length > 0) {
      const timestamps = filtered.map((t) =>
        new Date(t.transaction_date + "T00:00:00").getTime(),
      );
      days = Math.max(
        1,
        Math.round(
          (Math.max(...timestamps) - Math.min(...timestamps)) /
            (1000 * 60 * 60 * 24),
        ) + 1,
      );
    }
    const avgDailySpending = totalOut / days;

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

    let avgDailySpendingDelta = null;
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
      avgDailySpendingDelta = avgDailySpending - prevTotalOut / days;
    }

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
      avgDailySpending,
      avgDailySpendingDelta,
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
        color: `color-mix(in srgb, ${activeColor} ${Math.round(START - i * step)}%, black)`,
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
      const month = new Date(
        t.transaction_date + "T00:00:00",
      ).toLocaleDateString("en-US", {
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
    () =>
      [...filtered].sort(
        (a, b) => new Date(b.transaction_date) - new Date(a.transaction_date),
      ),
    [filtered],
  );
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    setPage(1);
  }, [filtered, perPage]);

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
              : "linear-gradient(to right, #000000, #374151, #6b7280)",
          }}
        >
          FinSight
        </span>
        <div className="flex-1 min-w-0 relative" ref={searchContainerRef}>
          <input
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => query && setSearchOpen(true)}
            placeholder="Search transactions..."
            className="w-full rounded-xl px-3 py-1.5 text-sm border"
            style={{ backgroundColor: bg, borderColor: border, color: text, outline: "none" }}
          />
          {searchOpen && suggestions.length > 0 && (
            <div
              className="absolute top-full mt-1.5 left-0 right-0 rounded-xl border shadow-lg overflow-hidden z-50"
              style={{ backgroundColor: surface, borderColor: border }}
            >
              {suggestions.map((t) => {
                const catColor = `var(--category-${t.category.toLowerCase()})`;
                const date = new Date(t.transaction_date + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short", day: "numeric",
                });
                return (
                  <button
                    key={t.id}
                    onMouseDown={() => handleSelectTransaction(t)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                    style={{ backgroundColor: surface, color: text }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: catColor, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{t.name}</p>
                      <p className="text-xs truncate" style={{ color: catColor }}>
                        {CATEGORY_CONFIG[t.category]?.label ?? t.category} · {date}
                      </p>
                    </div>
                    <span className="text-sm font-bold shrink-0" style={{ color: catColor }}>{fmt(t.amount)}</span>
                  </button>
                );
              })}
            </div>
          )}
          {searchOpen && debouncedQuery.trim() && suggestions.length === 0 && (
            <div
              className="absolute top-full mt-1.5 left-0 right-0 rounded-xl border shadow-lg px-3 py-2.5 text-sm z-50"
              style={{ backgroundColor: surface, borderColor: border, color: muted }}
            >
              No transactions found
            </div>
          )}
        </div>
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
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-lg cursor-pointer shrink-0"
          aria-label="Open menu"
        >
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
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </header>

      {/* Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Recurring Payments — full-screen overlay */}
      {recurringOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ backgroundColor: surface, color: text }}
        >
          <div
            className="px-5 py-4 flex items-center justify-between border-b shrink-0"
            style={{ borderColor: border }}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setRecurringOpen(false); setRpSave({ isDirty: false, isSaving: false, onSave: null }); }}
                className="p-1 rounded-lg cursor-pointer"
                style={{ color: muted }}
                aria-label="Back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="text-sm font-semibold" style={{ color: muted }}>Recurring Payments</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {(() => {
                const status = rpSave.isSaving ? "Saving…"
                  : rpSave.isDirty ? "Unsaved"
                  : rpSave.saveStatus === "saved" ? "Saved"
                  : null;
                const statusColor = rpSave.saveStatus === "saved" && !rpSave.isDirty
                  ? "var(--category-income)"
                  : `color-mix(in srgb, ${text} 40%, transparent)`;
                return status ? (
                  <span style={{ fontSize: "11px", color: statusColor, transition: "color 0.3s" }}>
                    {status}
                  </span>
                ) : null;
              })()}
              <button
                onClick={() => rpSave.onSave?.()}
                disabled={!rpSave.isDirty || rpSave.isSaving}
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "4px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--category-income)",
                  color: "var(--category-income)",
                  backgroundColor: rpSave.isDirty
                    ? "color-mix(in srgb, var(--category-income) 18%, transparent)"
                    : "transparent",
                  boxShadow: rpSave.isDirty
                    ? "0 0 0 2px color-mix(in srgb, var(--category-income) 20%, transparent)"
                    : "none",
                  cursor: rpSave.isDirty && !rpSave.isSaving ? "pointer" : "default",
                  opacity: rpSave.isDirty ? (rpSave.isSaving ? 0.6 : 1) : 0.25,
                  transition: "all 0.2s ease",
                }}
              >
                {rpSave.isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
          <RecurringPaymentsModal inline mobile onSaveStateChange={setRpSave} />
        </div>
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-72 z-50 flex flex-col border-l"
        style={{
          backgroundColor: surface,
          borderColor: border,
          color: text,
          transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 250ms ease",
        }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between border-b shrink-0"
          style={{ borderColor: border }}
        >
          <span className="text-sm font-semibold" style={{ color: muted }}>Menu</span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1 rounded-lg cursor-pointer"
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <>
            <div className="px-5 py-5 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{
                  backgroundColor: `color-mix(in srgb, ${text} 12%, transparent)`,
                  color: text,
                }}
              >
                {user?.first_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div>
                <p className="text-sm font-semibold">{user ? `${user.first_name} ${user.last_name}` : "—"}</p>
                <p className="text-xs" style={{ color: muted }}>
                  {user?.email_address ?? "—"}
                </p>
              </div>
            </div>

            <div className="mx-5 border-t" style={{ borderColor: border }} />

            <div className="px-3 py-3 flex-1">
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer text-left border"
                style={{
                  color: text,
                  borderColor: `color-mix(in srgb, ${text} 18%, transparent)`,
                  backgroundColor: `color-mix(in srgb, ${text} 5%, transparent)`,
                }}
                onClick={() => { setDrawerOpen(false); setRecurringOpen(true); }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M12 7v5l4 2" />
                </svg>
                Recurring Payments
              </button>
            </div>

            <div className="mx-5 border-t" style={{ borderColor: border }} />

            <div className="px-3 py-3">
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors text-left"
                style={{ color: "var(--category-expense)" }}
                onClick={() => { logout(); navigate("/login"); }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Log out
              </button>
            </div>
          </>
      </div>

      {/* Mode toggle */}
      <div className="px-4 pt-4 pb-0 flex justify-center">
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
                  transition:
                    "background-color 200ms ease, color 200ms ease, box-shadow 200ms ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="px-4 pt-4 pb-8 space-y-4">
        {quickMode ? (
          <>
            {/* Quick entry card */}
            <div
              className="rounded-2xl border p-4"
              style={{ backgroundColor: surface, borderColor: quickColor }}
            >
              <p
                className="text-base font-semibold mb-3"
                style={{ color: text }}
              >
                Quick Entry
              </p>

              <select
                value={quickCat}
                onChange={(e) => {
                  setQuickCat(e.target.value);
                  setQuickForm((f) => ({
                    ...f,
                    name: e.target.value === "TIPS" ? "Cash" : "",
                  }));
                }}
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
                <div className="grid grid-cols-[auto_1fr] gap-3">
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
                    className="min-w-0 rounded-xl px-3 py-2.5 text-sm focus:outline-none border"
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
                    : `Add ${["DEBT", "INCOME"].includes(quickCat) ? CATEGORY_CONFIG[quickCat].label : CATEGORY_CONFIG[quickCat].label.replace(/s$/, "")}`}
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
                style={{ borderColor: border, color: text }}
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
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: text }}
                        >
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
                          {new Date(
                            t.transaction_date + "T00:00:00",
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
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
            {/* Category + date preset dropdowns */}
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value)}
                  className="rounded-xl px-3 py-2 text-xs font-semibold border cursor-pointer w-full"
                  style={{
                    color: text,
                    borderColor: activeColor,
                    backgroundColor: dark
                      ? `color-mix(in srgb, ${activeColor} 12%, transparent)`
                      : "var(--light-surface)",
                    boxShadow: `0 0 0 2px color-mix(in srgb, ${activeColor} 20%, transparent)`,
                    colorScheme: dark ? "dark" : "light",
                  }}
                >
                  {CATEGORIES.map((cat) => (
                    <option
                      key={cat}
                      value={cat}
                      style={{ backgroundColor: bg, color: text }}
                    >
                      {cat === "ALL" ? "All" : CATEGORY_CONFIG[cat].label}
                    </option>
                  ))}
                </select>

                <select
                  value={activePreset ?? "custom"}
                  onChange={(e) => handlePreset(e.target.value)}
                  className="rounded-xl px-3 py-2 text-xs font-semibold border cursor-pointer w-full"
                  style={{
                    color: text,
                    borderColor: activeColor,
                    backgroundColor: dark
                      ? `color-mix(in srgb, ${activeColor} 12%, transparent)`
                      : "var(--light-surface)",
                    boxShadow: `0 0 0 2px color-mix(in srgb, ${activeColor} 20%, transparent)`,
                    colorScheme: dark ? "dark" : "light",
                  }}
                >
                  {PRESETS.map((label) => (
                    <option
                      key={label}
                      value={label}
                      style={{ backgroundColor: bg, color: text }}
                    >
                      {label}
                    </option>
                  ))}
                  {!activePreset && (
                    <option
                      value="custom"
                      disabled
                      style={{ backgroundColor: bg, color: text }}
                    >
                      Custom
                    </option>
                  )}
                </select>
              </div>

              {/* Date Range Inputs */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="text-[10px] uppercase font-bold w-7 shrink-0 pr-10"
                    style={{ color: muted }}
                  >
                    From
                  </span>
                  <div className="relative flex-1 min-w-0 overflow-hidden">
                    <input
                      type="date"
                      value={fromVal}
                      onChange={(e) => {
                        setFromVal(e.target.value);
                        handleCustom(e.target.value, toVal);
                      }}
                      className="rounded-xl pl-3 pr-1 py-2 text-[10px] font-semibold border w-[87%]"
                      style={{
                        backgroundColor: dark
                          ? "var(--dark-bg)"
                          : "var(--light-surface)",
                        borderColor: border,
                        color: text,
                        colorScheme: dark ? "dark" : "light",
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="text-[10px] uppercase font-bold w-7 shrink-0"
                    style={{ color: muted }}
                  >
                    To
                  </span>
                  <div className="relative flex-1 min-w-0 overflow-hidden">
                    <input
                      type="date"
                      value={toVal}
                      onChange={(e) => {
                        setToVal(e.target.value);
                        handleCustom(fromVal, e.target.value);
                      }}
                      className="rounded-xl pl-3 pr-1 py-2 text-[10px] font-semibold border w-[87%]"
                      style={{
                        backgroundColor: dark
                          ? "var(--dark-bg)"
                          : "var(--light-surface)",
                        borderColor: border,
                        color: text,
                        colorScheme: dark ? "dark" : "light",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary 2×2 */}
            <div className="grid grid-cols-2 gap-3">
              {[
                activeTab === "ALL"
                  ? { label: "INCOME", value: fmt(summary.totalIn) }
                  : {
                      label: `${CATEGORY_CONFIG[activeTab].label.toUpperCase()} TOTAL`,
                      value: fmt(summary.categoryTotal),
                    },
                activeTab === "ALL"
                  ? { label: "EXPENSES", value: fmt(summary.totalOut) }
                  : INCOME_TYPES.has(activeTab)
                  ? {
                      label: "PAYMENTS",
                      value: String(summary.txCount),
                      deltaLabel: summary.txCount > 0 ? `avg ${fmt(summary.avgTx)} each` : null,
                      deltaUp: true,
                    }
                  : { label: "AVG TRANSACTION", value: fmt(summary.avgTx) },
                activeTab === "ALL"
                  ? {
                      label: "SAVINGS RATE",
                      value:
                        summary.savingsRate !== null
                          ? `${summary.savingsRate.toFixed(1)}%`
                          : "—",
                      deltaLabel:
                        summary.savingsRateDelta != null
                          ? `${summary.savingsRateDelta >= 0 ? "↑" : "↓"} ${Math.abs(summary.savingsRateDelta).toFixed(1)}% vs last month`
                          : null,
                      deltaUp: summary.savingsRateDelta >= 0,
                    }
                  : {
                      label: "VS LAST MONTH",
                      value:
                        summary.categoryDelta != null
                          ? `${summary.categoryDelta >= 0 ? "+" : ""}${summary.categoryDelta.toFixed(1)}%`
                          : "—",
                      deltaLabel:
                        summary.categoryDelta != null
                          ? summary.categoryDelta >= 0
                            ? "↑ higher than last month"
                            : "↓ lower than last month"
                          : null,
                      deltaUp: INCOME_TYPES.has(activeTab)
                        ? summary.categoryDelta >= 0
                        : summary.categoryDelta <= 0,
                      valueColor:
                        summary.categoryDelta != null
                          ? (
                              INCOME_TYPES.has(activeTab)
                                ? summary.categoryDelta >= 0
                                : summary.categoryDelta <= 0
                            )
                            ? "var(--category-income)"
                            : "var(--category-expense)"
                          : undefined,
                    },
                activeTab === "ALL"
                  ? {
                      label: "AVG DAILY SPENDING",
                      value: fmt(summary.avgDailySpending),
                      deltaLabel:
                        summary.avgDailySpendingDelta != null
                          ? `${summary.avgDailySpendingDelta >= 0 ? "↑" : "↓"} ${fmt(Math.abs(summary.avgDailySpendingDelta))} vs last month`
                          : null,
                      deltaUp: summary.avgDailySpendingDelta <= 0,
                    }
                  : {
                      label: INCOME_TYPES.has(activeTab)
                        ? "% OF INCOME"
                        : "% OF SPENDING",
                      value:
                        summary.pctOfTotal != null
                          ? `${summary.pctOfTotal.toFixed(1)}%`
                          : "—",
                    },
              ].map(({ label, value, deltaLabel, deltaUp, valueColor }) => (
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
                    style={{ color: text }}
                  >
                    {label}
                  </p>
                  <p
                    className="text-lg font-bold tracking-tight"
                    style={valueColor ? { color: valueColor } : { color: text }}
                  >
                    {value}
                  </p>
                  {deltaLabel != null && (
                    <p
                      className="text-xs font-semibold mt-1"
                      style={{
                        color: deltaUp
                          ? "var(--category-income)"
                          : "var(--category-expense)",
                      }}
                    >
                      {deltaLabel}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Pie chart */}
            {pieData.length > 0 && (
              <div
                className="rounded-2xl border p-4"
                style={{ backgroundColor: surface, borderColor: activeColor }}
              >
                <p
                  className="text-base font-semibold mb-3"
                  style={{ color: text }}
                >
                  {activeTab === "ALL"
                    ? "Breakdown By Category"
                    : `${CATEGORY_CONFIG[activeTab].label} Breakdown`}
                </p>
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
                      outerRadius={80}
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
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
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
              </div>
            )}

            {/* Bar chart */}
            {barData.length > 0 && (
              <div
                className="rounded-2xl border p-4"
                style={{ backgroundColor: surface, borderColor: activeColor }}
              >
                <p
                  className="text-base font-semibold mb-3"
                  style={{ color: text }}
                >
                  {activeTab === "ALL"
                    ? "Monthly Totals"
                    : `Top ${CATEGORY_CONFIG[activeTab].label} by Name`}
                </p>
                <ResponsiveContainer
                  width="100%"
                  height={200}
                  style={{ pointerEvents: "none" }}
                >
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
                              const val = props.payload?.value ?? "";
                              const label =
                                val.length > 10 ? val.slice(0, 10) + "…" : val;
                              return (
                                <text
                                  x={props.x}
                                  y={props.y}
                                  dy={6}
                                  textAnchor="end"
                                  fontSize={11}
                                  style={{ fill: text }}
                                  transform={`rotate(-35, ${props.x}, ${props.y})`}
                                >
                                  {label}
                                </text>
                              );
                            }
                          : { fontSize: 11, fill: text }
                      }
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${v}`}
                      tick={{ fontSize: 10, fill: text }}
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
                          radius={[5, 5, 0, 0]}
                          barSize={14}
                        />
                        <Bar
                          dataKey="expense"
                          fill="var(--category-expense)"
                          radius={[5, 5, 0, 0]}
                          barSize={14}
                        />
                      </>
                    ) : (
                      <Bar
                        dataKey="total"
                        fill={activeColor}
                        radius={[5, 5, 0, 0]}
                        barSize={20}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Transaction list */}
            <div
              ref={tableRef}
              className="rounded-2xl border"
              style={{ backgroundColor: surface, borderColor: activeColor }}
            >
              <p
                className="px-4 py-3 text-base font-semibold border-b"
                style={{ borderColor: border, color: text }}
              >
                Transactions
              </p>
              {sorted.length === 0 ? (
                <p
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: muted }}
                >
                  No transactions
                </p>
              ) : (
                paginated.map((t) => {
                  const isIncome = INCOME_TYPES.has(t.category);
                  return (
                    <div
                      key={t.id}
                      className="px-4 py-3 border-t flex items-center gap-3"
                      style={{
                        borderColor: border,
                        backgroundColor: t.id === highlightId
                          ? `color-mix(in srgb, var(--category-${t.category.toLowerCase()}) 12%, transparent)`
                          : undefined,
                        transition: "background-color 0.6s ease",
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: text }}
                        >
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
                          {new Date(
                            t.transaction_date + "T00:00:00",
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
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
              {sorted.length > 0 && (
                <div
                  className="px-4 py-3 border-t flex items-center justify-between text-xs"
                  style={{ borderColor: border, color: muted }}
                >
                  <div className="flex items-center gap-2">
                    <span>Rows:</span>
                    {[10, 20, 50].map((n) => (
                      <button
                        key={n}
                        onClick={() => setPerPage(n)}
                        className="px-2 py-1 rounded-lg border font-semibold cursor-pointer transition-all duration-150"
                        style={{
                          color: perPage === n ? activeColor : muted,
                          borderColor: perPage === n ? activeColor : border,
                          backgroundColor:
                            perPage === n
                              ? `color-mix(in srgb, ${activeColor} 12%, transparent)`
                              : "transparent",
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>
                      {`${(page - 1) * perPage + 1}–${Math.min(page * perPage, sorted.length)}`}{" "}
                      of {sorted.length}
                    </span>
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="px-2 py-1 rounded-lg border font-semibold cursor-pointer disabled:opacity-30"
                      style={{ color: muted, borderColor: border }}
                    >
                      ←
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page * perPage >= sorted.length}
                      className="px-2 py-1 rounded-lg border font-semibold cursor-pointer disabled:opacity-30"
                      style={{ color: muted, borderColor: border }}
                    >
                      →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <Footer />
      <RenderWakeButton />
    </div>
  );
}
