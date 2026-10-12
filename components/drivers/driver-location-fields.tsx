"use client";

import { useMemo } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { cityOptions, formDistrict, formProvince } from "@/lib/driver-cities";
import { useDistrictCities } from "@/lib/hooks/use-drivers";
import { SRI_LANKA_DISTRICTS_BY_PROVINCE, SRI_LANKA_PROVINCES } from "@/lib/sri-lanka-locations";

export interface DriverLocation {
  province: string;
  district: string;
  city: string;
}

/**
 * Province → district → city, each picked from the list the driver app registers with. Changing
 * a level clears the ones below it. Renders three fields as siblings, so it fits the caller's grid.
 */
export function DriverLocationFields({
  value,
  onChange,
}: {
  value: DriverLocation;
  onChange: (patch: Partial<DriverLocation>) => void;
}) {
  const districts = useMemo(
    () => (value.province ? (SRI_LANKA_DISTRICTS_BY_PROVINCE[formProvince(value.province)] ?? []) : []),
    [value.province],
  );
  const cityList = useDistrictCities(value.province, value.district);
  const cities = cityList.data ?? [];

  return (
    <>
      {/* Shown under the dropdown's own names; what is on record only changes when staff pick. */}
      <Field label="Province *">
        <NativeSelect
          value={formProvince(value.province)}
          onChange={(e) => onChange({ province: e.target.value, district: "", city: "" })}
        >
          <option value="">Select province…</option>
          {SRI_LANKA_PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="District *">
        <NativeSelect
          value={formDistrict(value.district)}
          onChange={(e) => onChange({ district: e.target.value, city: "" })}
          disabled={!value.province}
        >
          <option value="">Select district…</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="City *">
        {cityList.isSuccess && cities.length === 0 ? (
          // Nothing listed for this district, so there is nothing to pick from.
          <Input
            value={value.city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="No cities are listed for this district — type it"
          />
        ) : (
          <NativeSelect
            value={value.city}
            onChange={(e) => onChange({ city: e.target.value })}
            disabled={!value.district || cityList.isLoading}
          >
            <option value="">
              {!value.district ? "Select district first…" : cityList.isLoading ? "Loading cities…" : "Select city…"}
            </option>
            {cityOptions(cities, value.city).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
        )}
        {cityList.isError && (
          <p className="text-xs text-destructive">
            The cities for this district couldn&apos;t be loaded.{" "}
            <button type="button" className="underline" onClick={() => cityList.refetch()}>
              Try again
            </button>
          </p>
        )}
      </Field>
    </>
  );
}
