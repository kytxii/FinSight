import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MobileTransactionModal from "./MobileTransactionModal";
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
  const view = render(<MobileTransactionModal {...props} />);
  return { ...view, ...props };
}

beforeEach(() => {
  updateTransaction.mockReset().mockResolvedValue({ data: {} });
  convertTransactionToTipDeposit.mockReset().mockResolvedValue({ data: {} });
  updateRecurringPayment.mockReset().mockResolvedValue({ data: {} });
});

describe("MobileTransactionModal", () => {
  it("renders the transaction's current values", () => {
    setup();
    expect(screen.getByDisplayValue("Groceries")).toBeInTheDocument();
    expect(screen.getByDisplayValue("$42.50")).toBeInTheDocument();
  });

  it("closes synchronously on save - unlike the desktop panel, there's no exit animation to wait out", async () => {
    const { onClose, onSaved } = setup();

    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(updateTransaction).toHaveBeenCalledWith(
      "tx1",
      expect.objectContaining({ name: "Groceries", amount: 42.5 }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("ignores a second save tap while the first is already in flight", async () => {
    const { onSaved } = setup();
    const saveButton = screen.getByRole("button", { name: "Save Changes" });

    await userEvent.click(saveButton);
    await userEvent.click(saveButton);

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
    setup({}, { ...baseTransaction, category: "TIPS", name: "Cash" });
    expect(screen.getByDisplayValue("Cash")).toBeDisabled();
  });

  it("saves the edit and then converts to a deposit when Convert to Deposit is toggled on a TIPS transaction", async () => {
    setup({}, { ...baseTransaction, category: "TIPS", name: "Cash" });

    await userEvent.click(screen.getByRole("radio", { name: "Deposit" }));
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(convertTransactionToTipDeposit).toHaveBeenCalledWith("tx1"));
    expect(updateTransaction.mock.invocationCallOrder[0]).toBeLessThan(
      convertTransactionToTipDeposit.mock.invocationCallOrder[0],
    );
  });

  it("requires a second tap on Delete, and deletes by id (not the whole transaction)", async () => {
    const onDelete = vi.fn().mockResolvedValue();
    const { onClose } = setup({ onDelete });

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("button", { name: "Tap again to confirm delete" })).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Tap again to confirm delete" }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("tx1"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("shows the server's error message and reverts the confirm state when delete fails", async () => {
    const onDelete = vi.fn().mockRejectedValue({ response: { data: { detail: "Nope, still processing" } } });
    setup({ onDelete });

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Tap again to confirm delete" }));

    await waitFor(() => expect(screen.getByText("Nope, still processing")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("falls back to a generic message when the server sends a 422 validation-error array", async () => {
    // #47 - detail can be an array of validation-error objects, not just a
    // string. errorMessage handles that; this confirms the modal actually
    // renders through it rather than crashing on an object child.
    const onDelete = vi.fn().mockRejectedValue({
      response: { data: { detail: [{ msg: "amount must be positive" }] } },
    });
    setup({ onDelete });

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Tap again to confirm delete" }));

    await waitFor(() => expect(screen.getByText("amount must be positive")).toBeInTheDocument());
  });

  it("calls onLocate with the transaction when the locate button is used", async () => {
    const onLocate = vi.fn();
    setup({ onLocate });

    await userEvent.click(screen.getByRole("button", { name: "Locate in Activity" }));
    expect(onLocate).toHaveBeenCalledWith(baseTransaction);
  });

  it("hides the locate button when onLocate isn't provided", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Locate in Activity" })).not.toBeInTheDocument();
  });

  it("closes when the backdrop is tapped", async () => {
    const { onClose, container } = setup();
    // The backdrop is the first fixed-inset div, rendered before the sheet -
    // no test id in the markup, so this is the least-brittle way to reach it.
    await userEvent.click(container.firstChild);
    expect(onClose).toHaveBeenCalled();
  });
});
