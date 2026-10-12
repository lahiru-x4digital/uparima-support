// The cities a driver's address can name: the same province → district → city list the driver app
// registers with (the backend's public /geo lists), so staff pick from it instead of typing.
// The admin dashboard (uparima-classified-dashbord/lib/driver-cities.ts) has the same rules.

import { SRI_LANKA_DISTRICTS_BY_PROVINCE, SRI_LANKA_PROVINCES } from "./sri-lanka-locations";

export type Place = { id: number; name: string };

/**
 * A place name reduced to what identifies it. The form says "Western" and "Colombo" where the
 * location list says "Western Province" and "Colombo District", and spacing or hyphens vary.
 */
export const placeKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/\b(province|district)\b/g, "")
    .replace(/[^a-z]/g, "");

export const findPlace = <T extends { name: string }>(places: T[], name: string): T | undefined =>
  name.trim() === "" ? undefined : places.find((p) => placeKey(p.name) === placeKey(name));

/**
 * A stored province or district under the name the driver form's dropdown offers it by. A driver
 * who signed up in the app has "Western Province" / "Colombo District" on record, which the
 * dropdown would otherwise show as nothing picked. A name the form doesn't offer is kept as it is.
 */
export const formProvince = (stored: string): string =>
  SRI_LANKA_PROVINCES.find((p) => placeKey(p) === placeKey(stored)) ?? stored;

export const formDistrict = (stored: string): string =>
  Object.values(SRI_LANKA_DISTRICTS_BY_PROVINCE)
    .flat()
    .find((d) => placeKey(d) === placeKey(stored)) ?? stored;

/**
 * What the city dropdown offers: the district's cities in alphabetical order. A city already on
 * the driver's record stays on offer even when the list doesn't have it, so opening the form
 * never drops it.
 */
export function cityOptions(cities: string[], current: string): string[] {
  const options = [...new Set(cities.map((c) => c.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const kept = current.trim();
  return kept !== "" && !options.includes(kept) ? [kept, ...options] : options;
}

/** The cities of one district, found by the names the form holds. Empty when the district isn't in the list. */
export async function loadDistrictCities(
  get: <T>(path: string) => Promise<T>,
  province: string,
  district: string,
): Promise<string[]> {
  // Sri Lanka is country 1 in the location list, as in the driver app.
  const province_ = findPlace(await get<Place[]>("/geo/states?countryId=1"), province);
  if (!province_) return [];
  const district_ = findPlace(await get<Place[]>(`/geo/cities?stateId=${province_.id}`), district);
  if (!district_) return [];
  return (await get<Place[]>(`/geo/areas?cityId=${district_.id}`)).map((area) => area.name);
}
