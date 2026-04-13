import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../context/AuthContext";
import { CATEGORY_CONFIG, fmt } from "../utils/finance";

export default function Navbar({ transactions = [], onSelectTransaction }) {
  const dark = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [themeHovered, setThemeHovered] = useState(false);
  const [menuHovered, setMenuHovered] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  const bg     = dark ? "var(--dark-surface)" : "var(--light-surface)";
  const border = dark ? "var(--dark-border)"  : "var(--light-border)";
  const text   = dark ? "var(--dark-text)"    : "var(--light-text)";
  const input  = dark ? "var(--dark-bg)"      : "var(--light-bg)";
  const muted  = `color-mix(in srgb, ${text} 50%, transparent)`;

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(val), 300);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      setDebouncedQuery("");
    }
  };

  useEffect(() => {
    function onMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
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

  const handleSelect = (t) => {
    setQuery("");
    setDebouncedQuery("");
    setOpen(false);
    onSelectTransaction?.(t);
  };

  function toggleTheme() {
    document.documentElement.classList.toggle("dark");
  }

  return (
    <>
      <nav
        className="border-b sticky top-0 z-10"
        style={{ backgroundColor: bg, borderColor: border, color: text }}
      >
        <div className="px-6 py-4 flex items-center gap-4">
          <span
            className="text-4xl font-bold bg-clip-text text-transparent shrink-0"
            style={{
              backgroundImage: dark
                ? "linear-gradient(to right, #ffffff, #d1d5db, #9ca3af)"
                : "linear-gradient(to right, #111827, #374151, #6b7280)",
            }}
          >
            FinSight
          </span>

          {/* Search */}
          <div className="flex-1 flex justify-center" ref={containerRef}>
            <div className="relative w-full max-w-lg">
              <input
                value={query}
                onChange={handleQueryChange}
                onKeyDown={handleKeyDown}
                onFocus={() => query && setOpen(true)}
                placeholder="Search transactions..."
                className="w-full rounded-xl px-4 py-2 text-sm border"
                style={{ backgroundColor: input, borderColor: border, color: text, outline: "none" }}
              />

              {/* Dropdown */}
              {open && suggestions.length > 0 && (
                <div
                  className="absolute top-full mt-1.5 w-full rounded-xl border shadow-lg overflow-hidden z-50"
                  style={{ backgroundColor: bg, borderColor: border }}
                >
                  {suggestions.map((t) => {
                    const catColor = `var(--category-${t.category.toLowerCase()})`;
                    const date = new Date(t.transaction_date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    });
                    return (
                      <button
                        key={t.id}
                        onMouseDown={() => handleSelect(t)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:brightness-95 transition-all"
                        style={{ backgroundColor: bg, color: text }}
                      >
                        {/* Category dot */}
                        <span
                          style={{
                            width: 8, height: 8, borderRadius: "50%",
                            backgroundColor: catColor, flexShrink: 0,
                          }}
                        />
                        {/* Name + category */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{t.name}</p>
                          <p className="text-xs truncate" style={{ color: catColor }}>
                            {CATEGORY_CONFIG[t.category]?.label ?? t.category} · {date}
                          </p>
                        </div>
                        {/* Amount */}
                        <span className="text-sm font-bold shrink-0" style={{ color: catColor }}>
                          {fmt(t.amount)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* No results */}
              {open && debouncedQuery.trim() && suggestions.length === 0 && (
                <div
                  className="absolute top-full mt-1.5 w-full rounded-xl border shadow-lg px-4 py-3 text-sm z-50"
                  style={{ backgroundColor: bg, borderColor: border, color: muted }}
                >
                  No transactions found
                </div>
              )}
            </div>
          </div>

          <button
            onClick={toggleTheme}
            onMouseEnter={() => setThemeHovered(true)}
            onMouseLeave={() => setThemeHovered(false)}
            className="p-2 rounded-lg cursor-pointer shrink-0"
            style={{
              backgroundColor: themeHovered
                ? `color-mix(in srgb, ${text} 15%, transparent)`
                : "transparent",
              transition: "background-color 150ms ease",
            }}
            aria-label="Toggle theme"
          >
            {dark ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => setDrawerOpen(true)}
            onMouseEnter={() => setMenuHovered(true)}
            onMouseLeave={() => setMenuHovered(false)}
            className="p-2 rounded-lg cursor-pointer shrink-0"
            style={{
              backgroundColor: menuHovered
                ? `color-mix(in srgb, ${text} 15%, transparent)`
                : "transparent",
              transition: "background-color 150ms ease",
            }}
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-72 z-50 flex flex-col border-l"
        style={{
          backgroundColor: bg,
          borderColor: border,
          color: text,
          transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 250ms ease",
        }}
      >
        <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: border }}>
          <span className="text-sm font-semibold" style={{ color: muted }}>Menu</span>
          <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-lg cursor-pointer" aria-label="Close menu">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ backgroundColor: `color-mix(in srgb, ${text} 12%, transparent)`, color: text }}
          >
            U
          </div>
          <div>
            <p className="text-sm font-semibold">Username</p>
            <p className="text-xs" style={{ color: muted }}>user@email.com</p>
          </div>
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
      </div>
    </>
  );
}
