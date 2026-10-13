"use client";

import { Field } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { cityOptions, listedCity, listedName } from "@/lib/driver-cities";
import { useDistrictCities, useProvinceDistricts, useProvinces } from "@/lib/hooks/use-drivers";

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
  const provinces = useProvinces().data ?? [];
  const districts = useProvinceDistricts(value.province).data ?? [];
  const cityList = useDistrictCities(value.province, value.district);
  const cities = cityList.data ?? [];

  return (
    <>
      {/* Only listed places can be chosen, never typed. A short or older name on record shows as its listed one; one the list doesn't hold shows as nothing picked, so staff pick again. */}
      <Field label="Province *">
        <NativeSelect
          value={listedName(provinces, value.province)}
          onChange={(e) => onChange({ province: e.target.value, district: "", city: "" })}
        >
          <option value="">Select province…</option>
          {provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="District *">
        <NativeSelect
          value={listedName(districts, value.district)}
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
        <NativeSelect
          value={listedCity(cities, value.city)}
          onChange={(e) => onChange({ city: e.target.value })}
          disabled={!value.district || cityList.isLoading || (cityList.isSuccess && cities.length === 0)}
        >
          <option value="">
            {!value.district
              ? "Select district first…"
              : cityList.isLoading
                ? "Loading cities…"
                : cityList.isSuccess && cities.length === 0
                  ? "No cities are listed for this district"
                  : "Select city…"}
          </option>
          {cityOptions(cities).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
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
