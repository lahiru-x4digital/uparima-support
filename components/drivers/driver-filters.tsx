"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useVehicleTypes } from "@/lib/hooks/use-drivers";
import { placeKey } from "@/lib/driver-cities";
import { SRI_LANKA_DISTRICTS_BY_PROVINCE, SRI_LANKA_PROVINCES } from "@/lib/sri-lanka-locations";
import { cn } from "@/lib/utils";
import type { Driver } from "@/types/driver";

// The filters the Drivers list and the Pending Drivers queue share: online, whether support staff
// have reached the driver (and how), vehicle type, location and (optionally) registration date.
// The lists hold every driver in one response, so filtering is client-side.

const ONLINE_OPTIONS = ["all", "online", "offline"] as const;
type OnlineFilter = (typeof ONLINE_OPTIONS)[number];
// A logged call, or an agent's reply on one of the driver's tickets — see Driver.contact.
const CONTACT_OPTIONS = ["all", "contacted", "not contacted"] as const;
type ContactFilter = (typeof CONTACT_OPTIONS)[number];
const CONTACT_METHODS = [
  { value: "all", label: "Any method" },
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "app", label: "App chat" },
];

export const pillClass = (active: boolean) =>
  cn(
    "rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap capitalize transition-colors",
    active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card hover:border-ring hover:bg-accent",
  );
const filterSelectClass = (active: boolean) => cn(active && "border-primary");
const FILTER_SELECT_WIDTH = "w-48";
export const GROUP_LABEL = "mr-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase";

// YYYY-MM-DD of a timestamp in Sri Lanka time, to compare against the date inputs.
const colomboDay = (s: string) => new Date(s).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });

// A driver who signed up in the app carries the location list's names ("Western Province",
// "Colombo District"); one added by staff carries the short names this filter offers. So compare
// what identifies the place, not the text.
const samePlace = (stored: string | null, picked: string) => !!stored && placeKey(stored) === placeKey(picked);

// A city can be typed by hand, so case and stray spaces vary between drivers.
const cityName = (city: string) => city.trim().replace(/\s+/g, " ");
const cityKey = (city: string) => cityName(city).toLowerCase();

/** The shared filters' state for `drivers`, and the test a driver must pass. */
export function useDriverFilters(drivers: Driver[]) {
  const [online, setOnline] = useState<OnlineFilter>("all");
  const [contacted, setContacted] = useState<ContactFilter>("all");
  const [contactMethod, setContactMethod] = useState("all");
  const [vehicleTypeId, setVehicleTypeId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [province, setProvince] = useState("all");
  const [district, setDistrict] = useState("all");
  const [division, setDivision] = useState("all");

  const districtOptions = province !== "all" ? (SRI_LANKA_DISTRICTS_BY_PROVINCE[province] ?? []) : [];
  const divisionOptions = useMemo(() => {
    const cities = new Map<string, string>();
    for (const d of drivers) {
      if (!d.city?.trim()) continue;
      if (province !== "all" && !samePlace(d.province, province)) continue;
      if (district !== "all" && !samePlace(d.district, district)) continue;
      if (!cities.has(cityKey(d.city))) cities.set(cityKey(d.city), cityName(d.city));
    }
    return [...cities.values()].sort((a, b) => a.localeCompare(b));
  }, [drivers, province, district]);
  // The divisions on offer come from the drivers loaded, so one picked under another list may not
  // be among them. The dropdown then reads "All divisions" — don't keep filtering by a choice it
  // no longer shows.
  const activeDivision = divisionOptions.find((c) => cityKey(c) === cityKey(division)) ?? "all";

  function matches(d: Driver): boolean {
    if (online !== "all" && d.isOnline !== (online === "online")) return false;
    const methods = d.contact?.methods ?? [];
    if (contacted === "contacted" && methods.length === 0) return false;
    if (contacted === "not contacted" && methods.length > 0) return false;
    if (contactMethod !== "all" && !methods.includes(contactMethod)) return false;
    if (vehicleTypeId !== "all" && String(d.vehicleTypeId) !== vehicleTypeId) return false;
    if (dateFrom || dateTo) {
      const day = colomboDay(d.createdAt);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
    }
    if (province !== "all" && !samePlace(d.province, province)) return false;
    if (district !== "all" && !samePlace(d.district, district)) return false;
    if (activeDivision !== "all" && cityKey(d.city ?? "") !== cityKey(activeDivision)) return false;
    return true;
  }

  const active =
    online !== "all" ||
    contacted !== "all" ||
    contactMethod !== "all" ||
    vehicleTypeId !== "all" ||
    !!dateFrom ||
    !!dateTo ||
    province !== "all" ||
    district !== "all" ||
    activeDivision !== "all";

  function clear() {
    setOnline("all");
    setContacted("all");
    setContactMethod("all");
    setVehicleTypeId("all");
    setDateFrom("");
    setDateTo("");
    setProvince("all");
    setDistrict("all");
    setDivision("all");
  }

  return {
    matches,
    active,
    clear,
    /** Changes whenever a filter does — for resetting pagination. */
    key: [online, contacted, contactMethod, vehicleTypeId, dateFrom, dateTo, province, district, activeDivision].join("|"),
    state: { online, contacted, contactMethod, vehicleTypeId, dateFrom, dateTo, province, district, activeDivision },
    set: { setOnline, setContacted, setContactMethod, setVehicleTypeId, setDateFrom, setDateTo, setProvince, setDistrict, setDivision },
    districtOptions,
    divisionOptions,
  };
}

export type DriverFilters = ReturnType<typeof useDriverFilters>;

/**
 * The shared filters' controls: online and contact on one row, vehicle type and location (and,
 * with `withDates`, the registration dates) on the next, then "Clear filters" when any is set.
 */
export function DriverFilterBar({ filters, withDates = false }: { filters: DriverFilters; withDates?: boolean }) {
  const { state: f, set, districtOptions, divisionOptions } = filters;
  const vehicleTypes = useVehicleTypes().data ?? [];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <span className={GROUP_LABEL}>Online</span>
        {ONLINE_OPTIONS.map((o) => (
          <button key={o} onClick={() => set.setOnline(o)} aria-pressed={f.online === o} className={pillClass(f.online === o)}>
            {o}
          </button>
        ))}

        <span className="mx-2 hidden h-6 w-px bg-border sm:block" />

        <span className={GROUP_LABEL}>Contact</span>
        {CONTACT_OPTIONS.map((o) => (
          <button
            key={o}
            onClick={() => {
              set.setContacted(o);
              // "Not contacted" has no method to narrow by.
              if (o === "not contacted") set.setContactMethod("all");
            }}
            aria-pressed={f.contacted === o}
            className={pillClass(f.contacted === o)}
          >
            {o}
          </button>
        ))}
        <NativeSelect
          aria-label="Contact method"
          value={f.contactMethod}
          onChange={(e) => set.setContactMethod(e.target.value)}
          disabled={f.contacted === "not contacted"}
          containerClassName={FILTER_SELECT_WIDTH}
          className={filterSelectClass(f.contactMethod !== "all")}
        >
          {CONTACT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <NativeSelect
          aria-label="Vehicle type"
          value={f.vehicleTypeId}
          onChange={(e) => set.setVehicleTypeId(e.target.value)}
          containerClassName={FILTER_SELECT_WIDTH}
          className={filterSelectClass(f.vehicleTypeId !== "all")}
        >
          <option value="all">All vehicle types</option>
          {vehicleTypes.map((vt) => (
            <option key={vt.id} value={String(vt.id)}>
              {vt.name}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="Province"
          value={f.province}
          onChange={(e) => {
            set.setProvince(e.target.value);
            set.setDistrict("all");
            set.setDivision("all");
          }}
          containerClassName={FILTER_SELECT_WIDTH}
          className={filterSelectClass(f.province !== "all")}
        >
          <option value="all">All provinces</option>
          {SRI_LANKA_PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="District"
          value={f.district}
          onChange={(e) => {
            set.setDistrict(e.target.value);
            set.setDivision("all");
          }}
          disabled={f.province === "all"}
          containerClassName={FILTER_SELECT_WIDTH}
          className={filterSelectClass(f.district !== "all")}
        >
          <option value="all">All districts</option>
          {districtOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="Division"
          value={f.activeDivision}
          onChange={(e) => set.setDivision(e.target.value)}
          containerClassName={FILTER_SELECT_WIDTH}
          className={filterSelectClass(f.activeDivision !== "all")}
        >
          <option value="all">All divisions</option>
          {divisionOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>

        {withDates && (
          <>
            <span className="mx-2 hidden h-6 w-px bg-border sm:block" />
            <label className="flex items-center gap-2 text-sm font-medium">
              Registered from
              <Input type="date" value={f.dateFrom} onChange={(e) => set.setDateFrom(e.target.value)} className="w-auto" />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              to
              <Input type="date" value={f.dateTo} onChange={(e) => set.setDateTo(e.target.value)} className="w-auto" />
            </label>
          </>
        )}

        {filters.active && (
          <button onClick={filters.clear} className="text-sm font-medium text-primary hover:underline">
            Clear filters
          </button>
        )}
      </div>
    </>
  );
}
