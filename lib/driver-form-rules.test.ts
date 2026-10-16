import { describe, expect, it } from "vitest";
import { EMPTY_DRIVER_FORM, type DriverFormValues } from "@/types/driver";
import { changedDriverFields, normalizeLicenseNumber } from "./driver-form-rules";

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
  it("keeps any number as written, only trimmed", () => {
    expect(normalizeLicenseNumber(" b-1234567 ")).toBe("b-1234567");
    expect(normalizeLicenseNumber("TL/2026/00417")).toBe("TL/2026/00417");
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
