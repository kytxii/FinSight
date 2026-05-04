const DEMO_TODAY = "2026-04-28";

export function getNow() {
  return localStorage.getItem("demo") === "true"
    ? new Date(DEMO_TODAY + "T00:00:00")
    : new Date();
}

export function getToday() {
  return localStorage.getItem("demo") === "true"
    ? DEMO_TODAY
    : new Date().toLocaleDateString("en-CA");
}
