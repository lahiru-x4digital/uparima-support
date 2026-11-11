/** Editable bot flows: `/admin/bot/flows`. Mirrors the backend's engine/graph.types.ts. */

export type ParamValue = string | number | { var: string };

export interface TextRef {
  /** Catalogue key, e.g. `home.customer`. */
  key: string;
  params?: Record<string, ParamValue>;
}

export type Condition =
  | { op: "driver" }
  | { op: "driverStatus"; is: string }
  | { op: "incompleteDriver" }
  | { op: "hasPrefs" }
  | { op: "lang"; is: "en" | "si" | "ta" }
  | { op: "result"; is: string }
  | { op: "not"; cond: Condition }
  | { op: "all"; conds: Condition[] }
  | { op: "any"; conds: Condition[] };

export interface ButtonDef {
  id: string;
  /** Catalogue key of the button title. */
  title: string;
}

interface NodeBase {
  ui?: { x: number; y: number };
  note?: string;
}

export type FlowNode = NodeBase &
  (
    | { type: "branch"; cases: Array<{ when: Condition; next: string }>; else?: string }
    | { type: "go"; state: string; flow?: Record<string, unknown>; next?: string }
    | { type: "text"; text: TextRef; next?: string }
    | { type: "buttons"; text: TextRef; buttons: ButtonDef[]; next?: string }
    | { type: "action"; action: string; params?: Record<string, unknown>; results?: Record<string, string>; next?: string }
  );

export type FlowNodeType = FlowNode["type"];

export interface FlowGraph {
  schema: 1;
  flow: string;
  entries: Record<string, string>;
  nodes: Record<string, FlowNode>;
}

export interface GraphIssue {
  severity: "error" | "warning";
  node?: string;
  message: string;
}

export interface ActionInfo {
  id: string;
  title: string;
  results: string[];
}

export type Engine = "legacy" | "graph";

export interface FlowSummary {
  flow: string;
  engine: Engine;
  publishedVersion: number | null;
  hasDraft: boolean;
  fallbacks: number;
  lastFallback: { at: string; error: string } | null;
}

export interface FlowVersionInfo {
  version: number;
  status: "draft" | "published" | "archived";
  note: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  publishedBy: number | null;
  publishedAt: string | null;
}

export interface FlowVersion extends FlowVersionInfo {
  graph: FlowGraph;
}

export interface FlowDetail {
  flow: string;
  engine: Engine;
  publishedVersion: number | null;
  published: FlowVersion | null;
  draft: FlowVersion | null;
  versions: FlowVersionInfo[];
  issues: GraphIssue[];
  builtIn: FlowGraph;
  fallbacks: { count: number; at: string; error: string } | null;
}

export type SimulationRole = "new_customer" | "returning_customer" | "driver" | "pending_driver" | "incomplete_driver";

export interface SimulationInput {
  graph?: FlowGraph;
  entry: string;
  role: SimulationRole;
  language: "en" | "si" | "ta";
  name?: string;
}

export interface RecordedOutput {
  kind: "text" | "buttons" | "list" | "locationRequest" | "cta";
  body: string;
  options?: Array<{ id: string; title: string }>;
}

export interface SimulationResult {
  outputs: RecordedOutput[];
  state: string;
  issues: GraphIssue[];
  error?: string;
}
