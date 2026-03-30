import { useState } from "react";
import { useTheme } from "../hooks/useTheme";

export default function Navbar() {
  const dark = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [themeHovered, setThemeHovered] = useState(false);
  const [menuHovered, setMenuHovered] = useState(false);
  const [lightConfirm, setLightConfirm] = useState(false);
  const [lightConfirm2, setLightConfirm2] = useState(false);
  const [lightConfirm3, setLightConfirm3] = useState(false);
  const [lightConfirm4, setLightConfirm4] = useState(false);
  const [lightConfirm5, setLightConfirm5] = useState(false);

  function closeAll() {
    setLightConfirm(false);
    setLightConfirm2(false);
    setLightConfirm3(false);
    setLightConfirm4(false);
    setLightConfirm5(false);
  }

  function toggleTheme() {
    const goingLight = document.documentElement.classList.contains("dark");
    if (goingLight) {
      setLightConfirm(true);
    } else {
      document.documentElement.classList.toggle("dark");
    }
  }

  const bg = dark ? "var(--dark-surface)" : "var(--light-surface)";
  const border = dark ? "var(--dark-border)" : "var(--light-border)";
  const text = dark ? "var(--dark-text)" : "var(--light-text)";
  const input = dark ? "var(--dark-bg)" : "var(--light-bg)";
  const muted = `color-mix(in srgb, ${text} 50%, transparent)`;

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
          <div className="flex-1 flex justify-center">
            <input
              disabled
              placeholder="Search coming soon..."
              className="w-full max-w-lg rounded-xl px-4 py-2 text-sm cursor-not-allowed"
              style={{
                backgroundColor: input,
                borderColor: border,
                color: text,
              }}
            />
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
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
                width="20"
                height="20"
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
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
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between border-b"
          style={{ borderColor: border }}
        >
          <span className="text-sm font-semibold" style={{ color: muted }}>
            Menu
          </span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1 rounded-lg cursor-pointer"
            aria-label="Close menu"
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

        {/* Avatar + name */}
        <div className="px-5 py-5 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{
              backgroundColor: `color-mix(in srgb, ${text} 12%, transparent)`,
              color: text,
            }}
          >
            U
          </div>
          <div>
            <p className="text-sm font-semibold">Username</p>
            <p className="text-xs" style={{ color: muted }}>
              user@email.com
            </p>
          </div>
        </div>

        <div className="mx-5 border-t" style={{ borderColor: border }} />

        {/* Actions */}
        <div className="px-3 py-3">
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors text-left"
            style={{ color: "var(--category-expense)" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
        </div>
      </div>
      {/* Light mode confirm popover */}
      {lightConfirm && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setLightConfirm(false)}
          />
          <div
            className="fixed z-50 rounded-2xl shadow-xl px-4 py-3 text-sm"
            style={{
              top: "60px",
              right: "16px",
              backgroundColor: "#1a1a1a",
              color: "#fff",
              border: "1px solid #333",
              minWidth: "180px",
            }}
          >
            <p className="font-semibold mb-3">Are you sure?</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setLightConfirm2(true);
                }}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: "#333", color: "#fff" }}
              >
                Yes
              </button>
              <button
                onClick={() => setLightConfirm(false)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: "#444", color: "#fff" }}
              >
                No
              </button>
            </div>
          </div>
        </>
      )}

      {/* Second confirm */}
      {lightConfirm2 && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setLightConfirm(false);
              setLightConfirm2(false);
            }}
          />
          <div
            className="fixed z-50 rounded-2xl shadow-xl px-4 py-3 text-sm"
            style={{
              top: "150px",
              right: "16px",
              backgroundColor: "#1a1a1a",
              color: "#fff",
              border: "1px solid #333",
              minWidth: "180px",
            }}
          >
            <p className="font-semibold mb-0.5">100% sure?</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setLightConfirm3(true)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: "#333", color: "#fff" }}
              >
                Yes
              </button>
              <button
                onClick={closeAll}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: "#444", color: "#fff" }}
              >
                No
              </button>
            </div>
          </div>
        </>
      )}

      {lightConfirm3 && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeAll} />
          <div
            className="fixed z-50 rounded-2xl shadow-xl px-4 py-3 text-sm"
            style={{
              top: "250px",
              right: "16px",
              backgroundColor: "#1a1a1a",
              color: "#fff",
              border: "1px solid #333",
              minWidth: "180px",
            }}
          >
            <p className="font-semibold mb-0.5">Dark mode is love.</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={closeAll}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: "#333", color: "#fff" }}
              >
                Yes
              </button>
              <button
                onClick={() => setLightConfirm4(true)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: "#444", color: "#fff" }}
              >
                No
              </button>
            </div>
          </div>
        </>
      )}

      {lightConfirm4 && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeAll} />
          <div
            className="fixed z-50 rounded-2xl shadow-xl px-4 py-3 text-sm"
            style={{
              top: "350px",
              right: "16px",
              backgroundColor: "#1a1a1a",
              color: "#fff",
              border: "1px solid #333",
              minWidth: "180px",
            }}
          >
            <p className="font-semibold mb-0.5">Dark mode is life.</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={closeAll}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: "#333", color: "#fff" }}
              >
                Yes
              </button>
              <button
                onClick={() => setLightConfirm5(true)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: "#444", color: "#fff" }}
              >
                No
              </button>
            </div>
          </div>
        </>
      )}

      {lightConfirm5 && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeAll} />
          <div
            className="fixed z-50 rounded-2xl shadow-xl px-4 py-3 text-sm"
            style={{
              top: "450px",
              right: "16px",
              backgroundColor: "#1a1a1a",
              color: "#fff",
              border: "1px solid #333",
              minWidth: "180px",
            }}
          >
            <p className="font-semibold mb-0.5">Ready to stare at the sun?</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  document.documentElement.classList.remove("dark");
                  closeAll();
                }}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: "#333", color: "#fff" }}
              >
                Yes
              </button>
              <button
                onClick={closeAll}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: "#444", color: "#fff" }}
              >
                No
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
