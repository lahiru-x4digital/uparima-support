import { describe, expect, it } from "vitest";
import { groupOf, lengthOf, placeholdersOf, problemsFor, renderSample } from "./text-rules";

const ok = { en: "Hi {name}", si: "සිං {name}", ta: "தமிழ் {name}" };

describe("problemsFor", () => {
  it("is empty for text that keeps the placeholders and fits", () => {
    expect(problemsFor(ok, ["name"], 100)).toEqual({});
  });

  it("flags empty, missing, unknown and too-long text per language", () => {
    const problems = problemsFor({ en: "Hi", si: " ", ta: "x {other} {name}" }, ["name"], 100);
    expect(problems.en).toBe("Missing {name}");
    expect(problems.si).toBe("Required");
    expect(problems.ta).toBe("Unknown {other}");
    expect(problemsFor({ ...ok, en: "{name}" + "x".repeat(30) }, ["name"], 20).en).toBe("Too long: 36 of 20");
  });
});

describe("helpers", () => {
  it("lists placeholders once and counts characters by code point", () => {
    expect(placeholdersOf("{a} {b} {a}")).toEqual(["a", "b"]);
    expect(lengthOf("😀a")).toBe(2);
  });

  it("renders samples and drops the space before an empty value", () => {
    expect(renderSample("Hello {name}!", { name: "Nimal" })).toBe("Hello Nimal!");
    expect(renderSample("Hello {name}!", {})).toBe("Hello!");
  });

  it("groups by the first key segment", () => {
    expect(groupOf("btn.help")).toBe("btn");
    expect(groupOf("plain")).toBe("plain");
  });
});
