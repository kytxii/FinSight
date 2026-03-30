import { useState } from "react";
import { CATEGORIES, CATEGORY_CONFIG } from "../utils/finance";
import { useTheme } from "../hooks/useTheme";

export default function CategoryTabs({ activeTab, onTabChange, activeColor }) {
  const dark = useTheme();
  const [hovered, setHovered] = useState(null);

  const border = dark ? "var(--dark-border)" : "var(--light-border)";
  const text   = dark ? "var(--dark-text)"   : "var(--light-text)";

  return (
    <div className="px-4 py-3 flex items-center justify-center gap-2 overflow-x-auto">
      {CATEGORIES.map((cat) => {
        const catColor = `var(--category-${cat.toLowerCase()})`;
        const isActive = activeTab === cat;
        const isHovered = hovered === cat;
        return (
          <button
            key={cat}
            onClick={() => onTabChange(cat)}
            onMouseEnter={() => setHovered(cat)}
            onMouseLeave={() => setHovered(null)}
            className="px-4 py-2 text-sm font-semibold rounded-xl border whitespace-nowrap transition-all duration-150 cursor-pointer active:scale-95"
            style={isActive ? {
              color: catColor,
              borderColor: catColor,
              backgroundColor: dark ? `color-mix(in srgb, ${catColor} ${isHovered ? "20%" : "12%"}, transparent)` : `var(--light-surface)`,
              boxShadow: `0 0 0 2px color-mix(in srgb, ${catColor} 20%, transparent)`,
            } : {
              borderColor: isHovered ? catColor : border,
              color: isHovered ? catColor : text,
              opacity: isHovered ? 1 : 0.4,
              backgroundColor: isHovered ? `color-mix(in srgb, ${catColor} 8%, transparent)` : "transparent",
            }}
          >
            {cat === "ALL" ? "All" : CATEGORY_CONFIG[cat].label}
          </button>
        );
      })}
    </div>
  );
}
