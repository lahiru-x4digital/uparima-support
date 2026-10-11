import { describe, expect, it } from "vitest";
import { canAiValidateDriver, canApproveApplication, signupGaps, signupReadyForReview } from "./driver-review";

type Input = Parameters<typeof canApproveApplication>[0];
const driver = (over: Partial<Input>): Input => ({
  status: "pending",
  missingFields: [],
  missingDocuments: [],
  reviewValid: null,
  ...over,
});

describe("an unfinished signup", () => {
  it("can't be decided on while details are missing", () => {
    const d = driver({ status: "incomplete", missingFields: ["NIC number", "city"] });
    expect(signupGaps(d)).toEqual(["NIC number", "city"]);
    expect(signupReadyForReview(d)).toBe(false);
    expect(canApproveApplication(d)).toBe(false);
    expect(canAiValidateDriver(d)).toBe(false);
  });

  it("can be approved and validated once nothing is missing", () => {
    const d = driver({ status: "incomplete", missingFields: [] });
    expect(signupReadyForReview(d)).toBe(true);
    expect(canApproveApplication(d)).toBe(true);
    expect(canAiValidateDriver(d)).toBe(true);
  });

  it("is never assumed finished when the backend didn't say what is missing", () => {
    const d = driver({ status: "incomplete", missingFields: undefined });
    expect(signupGaps(d)).toBeNull();
    expect(canApproveApplication(d)).toBe(false);
    expect(canAiValidateDriver(d)).toBe(false);
  });
});

describe("a submitted driver", () => {
  it("is offered Approve while pending or rejected only", () => {
    expect(canApproveApplication(driver({ status: "pending" }))).toBe(true);
    expect(canApproveApplication(driver({ status: "rejected" }))).toBe(true);
    for (const status of ["approved", "suspended", "deleted"] as const) {
      expect(canApproveApplication(driver({ status }))).toBe(false);
    }
  });

  it("has no signup gaps, whatever the record holds", () => {
    expect(signupGaps(driver({ status: "approved", missingFields: [] }))).toBeNull();
  });

  it("is offered AI Validate once approved only when there is something to clear", () => {
    expect(canAiValidateDriver(driver({ status: "approved" }))).toBe(false);
    expect(canAiValidateDriver(driver({ status: "approved", reviewValid: false }))).toBe(true);
    expect(canAiValidateDriver(driver({ status: "approved", missingDocuments: ["license number"] }))).toBe(true);
    expect(canAiValidateDriver(driver({ status: "suspended", reviewValid: false }))).toBe(false);
  });
});
