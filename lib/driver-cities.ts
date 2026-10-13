// The cities a driver's address can name: the same province → district → city list the driver app
// registers with (the backend's public /geo lists), so staff pick from it instead of typing.
// The admin dashboard (uparima-classified-dashbord/lib/driver-cities.ts) has the same rules.

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
 * A stored province or district under the name the location list holds it by — the name the driver
 * app saves ("Western Province", "Colombo District"). A short or older name ("Western") resolves to
 * it, so the dropdown shows it picked. A name the list doesn't hold (free text, Sinhala) shows as
 * nothing picked: only listed places can be chosen, never typed.
 */
export const listedName = (places: string[], stored: string): string =>
  places.find((p) => placeKey(p) === placeKey(stored)) ?? "";

/** What the city dropdown offers: the district's cities in alphabetical order, once each. */
export function cityOptions(cities: string[]): string[] {
  return [...new Set(cities.map((c) => c.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/** The stored city as the list spells it, or "" when the list doesn't have it. */
export const listedCity = (cities: string[], stored: string): string =>
  cities.find((c) => c.trim().toLowerCase() === stored.trim().toLowerCase()) ?? "";

type Get = <T>(path: string) => Promise<T>;

// Sri Lanka is country 1 in the location list, as in the driver app.
const loadStates = (get: Get) => get<Place[]>("/geo/states?countryId=1");

/** The provinces, named as the driver app saves them. */
export async function loadProvinces(get: Get): Promise<string[]> {
  return (await loadStates(get)).map((p) => p.name);
}

/** The districts of one province, found by the name the form holds. Empty when the province isn't in the list. */
export async function loadProvinceDistricts(get: Get, province: string): Promise<string[]> {
  const province_ = findPlace(await loadStates(get), province);
  if (!province_) return [];
  return (await get<Place[]>(`/geo/cities?stateId=${province_.id}`)).map((d) => d.name);
}

/** The cities of one district, found by the names the form holds. Empty when the district isn't in the list. */
export async function loadDistrictCities(
  get: Get,
  province: string,
  district: string,
): Promise<string[]> {
  const province_ = findPlace(await loadStates(get), province);
  if (!province_) return [];
  const district_ = findPlace(await get<Place[]>(`/geo/cities?stateId=${province_.id}`), district);
  if (!district_) return [];
  return (await get<Place[]>(`/geo/areas?cityId=${district_.id}`)).map((area) => area.name);
}

/** A town found by name, with the district and province it sits in. */
export type AreaMatch = { id: number; name: string; district: string; province: string };

/** Towns matching the text anywhere in the country — picking one fills province and district too. */
export const searchAreas = (get: Get, text: string): Promise<AreaMatch[]> =>
  get<AreaMatch[]>(`/geo/areas/search?q=${encodeURIComponent(text.trim())}`);
