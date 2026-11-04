import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import type { ActionInfo, Engine, FlowDetail, FlowGraph, FlowSummary, GraphIssue, SimulationInput, SimulationResult } from "@/types/bot-flow";

/** Admin only (bot-flows.view / .update). */
const url = (flow: string, tail = "") => `/admin/bot/flows/${encodeURIComponent(flow)}${tail}`;

export const listBotFlows = () => apiGet<FlowSummary[]>("/admin/bot/flows");
export const getBotFlowMeta = () => apiGet<{ actions: ActionInfo[] }>("/admin/bot/flows/meta");
export const getBotFlow = (flow: string) => apiGet<FlowDetail>(url(flow));

export const validateBotFlow = (flow: string, graph: FlowGraph) => apiPost<GraphIssue[]>(url(flow, "/validate"), { graph });
export const saveBotFlowDraft = (flow: string, graph: FlowGraph, note?: string) => apiPut<FlowDetail>(url(flow, "/draft"), { graph, note });
export const discardBotFlowDraft = (flow: string) => apiDelete<FlowDetail>(url(flow, "/draft"));
export const publishBotFlow = (flow: string, note?: string) => apiPost<FlowDetail>(url(flow, "/publish"), { note });
export const rollbackBotFlow = (flow: string, version: number) => apiPost<FlowDetail>(url(flow, "/rollback"), { version });

/** The kill switch: "legacy" = the built-in flow, "graph" = the published version. */
export const setBotFlowEngine = (flow: string, engine: Engine) => apiPut<FlowDetail>(url(flow, "/engine"), { engine });

export const simulateBotFlow = (flow: string, input: SimulationInput) => apiPost<SimulationResult>(url(flow, "/simulate"), input);
