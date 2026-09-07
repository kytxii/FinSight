import { useState } from "react";

export const HOLD_DELETE_MS = 1200;
export const HOLD_DELETE_RING_R = 16;
export const HOLD_DELETE_RING_C = 2 * Math.PI * HOLD_DELETE_RING_R;

/**
 * Press-and-hold-to-delete gesture for the Credit Cards header button - press
 * and hold fills the ring around the trash icon; releasing early cancels,
 * holding the full HOLD_DELETE_MS commits the delete. Was byte-identical
 * between Dashboard.jsx and MobileDashboard.jsx before this extraction
 * (#190 - the last of the duplicates #190 was filed to catch).
 *
 * Takes the credit-cards edit state as a parameter rather than owning it -
 * that state already lives on each page (creditCardsEditState, sourced from
 * CreditCardsPanel/MobileCreditCards), and doesn't belong to the gesture
 * itself.
 */
export function useHoldToDelete(editState) {
  const [holding, setHolding] = useState(false);

  function start() {
    if (!(editState.editMode && editState.hasSelection)) return;
    setHolding(true);
  }

  function cancel() {
    setHolding(false);
  }

  function onRingTransitionEnd(e) {
    if (e.propertyName !== "stroke-dashoffset" || !holding) return;
    setHolding(false);
    editState.deleteSelected();
  }

  return { holding, start, cancel, onRingTransitionEnd };
}
