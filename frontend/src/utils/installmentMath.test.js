import { describe, it, expect } from "vitest";
import {
  computeMonthlyPayment,
  computeTermOptions,
  computeGaugeStatus,
  CANDIDATE_TERM_MONTHS,
} from "./installmentMath";

describe("computeMonthlyPayment", () => {
  it("divides total by term and rounds to the cent", () => {
    expect(computeMonthlyPayment(1000, 3)).toBe(333.33);
    expect(computeMonthlyPayment(100, 3)).toBe(33.33);
  });

  it("accepts string inputs (form fields are strings)", () => {
    expect(computeMonthlyPayment("1200", "12")).toBe(100);
  });

  it("returns null for a non-positive or missing total", () => {
    expect(computeMonthlyPayment(0, 12)).toBeNull();
    expect(computeMonthlyPayment(-50, 12)).toBeNull();
    expect(computeMonthlyPayment("", 12)).toBeNull();
  });

  it("returns null for a non-positive or missing term", () => {
    expect(computeMonthlyPayment(1000, 0)).toBeNull();
    expect(computeMonthlyPayment(1000, -3)).toBeNull();
    expect(computeMonthlyPayment(1000, "")).toBeNull();
  });
});

describe("computeTermOptions", () => {
  it("returns one option per candidate term, each with its own monthly payment", () => {
    const options = computeTermOptions(1200);
    expect(options.map((o) => o.period_months)).toEqual(CANDIDATE_TERM_MONTHS);
    expect(options.find((o) => o.period_months === 12).monthly_payment).toBe(100);
    expect(options.find((o) => o.period_months === 3).monthly_payment).toBe(400);
  });

  it("returns an empty list for a non-positive total", () => {
    expect(computeTermOptions(0)).toEqual([]);
    expect(computeTermOptions(-100)).toEqual([]);
  });
});

describe("computeGaugeStatus", () => {
  // Boundaries matter here - a payment landing exactly on a tier edge is the
  // case most likely to silently drift from the backend's own thresholds if
  // either side's rounding or <= vs < ever changes.
  it("is dark_green at and just under the 10% boundary", () => {
    expect(computeGaugeStatus(100, 1000).status).toBe("dark_green"); // exactly 10%
    expect(computeGaugeStatus(99, 1000).status).toBe("dark_green");
  });

  it("crosses into green just over 10% and stays through 15%", () => {
    expect(computeGaugeStatus(101, 1000).status).toBe("green");
    expect(computeGaugeStatus(150, 1000).status).toBe("green"); // exactly 15%
  });

  it("crosses into yellow just over 15% and stays through 20%", () => {
    expect(computeGaugeStatus(151, 1000).status).toBe("yellow");
    expect(computeGaugeStatus(200, 1000).status).toBe("yellow"); // exactly 20%
  });

  it("crosses into orange just over 20% and stays through 25%", () => {
    expect(computeGaugeStatus(201, 1000).status).toBe("orange");
    expect(computeGaugeStatus(250, 1000).status).toBe("orange"); // exactly 25%
  });

  it("is red just over 25%", () => {
    expect(computeGaugeStatus(251, 1000).status).toBe("red");
  });

  it("returns the actual ratio alongside the status", () => {
    expect(computeGaugeStatus(50, 1000).ratio).toBeCloseTo(0.05);
  });

  it("is red with a null ratio when there's no available cash to divide by", () => {
    expect(computeGaugeStatus(100, 0)).toEqual({ status: "red", ratio: null });
    expect(computeGaugeStatus(100, -500)).toEqual({ status: "red", ratio: null });
  });
});
