import { describe, expect, it } from "vitest";
import type { FlowGraph } from "@/types/bot-flow";
import { addNode, autoLayout, deleteNode, describeCondition, moveNode, nodeIds, setSlotTarget, slotsOf } from "./graph-model";

const graph = (): FlowGraph => ({
  schema: 1,
  flow: "home",
  entries: { show: "start" },
  nodes: {
    start: { type: "go", state: "idle", next: "who" },
    who: {
      type: "branch",
      cases: [{ when: { op: "driver" }, next: "drv" }],
      else: "cust",
    },
    drv: { type: "text", text: { key: "home.driver" } },
    cust: { type: "action", action: "home.markReturning", results: { new: "drv" } },
  },
});

const actions = [{ id: "home.markReturning", title: "", results: ["returning", "new"] }];

describe("slotsOf", () => {
  it("lists a branch's cases and its otherwise path", () => {
    expect(slotsOf(graph().nodes.who)).toEqual([
      { handle: "case:0", label: "is a driver", target: "drv" },
      { handle: "else", label: "otherwise", target: "cust" },
    ]);
  });

  it("lists every result an action can return, wired or not", () => {
    const slots = slotsOf(graph().nodes.cust, actions);
    expect(slots.map((s) => [s.handle, s.target])).toEqual([
      ["result:returning", undefined],
      ["result:new", "drv"],
      ["next", undefined],
    ]);
  });
});

describe("editing", () => {
  it("connects and disconnects without touching the original", () => {
    const g = graph();
    const wired = setSlotTarget(g, "cust", "result:returning", "drv");
    expect(wired.nodes.cust).toMatchObject({ results: { new: "drv", returning: "drv" } });
    expect(setSlotTarget(wired, "cust", "result:new", undefined).nodes.cust).toMatchObject({ results: { returning: "drv" } });
    expect(setSlotTarget(g, "who", "case:0", "cust").nodes.who).toMatchObject({ cases: [{ next: "cust" }] });
    expect(setSlotTarget(g, "who", "else", undefined).nodes.who).toMatchObject({ else: undefined });
    expect(g.nodes.cust).toMatchObject({ results: { new: "drv" } });
  });

  it("adds nodes with fresh ids and moves them", () => {
    const a = addNode(graph(), "text", { x: 10.4, y: 20.6 });
    const b = addNode(a.graph, "text", { x: 0, y: 0 });
    expect([a.id, b.id]).toEqual(["text_1", "text_2"]);
    expect(a.graph.nodes.text_1.ui).toEqual({ x: 10, y: 21 });
    expect(moveNode(b.graph, "text_2", 5.2, 6.7).nodes.text_2.ui).toEqual({ x: 5, y: 7 });
  });

  it("deleting a node removes every connection and entry that led to it", () => {
    const g = deleteNode(graph(), "drv");
    expect(g.nodes.drv).toBeUndefined();
    expect(g.nodes.who).toMatchObject({ cases: [{ next: "" }], else: "cust" });
    expect(g.nodes.cust).toMatchObject({ results: {} });
    const noEntry = deleteNode(graph(), "start");
    expect(noEntry.entries).toEqual({});
  });
});

describe("layout and helpers", () => {
  it("places nodes in columns by distance from the entry", () => {
    const g = autoLayout(graph());
    expect(g.nodes.start.ui).toEqual({ x: 0, y: 0 });
    expect(g.nodes.who.ui).toEqual({ x: 300, y: 0 });
    // drv and cust are both two steps away; cust's other link to drv doesn't pull drv further right.
    expect(g.nodes.drv.ui?.x).toBe(600);
    expect(g.nodes.cust.ui?.x).toBe(600);
    expect(g.nodes.drv.ui?.y).not.toBe(g.nodes.cust.ui?.y);
  });

  it("puts entries first when listing nodes", () => {
    expect(nodeIds(graph())[0]).toBe("start");
  });

  it("describes conditions in words", () => {
    expect(describeCondition({ op: "not", cond: { op: "driverStatus", is: "pending" } })).toBe("not (driver is pending)");
    expect(describeCondition({ op: "all", conds: [{ op: "driver" }, { op: "lang", is: "si" }] })).toBe("is a driver and language is SI");
  });
});
