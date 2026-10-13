import { describe, expect, it } from "vitest";
import {
  cityOptions,
  findPlace,
  listedCity,
  listedName,
  loadDistrictCities,
  loadProvinceDistricts,
  loadProvinces,
  placeKey,
} from "./driver-cities";

describe("showing a stored province and district in the form's dropdowns", () => {
  const provinces = ["Western Province", "North Western Province", "Sabaragamuwa Province"];

  it("shows a short or older name as the listed one the driver app saves", () => {
    expect(listedName(provinces, "Western")).toBe("Western Province");
    expect(listedName(provinces, "North Western")).toBe("North Western Province");
    expect(listedName(provinces, "Western Province")).toBe("Western Province");
  });

  it("shows nothing picked for an empty value or a name the list doesn't hold, Sinhala included", () => {
    expect(listedName(provinces, "")).toBe("");
    expect(listedName(provinces, "Atlantis")).toBe("");
    expect(listedName(provinces, "බස්නාහිර")).toBe("");
  });
});

describe("matching the form's names to the location list", () => {
  it("ignores the words Province and District, case, spaces and hyphens", () => {
    expect(placeKey("Western")).toBe(placeKey("Western Province"));
    expect(placeKey("Nuwara Eliya")).toBe(placeKey("Nuwara-Eliya District"));
    expect(placeKey("north western")).toBe(placeKey("North Western Province"));
  });

  it("does not confuse neighbouring names", () => {
    const provinces = [
      { id: 6, name: "North Western Province" },
      { id: 1, name: "Western Province" },
      { id: 7, name: "North Central Province" },
    ];
    expect(findPlace(provinces, "Western")?.id).toBe(1);
    expect(findPlace(provinces, "North Western")?.id).toBe(6);
    expect(findPlace(provinces, "Southern")).toBeUndefined();
    expect(findPlace(provinces, "")).toBeUndefined();
  });
});

describe("the city dropdown's options", () => {
  it("lists the district's cities alphabetically, once each", () => {
    expect(cityOptions(["Peradeniya", "Kandy City", "Gampola", "Kandy City"])).toEqual([
      "Gampola",
      "Kandy City",
      "Peradeniya",
    ]);
  });

  it("shows a stored city only when the list has it", () => {
    expect(listedCity(["Gampola", "Kandy City"], "kandy city ")).toBe("Kandy City");
    expect(listedCity(["Gampola", "Kandy City"], "Thennekumbura")).toBe("");
    expect(listedCity(["Gampola"], "ගම්පොල")).toBe("");
  });
});

describe("loading a district's cities", () => {
  const lists: Record<string, { id: number; name: string }[]> = {
    "/geo/states?countryId=1": [
      { id: 1, name: "Western Province" },
      { id: 2, name: "Central Province" },
    ],
    "/geo/cities?stateId=2": [
      { id: 4, name: "Kandy District" },
      { id: 5, name: "Matale District" },
    ],
    "/geo/areas?cityId=4": [
      { id: 90, name: "Kandy City" },
      { id: 91, name: "Gampola" },
    ],
  };
  const asked: string[] = [];
  const get = <T,>(path: string) => {
    asked.push(path);
    return Promise.resolve((lists[path] ?? []) as T);
  };

  it("walks province → district → cities by name", async () => {
    expect(await loadDistrictCities(get, "Central", "Kandy")).toEqual(["Kandy City", "Gampola"]);
    expect(asked).toEqual(["/geo/states?countryId=1", "/geo/cities?stateId=2", "/geo/areas?cityId=4"]);
  });

  it("gives nothing for a province or district the list doesn't have", async () => {
    expect(await loadDistrictCities(get, "Southern", "Galle")).toEqual([]);
    expect(await loadDistrictCities(get, "Central", "Colombo")).toEqual([]);
  });
});

describe("loading provinces and a province's districts", () => {
  const lists: Record<string, { id: number; name: string }[]> = {
    "/geo/states?countryId=1": [
      { id: 1, name: "Western Province" },
      { id: 2, name: "Central Province" },
    ],
    "/geo/cities?stateId=2": [{ id: 4, name: "Kandy District" }],
  };
  const get = <T,>(path: string) => Promise.resolve((lists[path] ?? []) as T);

  it("names them as the driver app saves them", async () => {
    expect(await loadProvinces(get)).toEqual(["Western Province", "Central Province"]);
    expect(await loadProvinceDistricts(get, "Central")).toEqual(["Kandy District"]);
  });

  it("gives no districts for a province the list doesn't have", async () => {
    expect(await loadProvinceDistricts(get, "Atlantis")).toEqual([]);
  });
});
