import { describe, it, expect } from "vitest";
import {
  matchesTransaction,
  lockedNameFor,
  hexToHsl,
  hslToHex,
  desaturate,
  generateCategoryShades,
  fmt,
  fmtWhole,
  nextAmountSort,
} from "./finance";

describe("matchesTransaction", () => {
  const t = {
    name: "Walmart",
    note: "Groceries for the week",
    category: "EXPENSE",
    amount: "42.50",
  };

  it("matches on an empty query (no filter)", () => {
    expect(matchesTransaction(t, "")).toBe(true);
    expect(matchesTransaction(t, "   ")).toBe(true);
  });

  it("matches case-insensitively on name", () => {
    expect(matchesTransaction(t, "walmart")).toBe(true);
    expect(matchesTransaction(t, "WALMART")).toBe(true);
  });

  it("matches on note", () => {
    expect(matchesTransaction(t, "groceries")).toBe(true);
  });

  it("matches on the raw category and its display label", () => {
    expect(matchesTransaction(t, "expense")).toBe(true);
    expect(matchesTransaction(t, "Expenses")).toBe(true); // CATEGORY_CONFIG label
  });

  it("matches on amount as a substring", () => {
    expect(matchesTransaction(t, "42.5")).toBe(true);
    expect(matchesTransaction(t, "99")).toBe(false);
  });

  it("does not match unrelated text", () => {
    expect(matchesTransaction(t, "costco")).toBe(false);
  });

  it("tolerates a missing note without throwing", () => {
    expect(matchesTransaction({ ...t, note: null }, "anything")).toBe(false);
    expect(matchesTransaction({ ...t, note: null }, "")).toBe(true);
  });
});

describe("lockedNameFor", () => {
  it("returns the forced name for locked categories", () => {
    expect(lockedNameFor("TIPS")).toBe("Cash");
    expect(lockedNameFor("SAVINGS")).toBe("Savings");
  });

  it("returns null for categories the user names themselves", () => {
    expect(lockedNameFor("EXPENSE")).toBeNull();
    expect(lockedNameFor("INCOME")).toBeNull();
  });
});

describe("hexToHsl / hslToHex", () => {
  it("round-trips a color through hex -> hsl -> hex", () => {
    // Rounding in the HSL conversion means this isn't always pixel-exact -
    // asserting closeness rather than equality avoids a flaky test over a
    // 1-unit rounding difference that doesn't matter visually.
    const original = "#4ade80";
    const [h, s, l] = hexToHsl(original);
    const roundTripped = hslToHex(h, s, l);
    const [h2, s2, l2] = hexToHsl(roundTripped);
    expect(Math.abs(h - h2)).toBeLessThan(2);
    expect(Math.abs(s - s2)).toBeLessThan(2);
    expect(Math.abs(l - l2)).toBeLessThan(2);
  });

  it("treats pure gray as zero saturation", () => {
    const [, s] = hexToHsl("#808080");
    expect(s).toBe(0);
  });
});

describe("desaturate", () => {
  it("reduces saturation without changing hue or lightness materially", () => {
    const original = "#4ade80";
    const desaturated = desaturate(original, 0.5);
    const [h1, s1] = hexToHsl(original);
    const [h2, s2] = hexToHsl(desaturated);
    expect(s2).toBeLessThan(s1);
    expect(Math.abs(h1 - h2)).toBeLessThan(2);
  });
});

describe("generateCategoryShades", () => {
  it("returns the requested number of shades", () => {
    expect(generateCategoryShades("#4ade80", 5)).toHaveLength(5);
  });

  it("lightens each subsequent shade (richest first)", () => {
    const shades = generateCategoryShades("#4ade80", 4);
    const lightnesses = shades.map((hex) => hexToHsl(hex)[2]);
    for (let i = 1; i < lightnesses.length; i++) {
      expect(lightnesses[i]).toBeGreaterThanOrEqual(lightnesses[i - 1]);
    }
  });
});

describe("fmt / fmtWhole", () => {
  it("formats as USD currency with cents", () => {
    expect(fmt(1234.5)).toBe("$1,234.50");
    expect(fmt(0)).toBe("$0.00");
  });

  it("formats negative amounts with a leading minus", () => {
    expect(fmt(-42)).toBe("-$42.00");
  });

  it("rounds to whole dollars for fmtWhole", () => {
    expect(fmtWhole(1234.5)).toBe("$1,235");
    expect(fmtWhole(99.4)).toBe("$99");
  });
});

describe("nextAmountSort", () => {
  it("cycles off -> desc -> asc -> off", () => {
    expect(nextAmountSort(null)).toBe("desc");
    expect(nextAmountSort("desc")).toBe("asc");
    expect(nextAmountSort("asc")).toBeNull();
  });
});
