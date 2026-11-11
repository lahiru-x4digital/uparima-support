import type { ActionInfo, Condition, FlowGraph, FlowNode, FlowNodeType } from "@/types/bot-flow";

/** One outgoing connection point of a node: `next`, `case:<i>`, `else` or `result:<tag>`. */
export interface Slot {
  handle: string;
  label: string;
  target: string | undefined;
}

export const NODE_LABEL: Record<FlowNodeType, string> = {
  go: "Go to state",
  text: "Send text",
  buttons: "Send buttons",
  branch: "Branch",
  action: "Run action",
};

/** A short human reading of a condition, for edge labels. */
export function describeCondition(cond: Condition): string {
  switch (cond.op) {
    case "driver":
      return "is a driver";
    case "driverStatus":
      return `driver is ${cond.is}`;
    case "incompleteDriver":
      return "signup unfinished";
    case "hasPrefs":
      return "seen the menu before";
    case "lang":
      return `language is ${cond.is.toUpperCase()}`;
    case "result":
      return `result is ${cond.is}`;
    case "not":
      return `not (${describeCondition(cond.cond)})`;
    case "all":
      return cond.conds.map(describeCondition).join(" and ");
    case "any":
      return cond.conds.map(describeCondition).join(" or ");
  }
}

/** Where a node can lead, with the label to show on each connection. */
export function slotsOf(node: FlowNode, actions: ActionInfo[] = []): Slot[] {
  switch (node.type) {
    case "branch":
      return [
        ...node.cases.map((c, i) => ({ handle: `case:${i}`, label: describeCondition(c.when), target: c.next || undefined })),
        { handle: "else", label: "otherwise", target: node.else },
      ];
    case "action": {
      const known = actions.find((a) => a.id === node.action)?.results ?? [];
      const tags = [...new Set([...known, ...Object.keys(node.results ?? {})])];
      return [
        ...tags.map((tag) => ({ handle: `result:${tag}`, label: tag, target: node.results?.[tag] })),
        { handle: "next", label: tags.length ? "any other result" : "then", target: node.next },
      ];
    }
    default:
      return [{ handle: "next", label: "then", target: node.next }];
  }
}

/** Points a node's connection at another node (or clears it). Returns a new graph. */
export function setSlotTarget(graph: FlowGraph, nodeId: string, handle: string, target: string | undefined): FlowGraph {
  const node = graph.nodes[nodeId];
  if (!node) return graph;
  let next: FlowNode = node;
  if (handle === "next") next = { ...node, next: target } as FlowNode;
  else if (handle === "else" && node.type === "branch") next = { ...node, else: target };
  else if (handle.startsWith("case:") && node.type === "branch") {
    const i = Number(handle.slice(5));
    next = { ...node, cases: node.cases.map((c, n) => (n === i ? { ...c, next: target ?? "" } : c)) };
  } else if (handle.startsWith("result:") && node.type === "action") {
    const tag = handle.slice(7);
    const results = { ...(node.results ?? {}) };
    if (target) results[tag] = target;
    else delete results[tag];
    next = { ...node, results };
  }
  return { ...graph, nodes: { ...graph.nodes, [nodeId]: next } };
}

export function updateNode(graph: FlowGraph, id: string, patch: FlowNode): FlowGraph {
  return { ...graph, nodes: { ...graph.nodes, [id]: patch } };
}

export function moveNode(graph: FlowGraph, id: string, x: number, y: number): FlowGraph {
  const node = graph.nodes[id];
  if (!node) return graph;
  return updateNode(graph, id, { ...node, ui: { x: Math.round(x), y: Math.round(y) } });
}

/** A new node with blank, valid-shaped contents. */
export function blankNode(type: FlowNodeType): FlowNode {
  switch (type) {
    case "go":
      return { type, state: "idle" };
    case "text":
      return { type, text: { key: "" } };
    case "buttons":
      return { type, text: { key: "" }, buttons: [] };
    case "branch":
      return { type, cases: [{ when: { op: "driver" }, next: "" }] };
    case "action":
      return { type, action: "" };
  }
}

export function addNode(graph: FlowGraph, type: FlowNodeType, at: { x: number; y: number }): { graph: FlowGraph; id: string } {
  let n = 1;
  while (graph.nodes[`${type}_${n}`]) n++;
  const id = `${type}_${n}`;
  const node = { ...blankNode(type), ui: { x: Math.round(at.x), y: Math.round(at.y) } } as FlowNode;
  return { graph: { ...graph, nodes: { ...graph.nodes, [id]: node } }, id };
}

/** Removes a node and every connection (and entry) that pointed at it. */
export function deleteNode(graph: FlowGraph, id: string): FlowGraph {
  const nodes: Record<string, FlowNode> = {};
  for (const [key, node] of Object.entries(graph.nodes)) {
    if (key === id) continue;
    let cleaned: FlowNode = node;
    for (const slot of slotsOf(node)) {
      if (slot.target === id) {
        cleaned = setSlotTarget({ ...graph, nodes: { [key]: cleaned } }, key, slot.handle, undefined).nodes[key];
      }
    }
    nodes[key] = cleaned;
  }
  const entries = Object.fromEntries(Object.entries(graph.entries).filter(([, first]) => first !== id));
  return { ...graph, nodes, entries };
}

/** Lays nodes out left to right by distance from the entries, so a fresh graph reads like a flow chart. */
export function autoLayout(graph: FlowGraph, gap = { x: 300, y: 150 }): FlowGraph {
  const depth = new Map<string, number>();
  const queue: string[] = [];
  for (const first of Object.values(graph.entries)) {
    if (graph.nodes[first] && !depth.has(first)) {
      depth.set(first, 0);
      queue.push(first);
    }
  }
  while (queue.length) {
    const id = queue.shift() as string;
    for (const slot of slotsOf(graph.nodes[id])) {
      if (slot.target && graph.nodes[slot.target] && !depth.has(slot.target)) {
        depth.set(slot.target, (depth.get(id) ?? 0) + 1);
        queue.push(slot.target);
      }
    }
  }
  // Nodes nothing leads to go in a column after the rest.
  const last = Math.max(-1, ...depth.values());
  for (const id of Object.keys(graph.nodes)) if (!depth.has(id)) depth.set(id, last + 1);
  const rows = new Map<number, number>();
  const nodes: Record<string, FlowNode> = {};
  for (const id of Object.keys(graph.nodes)) {
    const d = depth.get(id) as number;
    const row = rows.get(d) ?? 0;
    rows.set(d, row + 1);
    nodes[id] = { ...graph.nodes[id], ui: { x: d * gap.x, y: row * gap.y } };
  }
  return { ...graph, nodes };
}

/** Node ids in the order the editor lists them (entries first, then by position). */
export function nodeIds(graph: FlowGraph): string[] {
  const entryIds = new Set(Object.values(graph.entries));
  return Object.keys(graph.nodes).sort((a, b) => {
    const ea = entryIds.has(a) ? 0 : 1;
    const eb = entryIds.has(b) ? 0 : 1;
    if (ea !== eb) return ea - eb;
    const pa = graph.nodes[a].ui ?? { x: 0, y: 0 };
    const pb = graph.nodes[b].ui ?? { x: 0, y: 0 };
    return pa.x - pb.x || pa.y - pb.y || a.localeCompare(b);
  });
}
