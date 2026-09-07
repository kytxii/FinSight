import { describe, it, expect } from "vitest";
import { errorMessage } from "./errors";

describe("errorMessage", () => {
  it("returns a string detail as-is", () => {
    const err = { response: { data: { detail: "No active paycheck schedule found" } } };
    expect(errorMessage(err)).toBe("No active paycheck schedule found");
  });

  it("joins a 422 validation-error array into one message", () => {
    // FastAPI sends an array of {msg, ...} objects for 422s - rendering that
    // array directly as a React child crashes the tree (#47).
    const err = {
      response: {
        data: {
          detail: [{ msg: "amount must be positive" }, { msg: "date is required" }],
        },
      },
    };
    expect(errorMessage(err)).toBe("amount must be positive, date is required");
  });

  it("drops empty/missing msg entries from a validation-error array", () => {
    const err = { response: { data: { detail: [{ msg: "" }, {}, { msg: "real error" }] } } };
    expect(errorMessage(err)).toBe("real error");
  });

  it("falls back to the default message when detail is missing", () => {
    expect(errorMessage({})).toBe("Something went wrong");
    expect(errorMessage(undefined)).toBe("Something went wrong");
  });

  it("falls back to the default message when detail is an empty string", () => {
    const err = { response: { data: { detail: "" } } };
    expect(errorMessage(err)).toBe("Something went wrong");
  });

  it("falls back to a caller-supplied message instead of the default", () => {
    expect(errorMessage({}, "Couldn't delete — try again")).toBe("Couldn't delete — try again");
  });

  it("falls back when a validation-error array has no usable messages", () => {
    const err = { response: { data: { detail: [{}, { msg: "" }] } } };
    expect(errorMessage(err)).toBe("Something went wrong");
  });
});
