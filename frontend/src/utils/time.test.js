import { describe, it, expect, afterEach } from "vitest";
import { getNow, getToday } from "./time";

afterEach(() => {
  localStorage.removeItem("demo");
});

describe("getNow / getToday", () => {
  it("returns the real current date outside demo mode", () => {
    const now = getNow();
    expect(now.toDateString()).toBe(new Date().toDateString());
    expect(getToday()).toBe(new Date().toLocaleDateString("en-CA"));
  });

  it("pins to the fixed demo date while demo mode is on", () => {
    localStorage.setItem("demo", "true");
    expect(getToday()).toBe("2026-04-28");
    expect(getNow().toDateString()).toBe(new Date("2026-04-28T00:00:00").toDateString());
  });

  it("stops pinning once demo mode is turned off", () => {
    localStorage.setItem("demo", "true");
    expect(getToday()).toBe("2026-04-28");
    localStorage.removeItem("demo");
    expect(getToday()).toBe(new Date().toLocaleDateString("en-CA"));
  });
});
