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
import { getTransactions, createTransaction, deleteTransaction } from "../api/transactions";
import { deleteRecurringPayment } from "../api/recurringPayments";
import {
  CATEGORIES,
  CATEGORY_CONFIG,
  INCOME_TYPES,
  fmt,
} from "../utils/finance";
import Navbar from "../components/Navbar";
import { PRESETS, getPresetRange } from "../components/DateRangeFilter";
import SummaryCard from "../components/SummaryCard";
import ChartCard from "../components/ChartCard";
import TransactionTable from "../components/TransactionTable";
import EditTransactionModal from "../components/EditTransactionModal";
import Footer from "../components/Footer";
import RenderWakeButton from "../components/RenderWakeButton";

export default function Dashboard() {
  const dark = useTheme();
  const { isDemo } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [addOpen, setAddOpen] = useState(false);
  const addToday = new Date().toLocaleDateString("en-CA");
  const [addForm, setAddForm] = useState({ name: "", amount: "", category: "EXPENSE", transaction_date: addToday });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [typeFilter, setTypeFilter] = useState(null);
  const [sortColumn, setSortColumn] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  function handleSort(col) {
    if (col === "date") {
      if (sortColumn === "date") setSortDir(d => d === "asc" ? "desc" : "asc");
      else { setSortColumn("date"); setSortDir("desc"); }
    } else {
      if (sortColumn !== col) { setSortColumn(col); setSortDir("asc"); }
      else if (sortDir === "asc") setSortDir("desc");
      else { setSortColumn("date"); setSortDir("desc"); }
    }
  }
  const [highlightId, setHighlightId] = useState(null);
  const [activePreset, setActivePreset] = useState("Current Month");
  const [fromVal, setFromVal] = useState("");
  const [toVal, setToVal] = useState("");
  const [catHov, setCatHov] = useState(null);
  const [periodHov, setPeriodHov] = useState(null);

  function handlePreset(label) {
    setActivePreset(label);
    setFromVal("");
    setToVal("");
    setDateRange(getPresetRange(label));
  }

  function handleCustomDate(from, to) {
    setActivePreset(null);
    setDateRange({
      from: from ? new Date(from + "T00:00:00") : null,
      to:   to   ? new Date(to   + "T23:59:59") : null,
    });
  }
  function handleAddChange(e) {
    const { name, value } = e.target;
    setAddForm(f => ({ ...f, [name]: value, ...(name === "category" && value === "TIPS" ? { name: "Cash" } : {}) }));
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    try {
      await createTransaction({ ...addForm, amount: parseFloat(addForm.amount) });
      setAddForm({ name: "", amount: "", category: "EXPENSE", transaction_date: addToday });
      setAddOpen(false);
      refreshTransactions();
    } catch (err) {
      setAddError(err.response?.data?.detail ?? "Something went wrong");
    } finally {
      setAddLoading(false);
    }
  }

  const tableRef = useRef(null);
  const addFormRef = useRef(null);
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

  const smallMultiples = useMemo(() => {
    if (activeTab !== "ALL") return [];
    const byCategory = {};
    filtered.forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + parseFloat(t.amount);
    });
    return Object.entries(byCategory)
      .map(([cat, total]) => ({ cat, total: parseFloat(total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total);
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

  const sorted = useMemo(() => {
    let arr = [...filtered];
    if (typeFilter === "income") arr = arr.filter(t => INCOME_TYPES.has(t.category));
    else if (typeFilter === "expense") arr = arr.filter(t => !INCOME_TYPES.has(t.category));
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortColumn === "name")   return arr.sort((a, b) => dir * a.name.localeCompare(b.name));
    if (sortColumn === "amount") return arr.sort((a, b) => dir * (parseFloat(a.amount) - parseFloat(b.amount)));
    if (sortColumn === "date")   return arr.sort((a, b) => dir * (new Date(a.transaction_date) - new Date(b.transaction_date)));
    return arr.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
  }, [filtered, typeFilter, sortColumn, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    setPage(1);
  }, [filtered, perPage, typeFilter, sortColumn, sortDir]);

  useEffect(() => {
    if (!addOpen) return;
    function handleOutsideClick(e) {
      if (addFormRef.current && !addFormRef.current.contains(e.target)) {
        setAddOpen(false);
        setAddError("");
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [addOpen]);

  const activeColor = `var(--category-${activeTab.toLowerCase()})`;
  const catColor = `var(--category-${addForm.category.toLowerCase()})`;
  const net = summary.totalIn - summary.totalOut;
  const netColor = net >= 0 ? "var(--category-income)" : "var(--category-expense)";
  const text    = dark ? "var(--dark-text)"    : "var(--light-text)";
  const muted   = `color-mix(in srgb, ${text} 50%, transparent)`;
  const bg      = dark ? "var(--dark-bg)"      : "var(--light-bg)";
  const border  = dark ? "var(--dark-border)"  : "var(--light-border)";
  const surface = dark ? "var(--dark-surface)" : "var(--light-surface)";
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

        {/* ── Filter sidebar ── */}
        <aside style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 210,
          height: "100vh",
          zIndex: 9,
          overflowY: "auto",
          borderRight: `1px solid ${border}`,
          backgroundColor: surface,
          padding: "20px 10px",
          paddingTop: 84,
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}>

          {/* Add / inline form */}
          <div ref={addFormRef}>
            <div style={{
              maxHeight: addOpen ? 0 : "42px",
              opacity: addOpen ? 0 : 1,
              overflow: "hidden",
              transition: "max-height 220ms ease, opacity 150ms ease",
              pointerEvents: addOpen ? "none" : "auto",
            }}>
              <button
                onClick={() => setAddOpen(true)}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--category-income) 80%, black)";
                  e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.35)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = "var(--category-income)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer",
                  backgroundColor: "var(--category-income)", color: "#000",
                  fontSize: 13, fontWeight: 700,
                  transition: "background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5v14" />
                </svg>
                Add Transaction
              </button>
            </div>

            <div style={{
              maxHeight: addOpen ? "460px" : 0,
              opacity: addOpen ? 1 : 0,
              overflow: "hidden",
              transition: "max-height 250ms cubic-bezier(0.4,0,0.2,1), opacity 200ms ease",
            }}>
              <form onSubmit={handleAddSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Name", name: "name", type: "text", placeholder: "e.g. Netflix", required: addForm.category !== "TIPS", disabled: addForm.category === "TIPS" },
                  { label: "Amount", name: "amount", type: "number", placeholder: "$0.00", required: true },
                ].map(({ label, ...props }) => (
                  <div key={props.name}>
                    <p style={{ fontSize: 10, color: muted, marginBottom: 3, paddingLeft: 2 }}>{label}</p>
                    <input {...props} value={addForm[props.name]} onChange={handleAddChange} min={props.type === "number" ? "0.01" : undefined} step={props.type === "number" ? "0.01" : undefined}
                      style={{ width: "100%", borderRadius: 7, padding: "6px 8px", fontSize: 12, border: `1px solid ${border}`, backgroundColor: bg, color: text, boxSizing: "border-box", outline: "none" }}
                    />
                  </div>
                ))}
                <div>
                  <p style={{ fontSize: 10, color: muted, marginBottom: 3, paddingLeft: 2 }}>Category</p>
                  <select name="category" value={addForm.category} onChange={handleAddChange}
                    style={{ width: "100%", borderRadius: 7, padding: "6px 8px", fontSize: 12, border: `1px solid ${border}`, backgroundColor: bg, color: catColor, boxSizing: "border-box", outline: "none" }}
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p style={{ fontSize: 10, color: muted, marginBottom: 3, paddingLeft: 2 }}>Date</p>
                  <input type="date" name="transaction_date" value={addForm.transaction_date} onChange={handleAddChange} required
                    style={{ width: "100%", borderRadius: 7, padding: "6px 8px", fontSize: 12, border: `1px solid ${border}`, backgroundColor: bg, color: text, colorScheme: dark ? "dark" : "light", boxSizing: "border-box", outline: "none" }}
                  />
                </div>
                {addError && <p style={{ fontSize: 11, color: "var(--category-expense)" }}>{addError}</p>}
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={() => { setAddOpen(false); setAddError(""); }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${text} 10%, transparent)`; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: muted, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "background-color 150ms ease" }}
                  >Cancel</button>
                  <button type="submit" disabled={addLoading}
                    onMouseEnter={e => { if (!addLoading) e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${catColor} 25%, transparent)`; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${catColor} 15%, transparent)`; }}
                    style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1px solid ${catColor}`, backgroundColor: `color-mix(in srgb, ${catColor} 15%, transparent)`, color: catColor, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: addLoading ? 0.6 : 1, transition: "background-color 150ms ease" }}
                  >{addLoading ? "Adding…" : "Add"}</button>
                </div>
              </form>
            </div>
          </div>

          {/* Category */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: muted, marginBottom: 6, paddingLeft: 10 }}>CATEGORY</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {CATEGORIES.map(cat => {
              const catColor = `var(--category-${cat.toLowerCase()})`;
              const isActive = activeTab === cat;
              const isHov = catHov === cat;
              return (
                <button key={cat} onClick={() => setActiveTab(cat)}
                  onMouseEnter={() => setCatHov(cat)} onMouseLeave={() => setCatHov(null)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    color: isActive ? catColor : isHov ? catColor : text,
                    backgroundColor: isActive ? `color-mix(in srgb, ${catColor} 12%, transparent)` : isHov ? `color-mix(in srgb, ${catColor} 7%, transparent)` : "transparent",
                    transition: "background-color 120ms, color 120ms",
                  }}
                >
                  {cat === "ALL" ? "All" : CATEGORY_CONFIG[cat].label}
                </button>
              );
            })}
            </div>
          </div>

          {/* Period */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: muted, marginBottom: 6, paddingLeft: 10 }}>PERIOD</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {PRESETS.map(label => {
              const isActive = activePreset === label;
              const isHov = periodHov === label;
              return (
                <button key={label} onClick={() => handlePreset(label)}
                  onMouseEnter={() => setPeriodHov(label)} onMouseLeave={() => setPeriodHov(null)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    color: isActive ? activeColor : isHov ? activeColor : text,
                    backgroundColor: isActive ? `color-mix(in srgb, ${activeColor} 12%, transparent)` : isHov ? `color-mix(in srgb, ${activeColor} 7%, transparent)` : "transparent",
                    transition: "background-color 120ms, color 120ms",
                  }}
                >
                  {label}
                </button>
              );
            })}
            </div>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6, padding: "0 4px" }}>
              {[["From", fromVal, v => { setFromVal(v); handleCustomDate(v, toVal); }], ["To", toVal, v => { setToVal(v); handleCustomDate(fromVal, v); }]].map(([label, val, onChange]) => (
                <div key={label}>
                  <p style={{ fontSize: 10, color: muted, marginBottom: 3, paddingLeft: 2 }}>{label}</p>
                  <input type="date" value={val} onChange={e => onChange(e.target.value)}
                    style={{ width: "100%", borderRadius: 7, padding: "5px 8px", fontSize: 12, border: `1px solid ${border}`, backgroundColor: bg, color: text, colorScheme: dark ? "dark" : "light", boxSizing: "border-box" }}
                  />
                </div>
              ))}
            </div>
          </div>

        </aside>

        {/* ── Main content ── */}
        <div style={{ marginLeft: 210 }}>
        <main className="px-6 py-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {activeTab === "ALL" ? (
            <>
              <SummaryCard
                label="INCOME"
                value={fmt(summary.totalIn)}
                activeColor="var(--category-income)"
                valueColor="var(--category-income)"
              />
              <SummaryCard
                label="EXPENSES"
                value={fmt(summary.totalOut)}
                activeColor="var(--category-expense)"
                valueColor="var(--category-expense)"
              />
              <SummaryCard
                label="NET"
                value={(net >= 0 ? "+" : "-") + fmt(Math.abs(net))}
                activeColor={netColor}
                valueColor={netColor}
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
                  INCOME_TYPES.has(activeTab) ? "% OF TOTAL INCOME" : "% OF TOTAL EXPENSES"
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
                ? "Category Breakdown"
                : "Spending Over Time"
            }
            activeColor={activeColor}
          >
            {activeTab === "ALL" ? (
              pieData.length > 0 ? (
                <div style={{ height: 275, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ position: "relative" }}>
                  <ResponsiveContainer
                    width="100%"
                    height={215}
                    style={{ pointerEvents: "none" }}
                  >
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={100}
                        strokeWidth={0}
                        animationBegin={0}
                        animationDuration={500}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipProps} formatter={(v) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                    <span style={{ fontSize: 26, fontWeight: 700, color: text, lineHeight: 1 }}>{filtered.length}</span>
                    <span style={{ fontSize: 11, color: muted, marginTop: 4 }}>transactions</span>
                  </div>
                  </div>
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
                </div>
              ) : (
                <Empty />
              )
            ) : areaData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height={230}
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
                ? "Category Totals"
                : `Top ${CATEGORY_CONFIG[activeTab].label} by Name`
            }
            activeColor={activeColor}
          >
            {activeTab === "ALL" ? (
              smallMultiples.length > 0 ? (() => {
                const max = Math.max(...smallMultiples.map((d) => d.total));
                return (
                  <div style={{ height: 250, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14, padding: "8px 0" }}>
                    {smallMultiples.map(({ cat, total }) => {
                      const catColor = `var(--category-${cat.toLowerCase()})`;
                      const pct = max > 0 ? (total / max) * 100 : 0;
                      return (
                        <div key={cat} style={{ display: "flex", alignItems: "center", gap: 18 }}>
                          <span style={{ width: 130, fontSize: 14, fontWeight: 600, color: catColor, flexShrink: 0, textAlign: "right" }}>
                            {CATEGORY_CONFIG[cat]?.label ?? cat}
                          </span>
                          <div style={{ flex: 1, height: 14, borderRadius: 7, backgroundColor: `color-mix(in srgb, ${catColor} 15%, transparent)` }}>
                            <div style={{ width: `${pct}%`, height: "100%", borderRadius: 7, backgroundColor: catColor, transition: "width 0.4s ease" }} />
                          </div>
                          <span style={{ width: 80, fontSize: 14, fontWeight: 600, color: text, flexShrink: 0 }}>{fmt(total)}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })() : <Empty />
            ) : barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={230} style={{ pointerEvents: "none" }}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    height={60}
                    tick={(props) => {
                      const val = props.payload?.value ?? "";
                      const label = val.length > 12 ? val.slice(0, 12) + "…" : val;
                      return (
                        <text x={props.x} y={props.y} dy={8} textAnchor="end" fontSize={12} style={{ fill: text }} transform={`rotate(-35, ${props.x}, ${props.y})`}>
                          {label}
                        </text>
                      );
                    }}
                  />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12, fill: text }} />
                  <Tooltip {...tooltipProps} formatter={(v) => fmt(v)} cursor={false} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={32}>
                    {barData.map((entry) => <Cell key={entry.month} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty />}
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
            onEdit={setEditingTransaction}
            onDelete={handleDelete}
            activeColor={activeColor}
            highlightId={highlightId}
            sortColumn={sortColumn}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </div>
      </main>
        <Footer />
        </div>



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
