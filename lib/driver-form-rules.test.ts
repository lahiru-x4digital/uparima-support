import { describe, expect, it } from "vitest";
import { EMPTY_DRIVER_FORM, type DriverFormValues } from "@/types/driver";
import { changedDriverFields, licenseNumberProblem, normalizeLicenseNumber } from "./driver-form-rules";

const stored: DriverFormValues = {
  ...EMPTY_DRIVER_FORM,
  phone: "0771234567",
  firstName: "Kamal",
  lastName: "Perera",
  nicNumber: "901234567V",
  vehicleTypeId: "2",
  // On file since before the format rule: would be refused if sent again.
  licenseNumber: "5194283",
  licenseExpiryDate: "2030-01-01",
  bankName: "BOC",
  bankAccountName: "K Perera",
  bankAccountNumber: "123456",
  bankBranch: "Kandy",
};

describe("normalizeLicenseNumber", () => {
  it("tidies a standard licence number as typed or read off a photo", () => {
    expect(normalizeLicenseNumber("b1234567", false)).toBe("B1234567");
    expect(normalizeLicenseNumber(" B 1234567 ", false)).toBe("B1234567");
    expect(normalizeLicenseNumber("B-1234567.", false)).toBe("B1234567");
  });

  it("leaves a temporary permit number as written", () => {
    expect(normalizeLicenseNumber(" C 328761/A ", true)).toBe("C 328761/A");
  });
});

describe("licenseNumberProblem", () => {
  it("accepts one letter followed by digits, of any length", () => {
    expect(licenseNumberProblem("B1234567", false)).toBeNull();
    expect(licenseNumberProblem("A123", false)).toBeNull();
  });

  it("explains what is expected otherwise, and the way out for a temporary licence", () => {
    for (const bad of ["5194283", "BB123456", "B12A4567", "B"]) {
      const problem = licenseNumberProblem(bad, false);
      expect(problem).toMatch(/one letter followed by digits/);
      expect(problem).toMatch(/Temporary Driving Licence/);
    }
  });

  it("does not judge a temporary permit number, or an empty field", () => {
    expect(licenseNumberProblem("TL/2026/00417", true)).toBeNull();
    expect(licenseNumberProblem("", false)).toBeNull();
  });
});

describe("changedDriverFields", () => {
  it("sends nothing when only documents were replaced", () => {
    // The case that was failing: the stored licence number went back to the server and was refused.
    expect(changedDriverFields(stored, { ...stored })).toEqual({});
  });

  it("sends just the field that was edited", () => {
    expect(changedDriverFields(stored, { ...stored, city: "Kandy" })).toEqual({ city: "Kandy" });
  });

  it("sends the licence number with its kind, so it is checked the right way", () => {
    expect(changedDriverFields(stored, { ...stored, licenseNumber: "B1234567" })).toEqual({
      licenseNumber: "B1234567",
      isTemporaryLicense: false,
    });
    // Switching the kind re-submits the number too, to be checked under the new kind.
    expect(changedDriverFields(stored, { ...stored, isTemporaryLicense: true })).toEqual({
      licenseNumber: "5194283",
      isTemporaryLicense: true,
    });
  });

  it("sends a payout account whole when any part of it changed", () => {
    expect(changedDriverFields(stored, { ...stored, bankBranch: "Colombo" })).toEqual({
      bankName: "BOC",
      bankAccountName: "K Perera",
      bankAccountNumber: "123456",
      bankBranch: "Colombo",
    });
  });

  it("notices a switch being flipped", () => {
    expect(changedDriverFields(stored, { ...stored, ownsVehicle: false })).toEqual({ ownsVehicle: false });
  });
});
