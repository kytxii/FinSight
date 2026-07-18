import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { fmt } from "../utils/finance";
import { getToday } from "../utils/time";
import {
  getPaycheckSchedules,
  createPaycheckSchedule,
  updatePaycheckSchedule,
  deletePaycheckSchedule,
  getPaychecks,
  updatePaycheckAmount,
  getBalanceAnchor,
  setBalanceAnchor,
} from "../api/paychecks";

const FREQUENCY_OPTIONS = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Biweekly" },
  { value: "SEMI_MONTHLY", label: "Semi-monthly" },
  { value: "MONTHLY", label: "Monthly" },
];

const FREQUENCY_LABELS = Object.fromEntries(FREQUENCY_OPTIONS.map(({ value, label }) => [value, label]));

function fmtDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PaychecksPanel({ mobile = false, onSaved }) {
  const dark = useTheme();
  const bg     = dark ? "var(--dark-surface)" : "var(--light-surface)";
  const border = dark ? "var(--dark-border)"  : "var(--light-border)";
  const text   = dark ? "var(--dark-text)"    : "var(--light-text)";
  const muted  = `color-mix(in srgb, ${text} 45%, transparent)`;
  const faint  = `color-mix(in srgb, ${text} 5%, ${bg})`;
  const nudge  = "var(--category-savings)";

  const [loading, setLoading]           = useState(true);
  const [schedules, setSchedules]       = useState([]);
  const [paychecks, setPaychecks]       = useState([]);
  const [pending, setPending]           = useState([]);

  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleDraft, setScheduleDraft]         = useState({ frequency: "BIWEEKLY", start_date: getToday() });
  const [creatingSchedule, setCreatingSchedule]   = useState(false);
  const [scheduleError, setScheduleError]         = useState("");

  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [scheduleEditDraft, setScheduleEditDraft] = useState({ frequency: "BIWEEKLY", start_date: "" });
  const [deleteConfirmId, setDeleteConfirmId]     = useState(null);
  const [scheduleActionError, setScheduleActionError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [rowErrorId, setRowErrorId] = useState(null);

  const [balanceAnchor, setBalanceAnchorState] = useState(null);
  const [editingBalance, setEditingBalance]   = useState(false);
  const [balanceDraft, setBalanceDraft]       = useState({ current_balance: "", as_of_date: getToday() });
  const [balanceError, setBalanceError]       = useState("");

  async function load() {
    setLoading(true);
    try {
      const [schedulesRes, paychecksRes, balanceRes] = await Promise.all([getPaycheckSchedules(), getPaychecks(), getBalanceAnchor()]);
      setSchedules(schedulesRes.data);
      setPaychecks(paychecksRes.data.paychecks);
      setPending(paychecksRes.data.pending_paychecks);
      setBalanceAnchorState(balanceRes.data);
      if (balanceRes.data) {
        setBalanceDraft({ current_balance: String(balanceRes.data.current_balance), as_of_date: balanceRes.data.as_of_date });
      }
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function refreshPaychecksInBackground() {
    getPaychecks().then(r => {
      setPaychecks(r.data.paychecks);
      setPending(r.data.pending_paychecks);
    }).catch(() => {});
  }

  async function handleCreateSchedule(e) {
    e.preventDefault();
    setScheduleError("");
    setCreatingSchedule(true);
    try {
      const res = await createPaycheckSchedule(scheduleDraft);
      setSchedules(prev => [...prev, res.data]);
      setScheduleDraft({ frequency: "BIWEEKLY", start_date: getToday() });
      setShowScheduleForm(false);
      onSaved?.();
      refreshPaychecksInBackground(); // new schedule needs its first paycheck backfilled server-side
    } catch (err) {
      setScheduleError(err.response?.data?.detail ?? "Something went wrong");
    } finally {
      setCreatingSchedule(false);
    }
  }

  function startEditSchedule(s) {
    setEditingScheduleId(s.id);
    setScheduleEditDraft({ frequency: s.frequency, start_date: s.start_date });
    setDeleteConfirmId(null);
    setScheduleActionError("");
  }

  async function commitEditSchedule(id) {
    const previous = schedules.find(s => s.id === id);
    const draft = scheduleEditDraft;
    setScheduleActionError("");

    // Optimistic: reflect the edit immediately, sync with the server in the background.
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...draft } : s));
    setEditingScheduleId(null);

    try {
      const res = await updatePaycheckSchedule(id, draft);
      setSchedules(prev => prev.map(s => s.id === id ? res.data : s));
      onSaved?.();
      refreshPaychecksInBackground(); // frequency/date changes regenerate paychecks server-side
    } catch (err) {
      setSchedules(prev => prev.map(s => s.id === id ? previous : s));
      setScheduleActionError(err.response?.data?.detail ?? "Something went wrong");
    }
  }

  async function handleDeleteSchedule(id) {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(prev => prev === id ? null : prev), 3000);
      return;
    }
    setDeleteConfirmId(null);
    setScheduleActionError("");

    const previous = schedules.find(s => s.id === id);
    // Optimistic: drop it from the active list immediately.
    setSchedules(prev => prev.filter(s => s.id !== id));

    try {
      await deletePaycheckSchedule(id);
      onSaved?.();
    } catch (err) {
      if (previous) setSchedules(prev => [...prev, previous]);
      setScheduleActionError(err.response?.data?.detail ?? "Something went wrong");
    }
  }

  function startEdit(p) {
    setEditingId(p.id);
    setEditValue(p.amount != null ? String(p.amount) : "");
  }

  async function commitEdit(id) {
    setEditingId(null);
    const n = parseFloat(editValue);
    if (isNaN(n) || n <= 0) return;

    const previous = paychecks.find(p => p.id === id);
    // Optimistic: show the new amount immediately, sync with the server in the background.
    setPaychecks(prev => prev.map(p => p.id === id ? { ...p, amount: n } : p));
    setPending(prev => prev.filter(p => p.id !== id));

    try {
      const res = await updatePaycheckAmount(id, { amount: n });
      setPaychecks(prev => prev.map(p => p.id === id ? res.data : p));
      // Only notify the dashboard once the write has actually landed - onSaved
      // triggers a surplus/estimate recompute that reads the freshly-saved value.
      onSaved?.();
      refreshPaychecksInBackground(); // recompute the Upcoming row's guessed amount too
    } catch {
      setPaychecks(prev => prev.map(p => p.id === id ? previous : p));
      if (previous && previous.pay_date <= today && previous.amount == null) {
        setPending(prev => [...prev, previous]);
      }
      setRowErrorId(id);
      setTimeout(() => setRowErrorId(null), 3000);
    }
  }

  async function handleSaveBalance() {
    const n = parseFloat(balanceDraft.current_balance);
    if (isNaN(n)) return;
    setBalanceError("");

    const previous = balanceAnchor;
    // Optimistic: show the new balance immediately, sync with the server in the background.
    setBalanceAnchorState({ ...(previous ?? {}), current_balance: n, as_of_date: balanceDraft.as_of_date });
    setEditingBalance(false);

    try {
      const res = await setBalanceAnchor({ current_balance: n, as_of_date: balanceDraft.as_of_date });
      setBalanceAnchorState(res.data);
      onSaved?.();
    } catch (err) {
      setBalanceAnchorState(previous);
      setEditingBalance(true);
      setBalanceError(err.response?.data?.detail ?? "Something went wrong");
    }
  }

  const today = getToday();
  const fieldStyle = {
    width: "100%", borderRadius: 8, padding: "7px 9px", fontSize: mobile ? 14 : 13,
    border: `1px solid ${border}`, backgroundColor: bg, color: text,
    boxSizing: "border-box", outline: "none",
  };
  const labelStyle = { fontSize: 10, color: muted, marginBottom: 3, paddingLeft: 2 };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 32px", display: "flex", flexDirection: "column", gap: "24px", color: text }}>

      {/* ── Loading ── */}
      {loading && (
        <p style={{ fontSize: 13, color: muted, textAlign: "center", padding: "24px 0" }}>Loading…</p>
      )}

      {!loading && (
        <>
          {/* ── Schedules ── */}
          <div>
            <p style={{ ...labelStyle, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              Paycheck Schedule
            </p>

            {schedules.length === 0 && !showScheduleForm && (
              <div style={{ textAlign: "center", padding: "20px 12px", border: `1px dashed ${border}`, borderRadius: 12 }}>
                <p style={{ fontSize: 13, color: muted, marginBottom: 10 }}>No paycheck schedule yet</p>
                <button
                  onClick={() => setShowScheduleForm(true)}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8,
                    border: "1px solid var(--category-income)", color: "var(--category-income)",
                    backgroundColor: "color-mix(in srgb, var(--category-income) 12%, transparent)",
                    cursor: "pointer",
                  }}
                >
                  Schedule a Paycheck
                </button>
              </div>
            )}

            {schedules.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: showScheduleForm ? 12 : 0 }}>
                {schedules.map(s => (
                  editingScheduleId === s.id ? (
                    <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px", borderRadius: 10, border: `1px solid ${border}`, backgroundColor: faint }}>
                      <select
                        value={scheduleEditDraft.frequency}
                        onChange={e => setScheduleEditDraft(d => ({ ...d, frequency: e.target.value }))}
                        style={fieldStyle}
                      >
                        {FREQUENCY_OPTIONS.map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={scheduleEditDraft.start_date}
                        onChange={e => setScheduleEditDraft(d => ({ ...d, start_date: e.target.value }))}
                        style={{ ...fieldStyle, colorScheme: dark ? "dark" : "light" }}
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" onClick={() => setEditingScheduleId(null)}
                          style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                        >Cancel</button>
                        <button type="button" onClick={() => commitEditSchedule(s.id)}
                          style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: "1px solid var(--category-income)", backgroundColor: "color-mix(in srgb, var(--category-income) 15%, transparent)", color: "var(--category-income)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                        >Save</button>
                      </div>
                    </div>
                  ) : (
                    <div key={s.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                      padding: "8px 12px", borderRadius: 10, border: `1px solid ${border}`, backgroundColor: faint,
                      fontSize: mobile ? 13 : 12,
                    }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{FREQUENCY_LABELS[s.frequency] ?? s.frequency}</span>
                        <span style={{ color: muted, marginLeft: 8 }}>since {fmtDate(s.start_date)}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <button onClick={() => startEditSchedule(s)} aria-label="Edit schedule"
                          style={{ color: muted, background: "none", border: "none", cursor: "pointer", padding: 3, display: "inline-flex" }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDeleteSchedule(s.id)} aria-label="Delete schedule"
                          style={{ color: deleteConfirmId === s.id ? "var(--category-expense)" : muted, background: "none", border: "none", cursor: "pointer", padding: 3, display: "inline-flex" }}
                        >
                          {deleteConfirmId === s.id ? (
                            <span style={{ fontSize: 11, fontWeight: 600 }}>Confirm?</span>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                ))}
                {scheduleActionError && <p style={{ fontSize: 11, color: "var(--category-expense)" }}>{scheduleActionError}</p>}
                {!showScheduleForm && (
                  <button
                    onClick={() => setShowScheduleForm(true)}
                    style={{ alignSelf: "flex-start", fontSize: 12, color: muted, background: "none", border: "none", cursor: "pointer", padding: "4px 2px" }}
                  >
                    + Add another schedule
                  </button>
                )}
              </div>
            )}

            {showScheduleForm && (
              <form onSubmit={handleCreateSchedule} style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px", borderRadius: 12, border: `1px solid ${border}`, backgroundColor: faint }}>
                <div>
                  <p style={labelStyle}>Frequency</p>
                  <select
                    value={scheduleDraft.frequency}
                    onChange={e => setScheduleDraft(d => ({ ...d, frequency: e.target.value }))}
                    style={fieldStyle}
                  >
                    {FREQUENCY_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p style={labelStyle}>First pay date</p>
                  <input
                    type="date"
                    value={scheduleDraft.start_date}
                    onChange={e => setScheduleDraft(d => ({ ...d, start_date: e.target.value }))}
                    required
                    style={{ ...fieldStyle, colorScheme: dark ? "dark" : "light" }}
                  />
                </div>
                {scheduleError && <p style={{ fontSize: 11, color: "var(--category-expense)" }}>{scheduleError}</p>}
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={() => { setShowScheduleForm(false); setScheduleError(""); }}
                    style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >Cancel</button>
                  <button type="submit" disabled={creatingSchedule}
                    style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1px solid var(--category-income)", backgroundColor: "color-mix(in srgb, var(--category-income) 15%, transparent)", color: "var(--category-income)", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: creatingSchedule ? 0.6 : 1 }}
                  >{creatingSchedule ? "Creating…" : "Create"}</button>
                </div>
              </form>
            )}
          </div>

          {(schedules.length > 0 || paychecks.length > 0) && (
            <>
              {/* ── Starting balance ── */}
              <div>
                <p style={{ ...labelStyle, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                  Starting Balance
                </p>

                {editingBalance ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px", borderRadius: 10, border: `1px solid ${border}`, backgroundColor: faint }}>
                    <div>
                      <p style={labelStyle}>Checking balance</p>
                      <input
                        type="number" step="0.01" min="0" placeholder="0.00"
                        value={balanceDraft.current_balance}
                        onChange={e => setBalanceDraft(d => ({ ...d, current_balance: e.target.value }))}
                        style={fieldStyle}
                      />
                    </div>
                    <div>
                      <p style={labelStyle}>As of</p>
                      <input
                        type="date"
                        value={balanceDraft.as_of_date}
                        onChange={e => setBalanceDraft(d => ({ ...d, as_of_date: e.target.value }))}
                        style={{ ...fieldStyle, colorScheme: dark ? "dark" : "light" }}
                      />
                    </div>
                    {balanceError && <p style={{ fontSize: 11, color: "var(--category-expense)" }}>{balanceError}</p>}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" onClick={() => { setEditingBalance(false); setBalanceError(""); }}
                        style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      >Cancel</button>
                      <button type="button" onClick={handleSaveBalance} disabled={balanceDraft.current_balance === ""}
                        style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: "1px solid var(--category-income)", backgroundColor: "color-mix(in srgb, var(--category-income) 15%, transparent)", color: "var(--category-income)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >Save</button>
                    </div>
                  </div>
                ) : balanceAnchor ? (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 12px", borderRadius: 10, border: `1px solid ${border}`, backgroundColor: faint,
                    fontSize: mobile ? 13 : 12,
                  }}>
                    <div>
                      <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt(balanceAnchor.current_balance)}</span>
                      <span style={{ color: muted, marginLeft: 8 }}>as of {fmtDate(balanceAnchor.as_of_date)}</span>
                    </div>
                    <button onClick={() => setEditingBalance(true)} aria-label="Edit starting balance"
                      style={{ color: muted, background: "none", border: "none", cursor: "pointer", padding: 3, display: "inline-flex", flexShrink: 0 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "16px 12px", border: `1px dashed ${border}`, borderRadius: 12 }}>
                    <p style={{ fontSize: 13, color: muted, marginBottom: 10 }}>No starting balance set</p>
                    <button
                      onClick={() => setEditingBalance(true)}
                      style={{
                        fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8,
                        border: "1px solid var(--category-income)", color: "var(--category-income)",
                        backgroundColor: "color-mix(in srgb, var(--category-income) 12%, transparent)",
                        cursor: "pointer",
                      }}
                    >
                      Set Starting Balance
                    </button>
                  </div>
                )}
                <p style={{ fontSize: 10, color: muted, marginTop: 6 }}>
                  Safe to Spend on the dashboard builds forward from this using your actual transactions.
                </p>
              </div>

              {/* ── Pending nudge ── */}
              {pending.length > 0 && (
                <div style={{
                  padding: "10px 12px", borderRadius: 10,
                  border: `1px solid color-mix(in srgb, ${nudge} 40%, transparent)`,
                  backgroundColor: `color-mix(in srgb, ${nudge} 12%, transparent)`,
                  fontSize: 12, color: text,
                }}>
                  {pending.length} paycheck{pending.length !== 1 ? "s" : ""} need{pending.length === 1 ? "s" : ""} an amount — click below to fill in
                </div>
              )}

              {/* ── Paycheck list ── */}
              <div>
                <p style={{ ...labelStyle, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                  Paychecks
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {paychecks.map(p => {
                    const isFuture = p.pay_date > today;
                    const needsAmount = !isFuture && p.amount == null;
                    const isEditing = editingId === p.id;

                    return (
                      <div key={p.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 12px", borderRadius: 10, border: `1px solid ${border}`,
                        backgroundColor: isFuture ? "transparent" : faint,
                        opacity: isFuture ? 0.6 : 1,
                      }}>
                        <span style={{ fontSize: mobile ? 13 : 12, fontWeight: 500 }}>{fmtDate(p.pay_date)}</span>

                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {isEditing ? (
                          <input autoFocus
                            type="number" step="0.01" min="0.01"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => commitEdit(p.id)}
                            onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditingId(null); }}
                            style={{ width: 90, textAlign: "right", background: "transparent", color: text, border: "none", outline: "none", fontSize: mobile ? 14 : 13, fontFamily: "inherit" }}
                          />
                        ) : isFuture ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: muted, padding: "2px 8px", borderRadius: 999, backgroundColor: `color-mix(in srgb, ${text} 8%, transparent)` }}>
                            {p.estimated_amount != null ? `~${fmt(p.estimated_amount)}` : "Upcoming"}
                          </span>
                        ) : needsAmount ? (
                          <button
                            onClick={() => startEdit(p)}
                            style={{
                              fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                              border: `1px dashed color-mix(in srgb, ${nudge} 60%, transparent)`,
                              color: nudge, backgroundColor: `color-mix(in srgb, ${nudge} 10%, transparent)`,
                              cursor: "pointer",
                            }}
                          >
                            Add amount
                          </button>
                        ) : (
                          <span
                            onClick={() => startEdit(p)}
                            style={{ cursor: "text", fontSize: mobile ? 14 : 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
                          >
                            {fmt(p.amount)}
                          </span>
                        )}

                        {rowErrorId === p.id && (
                          <span style={{ fontSize: 10, color: "var(--category-expense)" }}>Failed</span>
                        )}
                        </div>
                      </div>
                    );
                  })}

                  {paychecks.length === 0 && (
                    <p style={{ fontSize: 12, color: muted, textAlign: "center", padding: "16px 0" }}>No paychecks yet</p>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
