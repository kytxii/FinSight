import { useRef, useState } from "react";

/**
 * Desktop-only (#177) - which Tool page (Paychecks/Recurring/Installments/
 * Credit Cards/Add) is open in the main-content takeover, and its close
 * transition. Mobile has no equivalent: each of its panels is its own
 * independent boolean rather than a single "which tool is open" enum, so
 * this isn't a #190 dedup case, just a state cluster worth naming.
 *
 * `transitionMs` is passed in (Dashboard.jsx's existing TOOL_TRANSITION_MS)
 * rather than hardcoded here, since the category-tab close transition
 * elsewhere in the page reuses the same constant - keeping one source of
 * truth for it in the page rather than splitting it across two files.
 *
 * `toolCloseTimer` is returned (not just used internally) because opening a
 * category tab needs to cancel a pending tool-close, and the page's own
 * unmount cleanup clears it alongside its other timers.
 */
export function useToolPanels(transitionMs) {
  const [toolMode, setToolMode] = useState(null); // null | "paychecks" | "recurring" | "installments" | "creditCards" | "add"
  const [toolClosing, setToolClosing] = useState(false);
  const toolCloseTimer = useRef(null);
  const [openedTools, setOpenedTools] = useState(new Set());

  function openTool(mode) {
    clearTimeout(toolCloseTimer.current);
    setToolClosing(false);
    setToolMode(mode);
    setOpenedTools((prev) => (prev.has(mode) ? prev : new Set(prev).add(mode)));
  }

  function closeTool() {
    // Setting toolClosing with no tool open remounts the page, which looks
    // like a full refresh.
    if (toolMode == null) return;
    clearTimeout(toolCloseTimer.current);
    setToolClosing(true);
    toolCloseTimer.current = setTimeout(() => {
      setToolMode(null);
      setToolClosing(false);
    }, transitionMs);
  }

  return {
    toolMode,
    setToolMode,
    toolClosing,
    setToolClosing,
    toolCloseTimer,
    openedTools,
    openTool,
    closeTool,
  };
}
