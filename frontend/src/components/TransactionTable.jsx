import { useState } from "react";
import { CATEGORY_CONFIG, INCOME_TYPES, fmt } from "../utils/finance";
import { useTheme } from "../hooks/useTheme";

export default function TransactionTable({ rows, onAdd, activeColor, page, perPage, total, onPageChange, onPerPageChange }) {
  const dark = useTheme();
  const [addHovered, setAddHovered] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState(null);

  const bg     = dark ? "var(--dark-surface)" : "var(--light-surface)";
  const border = dark ? "var(--dark-border)"  : "var(--light-border)";
  const text   = dark ? "var(--dark-text)"    : "var(--light-text)";
  const muted  = `color-mix(in srgb, ${text} 50%, transparent)`;

  return (
    <div className="rounded-2xl border" style={{ backgroundColor: bg, borderColor: activeColor, color: text }}>
      <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: border }}>
        <h3 className="text-xl font-semibold">Transactions</h3>
        <button
          onClick={onAdd}
          onMouseEnter={() => setAddHovered(true)}
          onMouseLeave={() => setAddHovered(false)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border whitespace-nowrap transition-all duration-150 cursor-pointer active:scale-95"
          style={{
            color: activeColor,
            borderColor: activeColor,
            backgroundColor: `color-mix(in srgb, ${activeColor} ${addHovered ? "20%" : "12%"}, transparent)`,
            boxShadow: `0 0 0 2px color-mix(in srgb, ${activeColor} 20%, transparent)`,
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5v14" />
          </svg>
          Add
        </button>
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-left text-base" style={{ color: muted }}>
            <th className="px-6 py-3 font-medium">Date</th>
            <th className="px-6 py-3 font-medium">Name</th>
            <th className="px-6 py-3 font-medium">Category</th>
            <th className="px-6 py-3 font-medium text-right">Amount</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-14 text-center text-base" style={{ color: muted }}>
                No transactions
              </td>
            </tr>
          ) : (
            rows.map((t) => (
                <tr key={t.id} className="border-t" style={{ borderColor: border }}>
                  <td className="px-6 py-4 text-base whitespace-nowrap" style={{ color: muted }}>
                    {new Date(t.transaction_date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 text-lg font-medium">{t.name}</td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-base font-semibold"
                      style={{ color: `var(--category-${t.category.toLowerCase()})` }}
                    >
                      {CATEGORY_CONFIG[t.category]?.label ?? t.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-lg font-bold" style={{ color: INCOME_TYPES.has(t.category) ? "var(--category-income)" : "var(--category-expense)" }}>
                    {INCOME_TYPES.has(t.category) ? "+" : "-"}{fmt(t.amount)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button className="cursor-pointer rounded-lg p-1" style={{ color: muted }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="5" cy="12" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="19" cy="12" r="2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
          )}
        </tbody>
      </table>

      <div className="px-6 py-3 border-t flex items-center justify-between text-sm flex-wrap gap-3" style={{ borderColor: border, color: muted }}>
        <div className="flex items-center gap-2">
          <span className="text-xs">Rows per page:</span>
          {[10, 20, 50].map((n) => {
            const active = perPage === n;
            const hov = hoveredBtn === `pp-${n}`;
            return (
              <button
                key={n}
                onClick={() => onPerPageChange(n)}
                onMouseEnter={() => setHoveredBtn(`pp-${n}`)}
                onMouseLeave={() => setHoveredBtn(null)}
                className="px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all duration-150"
                style={{
                  color: active || hov ? activeColor : muted,
                  borderColor: active || hov ? activeColor : border,
                  backgroundColor: active
                    ? dark ? `color-mix(in srgb, ${activeColor} ${hov ? "20%" : "12%"}, transparent)` : "var(--light-surface)"
                    : hov
                    ? `color-mix(in srgb, ${activeColor} 12%, transparent)`
                    : "transparent",
                  boxShadow: active || hov ? `0 0 0 2px color-mix(in srgb, ${activeColor} 20%, transparent)` : "none",
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span>
            {total === 0 ? "0" : `${(page - 1) * perPage + 1}–${Math.min(page * perPage, total)}`} of {total}
          </span>
          {[
            { key: "prev", label: "←", disabled: page === 1, onClick: () => onPageChange(page - 1) },
            { key: "next", label: "→", disabled: page * perPage >= total, onClick: () => onPageChange(page + 1) },
          ].map(({ key, label, disabled, onClick }) => {
            const hov = hoveredBtn === key && !disabled;
            return (
              <button
                key={key}
                onClick={onClick}
                disabled={disabled}
                onMouseEnter={() => !disabled && setHoveredBtn(key)}
                onMouseLeave={() => setHoveredBtn(null)}
                className="px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer disabled:opacity-30 transition-all duration-150"
                style={{
                  color: hov ? activeColor : `color-mix(in srgb, ${text} 60%, transparent)`,
                  borderColor: hov ? activeColor : `color-mix(in srgb, ${text} 60%, transparent)`,
                  backgroundColor: hov ? `color-mix(in srgb, ${activeColor} 12%, transparent)` : "transparent",
                  boxShadow: hov ? `0 0 0 2px color-mix(in srgb, ${activeColor} 20%, transparent)` : "none",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
