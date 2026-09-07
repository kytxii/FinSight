import { useRef, useState } from "react";

/**
 * The Dev Tools panel's state and forced-fetch wrapper - identical logic was
 * duplicated between Dashboard.jsx and MobileDashboard.jsx (#177, #190).
 *
 * `devFetch` takes the real fetch function as an argument rather than
 * importing getTransactions itself, so this hook stays generic instead of
 * hardcoding a dependency on the transactions API - each dashboard calls
 * `devMenu.devFetch(getTransactions)` in place of calling getTransactions
 * directly.
 */
export function useDevMenu() {
  const [open, setOpen] = useState(false);
  const [forceEmpty, setForceEmpty] = useState(false);
  const [delay, setDelay] = useState(0);
  const [forceError, setForceError] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);
  const forceErrorRef = useRef(false);

  function toggleForceError() {
    const next = !forceError;
    setForceError(next);
    forceErrorRef.current = next;
  }

  async function devFetch(realFetch) {
    if (forceErrorRef.current) {
      forceErrorRef.current = false;
      setForceError(false);
      throw new Error("Forced error");
    }
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    const res = await realFetch();
    setLastFetch(new Date());
    return res;
  }

  return {
    open,
    setOpen,
    forceEmpty,
    setForceEmpty,
    delay,
    setDelay,
    forceError,
    toggleForceError,
    lastFetch,
    devFetch,
  };
}
