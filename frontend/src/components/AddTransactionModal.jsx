import { useState } from "react";
import { CATEGORY_CONFIG } from "../utils/finance";
import { createTransaction } from "../api/transactions";
import { useTheme } from "../hooks/useTheme";

const CATEGORY_OPTIONS = Object.entries(CATEGORY_CONFIG).map(
  ([key, { label }]) => ({
    value: key,
    label,
  }),
);

export default function AddTransactionModal({
  activeTab,
  activeColor,
  onClose,
  onSaved,
}) {
  const dark = useTheme();

  const bg = dark ? "var(--dark-surface)" : "var(--light-surface)";
  const border = dark ? "var(--dark-border)" : "var(--light-border)";
  const text = dark ? "var(--dark-text)" : "var(--light-text)";
  const input = dark ? "var(--dark-bg)" : "var(--light-bg)";

  const today = new Date().toISOString().split("T")[0];
  const defaultCategory = activeTab === "ALL" ? "EXPENSE" : activeTab;

  const [form, setForm] = useState({
    name: "",
    amount: "",
    category: defaultCategory,
    transaction_date: today,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelHovered, setCancelHovered] = useState(false);
  const [submitHovered, setSubmitHovered] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await createTransaction({ ...form, amount: parseFloat(form.amount) });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: input,
    borderColor: border,
    color: text,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border shadow-2xl"
        style={{ backgroundColor: bg, borderColor: border, color: text }}
      >
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: border }}
        >
          <h2 className="text-base font-semibold">Add Transaction</h2>
          <button
            onClick={onClose}
            className="transition-colors cursor-pointer"
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
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="e.g. Netflix, Salary..."
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none border"
              style={inputStyle}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1.5">Amount</label>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                required
                min="0.01"
                step="0.01"
                placeholder="$0.00"
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none border"
                style={inputStyle}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1.5">
                Category
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none border"
                style={inputStyle}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Date</label>
            <input
              type="date"
              name="transaction_date"
              value={form.transaction_date}
              onChange={handleChange}
              required
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none border"
              style={inputStyle}
            />
          </div>

          {error && (
            <div
              className="text-sm px-4 py-2.5 rounded-xl border text-red-500"
              style={{ borderColor: border }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              onMouseEnter={() => setCancelHovered(true)}
              onMouseLeave={() => setCancelHovered(false)}
              className="flex-1 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all"
              style={{
                borderColor: border,
                color: text,
                backgroundColor: cancelHovered
                  ? `color-mix(in srgb, ${text} 8%, transparent)`
                  : "transparent",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              onMouseEnter={() => setSubmitHovered(true)}
              onMouseLeave={() => setSubmitHovered(false)}
              className="flex-1 py-2.5 rounded-xl border text-sm font-medium disabled:opacity-50 transition-all cursor-pointer active:scale-95"
              style={{
                backgroundColor: `color-mix(in srgb, ${text} ${submitHovered ? "18%" : "10%"}, transparent)`,
                borderColor: border,
                color: text,
              }}
            >
              {loading ? "Saving..." : "Add Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
