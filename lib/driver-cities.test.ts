import { describe, expect, it } from "vitest";
import { cityOptions, findPlace, formDistrict, formProvince, loadDistrictCities, placeKey } from "./driver-cities";
import { SRI_LANKA_DISTRICTS_BY_PROVINCE } from "./sri-lanka-locations";

describe("showing a stored province and district in the form's dropdowns", () => {
  it("recognises the names the driver app stores", () => {
    expect(formProvince("Sabaragamuwa Province")).toBe("Sabaragamuwa");
    expect(formProvince("North Western Province")).toBe("North Western");
    expect(formDistrict("Kegalle District")).toBe("Kegalle");
    expect(formDistrict("Nuwara Eliya District")).toBe("Nuwara Eliya");
  });

  it("offers that province's districts", () => {
    expect(SRI_LANKA_DISTRICTS_BY_PROVINCE[formProvince("Sabaragamuwa Province")]).toContain("Kegalle");
  });

  it("leaves the form's own names, an empty value and an unknown name alone", () => {
    expect(formProvince("Western")).toBe("Western");
    expect(formDistrict("Colombo")).toBe("Colombo");
    expect(formProvince("")).toBe("");
    expect(formDistrict("Atlantis")).toBe("Atlantis");
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
    expect(cityOptions(["Peradeniya", "Kandy City", "Gampola", "Kandy City"], "")).toEqual([
      "Gampola",
      "Kandy City",
      "Peradeniya",
    ]);
  });

  it("keeps a city already on the record that the list doesn't have", () => {
    expect(cityOptions(["Gampola", "Kandy City"], "Thennekumbura")).toEqual(["Thennekumbura", "Gampola", "Kandy City"]);
    expect(cityOptions(["Gampola", "Kandy City"], "Kandy City")).toEqual(["Gampola", "Kandy City"]);
    expect(cityOptions([], "Rajagiriya")).toEqual(["Rajagiriya"]);
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
