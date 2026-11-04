"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  discardBotFlowDraft,
  getBotFlow,
  getBotFlowMeta,
  listBotFlows,
  publishBotFlow,
  rollbackBotFlow,
  saveBotFlowDraft,
  setBotFlowEngine,
  simulateBotFlow,
  validateBotFlow,
} from "@/lib/services/bot-flows.service";
import type { Engine, FlowDetail, FlowGraph, SimulationInput } from "@/types/bot-flow";
import { botKeys } from "./query-keys";

export const useBotFlows = () => useQuery({ queryKey: botKeys.flows, queryFn: listBotFlows });
export const useBotFlowMeta = () => useQuery({ queryKey: botKeys.meta, queryFn: getBotFlowMeta, staleTime: 5 * 60_000 });
export const useBotFlow = (flow: string) => useQuery({ queryKey: botKeys.flow(flow), queryFn: () => getBotFlow(flow) });

/** Problems in the graph being edited, asked of the server (which knows the messages and actions). */
export function useBotFlowIssues(flow: string, graph: FlowGraph | null) {
  return useQuery({
    enabled: !!graph,
    queryKey: botKeys.issues(flow, graph),
    queryFn: () => validateBotFlow(flow, graph as FlowGraph),
    placeholderData: (previous) => previous,
  });
}

/** Every flow action refreshes the one flow and the list. */
function useFlowMutation<V>(flow: string, fn: (variables: V) => Promise<FlowDetail>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (detail) => {
      qc.setQueryData(botKeys.flow(flow), detail);
      void qc.invalidateQueries({ queryKey: botKeys.flows });
    },
  });
}

export const useSaveBotFlowDraft = (flow: string) => useFlowMutation(flow, ({ graph, note }: { graph: FlowGraph; note?: string }) => saveBotFlowDraft(flow, graph, note));
export const useDiscardBotFlowDraft = (flow: string) => useFlowMutation(flow, () => discardBotFlowDraft(flow));
export const usePublishBotFlow = (flow: string) => useFlowMutation(flow, (note?: string) => publishBotFlow(flow, note));
export const useRollbackBotFlow = (flow: string) => useFlowMutation(flow, (version: number) => rollbackBotFlow(flow, version));
export const useSetBotFlowEngine = (flow: string) => useFlowMutation(flow, (engine: Engine) => setBotFlowEngine(flow, engine));

export const useSimulateBotFlow = (flow: string) => useMutation({ mutationFn: (input: SimulationInput) => simulateBotFlow(flow, input) });
