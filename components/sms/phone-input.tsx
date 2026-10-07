"use client";

import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const SRI_LANKA_ISO2 = "LK";
const SRI_LANKA_DIAL_CODE = "+94";

interface Props {
  phone: string;
  onPhoneChange: (phone: string) => void;
}

// Simple digits-only length check — no libphonenumber-js dependency.
const isValidNumber = (phone: string) => /^\d{7,12}$/.test(phone);

// Country is fixed to Sri Lanka — no country selector needed.
export function PhoneInput({ phone, onPhoneChange }: Props) {
  const valid = isValidNumber(phone);

  return (
    <div>
      <Label className="mb-1.5 text-xs font-semibold">Mobile Number</Label>
      <div className="flex items-center gap-2">
        <span className="flex h-9 shrink-0 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
          🇱🇰 {SRI_LANKA_DIAL_CODE}
        </span>
        <Input
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="e.g. 712345678"
          inputMode="numeric"
          aria-label="Mobile number"
        />
      </div>
      {phone && (
        <p className={`mt-1.5 flex items-center gap-1 text-xs ${valid ? "text-emerald-600" : "text-destructive"}`}>
          {valid && <Check className="size-3.5" />}
          {valid ? "Valid number" : "Enter a valid mobile number"}
        </p>
      )}
    </div>
  );
}

export { isValidNumber };
