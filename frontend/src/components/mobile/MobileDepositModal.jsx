import { useRef, useState } from "react";
import { updateTipDeposit, convertTipDepositToTransaction } from "../../api/tipDeposits";
import { errorMessage } from "../../utils/errors";
import CurrencyInput from "../shared/CurrencyInput";
import Toggle from "../shared/Toggle";
import CompactDateField from "./CompactDateField";
import { HOME_TEXT, HOME_MUTED, HOME_SURFACE, HOME_DIVIDER, HOME_EXPENSE, TIPS_DEPOSITED } from "../shared/categoryVisuals";


const fieldStyle = {
  width: "100%", borderRadius: 10, padding: "9px 11px", fontSize: 15,
  border: `1px solid ${HOME_DIVIDER}`, backgroundColor: "rgba(255,255,255,0.04)", color: HOME_TEXT,
  boxSizing: "border-box", outline: "none", colorScheme: "dark",
};
const labelStyle = { fontSize: 11, color: HOME_MUTED, marginBottom: 4, paddingLeft: 2 };

export default function MobileDepositModal({ deposit, onClose, onSaved, onDelete }) {
  const [form, setForm] = useState({
    amount: String(deposit.amount),
    deposit_date: deposit.deposit_date,
    convertToCash: false,
  });
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const savedRef = useRef(false);

  const busy = deleting;

  // Closes the instant the button is tapped - the actual save (and, if the
  // Type toggle was flipped, the conversion back to a transaction) run in
  // the background after. #156 + this pass: there's no toast system yet, so
  // a background failure just leaves the row as the server last had it on
  // the next refresh - no error is surfaced here since the sheet is gone.
  function handleSave() {
    if (savedRef.current || busy) return;
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    savedRef.current = true;
    setError("");
    const { convertToCash, deposit_date } = form;
    onClose();
    (async () => {
      try {
        // Persist any edits first either way - the convert endpoint carries
        // over whatever amount/date the deposit has server-side.
        await updateTipDeposit(deposit.id, { amount, deposit_date });
        if (convertToCash) await convertTipDepositToTransaction(deposit.id);
      } catch {
        // Silent - see comment above.
      } finally {
        onSaved();
      }
    })();
  }

  async function handleDeleteTap() {
    if (busy) return;
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
      return;
    }
    setDeleting(true);
    setError("");
    try {
      await onDelete(deposit.id);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 60, backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 61,
          backgroundColor: HOME_SURFACE, borderRadius: "20px 20px 0 0",
          padding: "10px 20px calc(env(safe-area-inset-bottom, 0px) + 20px)",
          display: "flex", flexDirection: "column", gap: 12,
        }}
      >
        <div style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: HOME_DIVIDER, alignSelf: "center", margin: "2px 0 4px" }} />

        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: HOME_TEXT }}>Deposit</p>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={labelStyle}>Amount</p>
            <CurrencyInput
              value={form.amount}
              onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
              placeholder="0.00"
              style={fieldStyle}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={labelStyle}>Date</p>
            <CompactDateField
              value={form.deposit_date}
              onChange={(v) => setForm((f) => ({ ...f, deposit_date: v }))}
              style={fieldStyle}
            />
          </div>
        </div>

        {error && <p style={{ fontSize: 12, color: HOME_EXPENSE, margin: 0 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button type="button" onClick={onClose} disabled={busy}
            style={{ flex: 1, minWidth: 0, padding: "10px 0", borderRadius: 12, border: "none", backgroundColor: "rgba(255,255,255,0.06)", color: HOME_MUTED, fontSize: 14, fontWeight: 600, cursor: busy ? "default" : "pointer" }}
          >Cancel</button>
          <button type="button" onClick={handleSave} disabled={busy}
            style={{
              flex: 2, minWidth: 0, padding: "10px 0", borderRadius: 12, border: "none",
              backgroundColor: TIPS_DEPOSITED, color: "#fff",
              fontSize: 14, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1,
            }}
          >Save Changes</button>
        </div>

        <div className="flex flex-col gap-1.5">
          <p style={labelStyle}>Type</p>
          <Toggle
            checked={!form.convertToCash}
            onChange={(v) => setForm((f) => ({ ...f, convertToCash: !v }))}
            disabled={busy}
            activeColor={TIPS_DEPOSITED}
          />
        </div>

        <button type="button" onClick={handleDeleteTap} disabled={busy}
          style={{
            marginTop: 10, paddingTop: 14, paddingBottom: 0,
            borderTop: `1px solid ${HOME_DIVIDER}`, borderRadius: 0,
            background: "transparent", color: HOME_EXPENSE, fontSize: 13, fontWeight: 600,
            cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1,
          }}
        >{deleting ? "Deleting…" : deleteConfirm ? "Tap again to confirm delete" : "Delete"}</button>
      </div>
    </>
  );
}
