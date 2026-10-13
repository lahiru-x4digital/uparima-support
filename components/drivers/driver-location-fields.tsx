"use client";

import { useEffect, useState } from "react";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { cityOptions, listedCity, listedName } from "@/lib/driver-cities";
import { useAreaSearch, useDistrictCities, useProvinceDistricts, useProvinces } from "@/lib/hooks/use-drivers";

export interface DriverLocation {
  province: string;
  district: string;
  city: string;
}

const asOptions = (names: string[]) => names.map((n) => ({ value: n, label: n }));

/**
 * Province → district → city, each picked from the list the driver app registers with; every one
 * has a search box. Changing a level clears the ones below it, and searching a town by name
 * (even before a province is chosen) fills in its district and province as well. Renders three
 * fields as siblings, so it fits the caller's grid.
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

  // What is typed in the city search, once it has settled for a moment.
  const [typed, setTyped] = useState("");
  const [settled, setSettled] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSettled(typed), 250);
    return () => clearTimeout(t);
  }, [typed]);
  const found = useAreaSearch(settled);
  const searching = typed.trim().length >= 2;

  const matches = found.data ?? [];
  const cityChoices = searching
    ? matches.map((m) => ({ value: String(m.id), label: m.name, hint: `${m.district}, ${m.province}` }))
    : asOptions(cityOptions(cities));

  function pickCity(choice: string) {
    if (!searching) return onChange({ city: choice });
    const m = matches.find((x) => String(x.id) === choice);
    if (m) onChange({ province: m.province, district: m.district, city: m.name });
  }

  const city = listedCity(cities, value.city);
  const noCities = cityList.isSuccess && cities.length === 0;

  return (
    <>
      {/* Only listed places can be chosen, never typed. A short or older name on record shows as its listed one; one the list doesn't hold shows as nothing picked, so staff pick again. */}
      <Field label="Province *">
        <SearchSelect
          options={asOptions(provinces)}
          selectedLabel={listedName(provinces, value.province)}
          selectedValue={listedName(provinces, value.province)}
          onSelect={(province) => onChange({ province, district: "", city: "" })}
          placeholder="Select province…"
          searchPlaceholder="Search provinces…"
        />
      </Field>
      <Field label="District *">
        <SearchSelect
          options={asOptions(districts)}
          selectedLabel={listedName(districts, value.district)}
          selectedValue={listedName(districts, value.district)}
          onSelect={(district) => onChange({ district, city: "" })}
          placeholder={value.province ? "Select district…" : "Select province first…"}
          searchPlaceholder="Search districts…"
          disabled={!value.province}
        />
      </Field>
      <Field label="City *">
        <SearchSelect
          options={cityChoices}
          selectedLabel={city}
          selectedValue={searching ? undefined : city}
          onSelect={pickCity}
          onQueryChange={setTyped}
          filterLocally={false}
          loading={searching && (found.isFetching || settled !== typed)}
          placeholder={
            cityList.isLoading ? "Loading cities…" : noCities ? "No cities are listed — search a town" : "Select city…"
          }
          searchPlaceholder="Search any town to fill the district and province…"
          emptyText={searching ? "No town found by that name" : value.district ? "No cities listed" : "Pick a district, or search a town"}
        />
        {found.isError && <p className="text-xs text-destructive">The search failed — try again.</p>}
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
