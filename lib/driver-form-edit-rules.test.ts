import { describe, expect, it } from "vitest";
import { EMPTY_DRIVER_FORM, type DriverFormValues } from "@/types/driver";
import { editBlockingProblems, missingRequiredFields, sectionOfField } from "./driver-form-rules";

const form = (over: Partial<DriverFormValues> = {}): DriverFormValues => ({ ...EMPTY_DRIVER_FORM, ...over });

describe("editBlockingProblems", () => {
  it("lets a field that was already empty stay empty (partial save)", () => {
    expect(editBlockingProblems(form(), form({ firstName: "Nimal" }))).toEqual({});
  });

  it("blocks clearing a required field that had a value", () => {
    const problems = editBlockingProblems(form({ nicNumber: "901234567V" }), form({ nicNumber: "  " }));
    expect(problems.nicNumber).toBeDefined();
  });

  it("flags half-filled bank details", () => {
    const problems = editBlockingProblems(form(), form({ bankName: "Commercial Bank" }));
    expect(Object.keys(problems).sort()).toEqual(["bankAccountName", "bankAccountNumber"]);
  });

  it("checks the licence number only when this edit touched it", () => {
    const old = form({ licenseNumber: "12345" });
    expect(editBlockingProblems(old, form({ licenseNumber: "12345", city: "Kandy" }))).toEqual({});
    expect(editBlockingProblems(old, form({ licenseNumber: "9999" })).licenseNumber).toBeDefined();
    expect(editBlockingProblems(old, form({ licenseNumber: "B1234567" })).licenseNumber).toBeUndefined();
  });
});

describe("missingRequiredFields", () => {
  it("skips the mobile number on an edit", () => {
    expect(missingRequiredFields(form(), "edit")).not.toContain("phone");
    expect(missingRequiredFields(form(), "create")).toContain("phone");
  });
});

describe("sectionOfField", () => {
  it("maps fields to the section they are edited in", () => {
    expect(sectionOfField("email")).toBe("personal");
    expect(sectionOfField("licenseExpiryDate")).toBe("license");
    expect(sectionOfField("bankBranch")).toBe("bank");
  });
});
