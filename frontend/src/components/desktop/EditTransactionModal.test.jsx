import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditTransactionModal from "./EditTransactionModal";
import { updateTransaction, convertTransactionToTipDeposit } from "../../api/transactions";
import { updateRecurringPayment } from "../../api/recurringPayments";

vi.mock("../../api/transactions", () => ({
  updateTransaction: vi.fn(),
  convertTransactionToTipDeposit: vi.fn(),
}));
vi.mock("../../api/recurringPayments", () => ({
  updateRecurringPayment: vi.fn(),
}));

const baseTransaction = {
  id: "tx1",
  name: "Groceries",
  amount: 42.5,
  category: "EXPENSE",
  transaction_date: "2026-09-01",
  note: "",
  recurring_payment_id: null,
  credit_card_charge_id: null,
};

function setup(overrides = {}, transaction = baseTransaction) {
  const props = {
    transaction,
    onClose: vi.fn(),
    onSaved: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  const view = render(<EditTransactionModal {...props} />);
  return { ...view, ...props };
}

beforeEach(() => {
  updateTransaction.mockReset().mockResolvedValue({ data: {} });
  convertTransactionToTipDeposit.mockReset().mockResolvedValue({ data: {} });
  updateRecurringPayment.mockReset().mockResolvedValue({ data: {} });
});

describe("EditTransactionModal", () => {
  it("renders the transaction's current values", () => {
    setup();
    expect(screen.getByDisplayValue("Groceries")).toBeInTheDocument();
    expect(screen.getByDisplayValue("$42.50")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-09-01")).toBeInTheDocument();
  });

  it("closes optimistically - the panel commits to closing and fires the save before either resolves", async () => {
    const { onClose, onSaved } = setup();

    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    // The save call and the close animation both start synchronously on
    // submit - onClose itself is deferred (EXIT_MS timer), so at this point
    // the save has fired but the panel hasn't actually unmounted yet.
    expect(updateTransaction).toHaveBeenCalledWith(
      "tx1",
      expect.objectContaining({ name: "Groceries", amount: 42.5 }),
    );
    expect(onClose).not.toHaveBeenCalled();

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("ignores a second submit while the first save is already in flight", async () => {
    const { onSaved } = setup();
    const saveButton = screen.getByRole("button", { name: "Save Changes" });

    await userEvent.click(saveButton);
    await userEvent.click(saveButton); // still mounted - the panel takes EXIT_MS to actually close

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(updateTransaction).toHaveBeenCalledTimes(1);
  });

  it("also updates the linked recurring payment when the transaction came from one", async () => {
    setup({}, { ...baseTransaction, recurring_payment_id: "rp1" });

    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(updateRecurringPayment).toHaveBeenCalledWith(
        "rp1",
        expect.objectContaining({ name: "Groceries", day_of_month: 1 }),
      ),
    );
  });

  it("locks and disables the Name field for a locked category (TIPS)", () => {
    const { container } = setup({}, { ...baseTransaction, category: "TIPS", name: "Cash" });
    // No <label for=...> association in the markup, so this can't be
    // queried by accessible name - falling back to the DOM directly.
    expect(container.querySelector('input[name="name"]')).toBeDisabled();
  });

  it("saves the edit and then converts to a deposit when Convert to Deposit is toggled on a TIPS transaction", async () => {
    setup({}, { ...baseTransaction, category: "TIPS", name: "Cash" });

    await userEvent.click(screen.getByRole("radio", { name: "Deposit" }));
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(convertTransactionToTipDeposit).toHaveBeenCalledWith("tx1"));
    expect(updateTransaction).toHaveBeenCalledWith(
      "tx1",
      expect.objectContaining({ name: "Cash", amount: 42.5 }),
    );
    // The convert endpoint relies on the edit already being persisted -
    // order matters here, not just that both eventually get called.
    expect(updateTransaction.mock.invocationCallOrder[0]).toBeLessThan(
      convertTransactionToTipDeposit.mock.invocationCallOrder[0],
    );
  });

  it("does not convert when the toggle is left on Cash", async () => {
    setup({}, { ...baseTransaction, category: "TIPS", name: "Cash" });

    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(updateTransaction).toHaveBeenCalled());
    expect(convertTransactionToTipDeposit).not.toHaveBeenCalled();
  });

  it("requires a second click on Delete to actually delete", async () => {
    const onDelete = vi.fn().mockResolvedValue();
    const { onClose } = setup({ onDelete });

    await userEvent.click(screen.getByRole("button", { name: "Delete transaction" }));
    expect(screen.getByRole("button", { name: "Tap again to confirm delete" })).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Tap again to confirm delete" }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(baseTransaction));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("shows the server's error and reverts the confirm state when delete fails", async () => {
    const onDelete = vi.fn().mockRejectedValue({ response: { data: { detail: "Nope, still processing" } } });
    setup({ onDelete });

    await userEvent.click(screen.getByRole("button", { name: "Delete transaction" }));
    await userEvent.click(screen.getByRole("button", { name: "Tap again to confirm delete" }));

    await waitFor(() => expect(screen.getByText("Nope, still processing")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Delete transaction" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete transaction" })).not.toBeDisabled();
  });

  it("calls onLocate with the transaction when the locate button is used", async () => {
    const onLocate = vi.fn();
    setup({ onLocate });

    await userEvent.click(screen.getByRole("button", { name: "Locate in table" }));
    expect(onLocate).toHaveBeenCalledWith(baseTransaction);
  });

  it("hides the locate button when onLocate isn't provided", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Locate in table" })).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const { onClose } = setup();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
