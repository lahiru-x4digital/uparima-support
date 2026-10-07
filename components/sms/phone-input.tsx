"use client";

import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/inbox/option-select";
import type { SmsCountry } from "@/types/sms";

interface Props {
  countries: SmsCountry[];
  countryIso2: string;
  phone: string;
  onCountryChange: (iso2: string) => void;
  onPhoneChange: (phone: string) => void;
}

// Simple digits-only length check — no libphonenumber-js dependency.
const isValidNumber = (phone: string) => /^\d{7,12}$/.test(phone);

export function PhoneInput({ countryIso2, phone, countries, onCountryChange, onPhoneChange }: Props) {
  const options = countries.map((c) => ({ value: c.iso2, label: `${c.name} (${c.phonecode})` }));
  const selected = countries.find((c) => c.iso2 === countryIso2);
  const valid = isValidNumber(phone);

  return (
    <div>
      <Label className="mb-1.5 text-xs font-semibold">Mobile Number</Label>
      <div className="flex gap-2">
        <OptionSelect
          label="Select country"
          value={countryIso2}
          options={options.length ? options : [{ value: "", label: "Loading…" }]}
          onChange={onCountryChange}
          className="w-56 shrink-0"
        />
        <div className="flex flex-1 items-center gap-2">
          {selected && <span className="shrink-0 text-sm text-muted-foreground">{selected.phonecode}</span>}
          <Input
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="e.g. 712345678"
            inputMode="numeric"
            aria-label="Mobile number"
          />
        </div>
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
