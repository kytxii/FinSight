import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import MobileCategory from "./MobileCategory";
import { getPaychecks } from "../../api/paychecks";

vi.mock("../../api/paychecks", () => ({
  getPaychecks: vi.fn(),
}));
vi.mock("../../api/recurringPayments", () => ({
  confirmRecurringPayment: vi.fn(),
  skipRecurringPayment: vi.fn(),
}));

const monthStepper = {
  period: { year: 2026, month: 3 },
  periodKey: "2026-04",
  periodLabel: "April 2026",
  isCurrentMonth: true,
  shiftMonth: vi.fn(),
  setMonth: vi.fn(),
  setYear: vi.fn(),
  slideDir: 0,
  yearOptions: [2026],
};

function setup(overrides = {}) {
  const props = {
    category: "BILL",
    transactions: [],
    monthlyHistory: [],
    loading: false,
    upcomingItems: [],
    monthStepper,
    onBack: vi.fn(),
    onEditTransaction: vi.fn(),
    onDeleteTransaction: vi.fn(),
    onOpenPaychecks: vi.fn(),
    onRefresh: vi.fn(),
    ...overrides,
  };
  return { ...render(<MobileCategory {...props} />), ...props };
}

beforeEach(() => {
  getPaychecks.mockReset().mockResolvedValue({ data: { paychecks: [] } });
});

// The section used to unmount entirely when a category had nothing scheduled,
// which left the page shorter than every other section on it and read as
// "this feature doesn't exist here" rather than "nothing is due" (#161
// follow-up). It now always renders, with an explicit empty state.
describe("MobileCategory upcoming section", () => {
  it("renders the Upcoming heading even when nothing is upcoming", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Upcoming" })).toBeInTheDocument();
  });

  it("names the category in the empty state rather than hiding the section", () => {
    setup({ category: "SUBSCRIPTION" });
    expect(screen.getByText("Nothing upcoming for Subscriptions")).toBeInTheDocument();
  });

  it("lists upcoming items instead of the empty state when there are some", () => {
    setup({
      upcomingItems: [{
        id: "rp1",
        name: "Water Bill",
        category: "BILL",
        amount: "35.00",
        due_date: "2026-04-29",
        status: "upcoming",
        is_estimate: false,
        actual_amount: null,
        estimated_amount: null,
      }],
    });
    expect(screen.getByText("Water Bill")).toBeInTheDocument();
    expect(screen.queryByText(/Nothing upcoming for/)).not.toBeInTheDocument();
  });

  // INCOME is the one category whose upcoming items come from paychecks
  // rather than recurring payments, so it has its own empty state and its
  // own fetch - the section still has to be there either way.
  it("keeps the section for INCOME, with a paycheck-specific empty state", async () => {
    setup({ category: "INCOME" });
    expect(await screen.findByText("No paychecks expected this month")).toBeInTheDocument();
  });
});
