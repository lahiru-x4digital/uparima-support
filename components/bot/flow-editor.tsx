"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type NodeChange,
} from "@xyflow/react";
import { LayoutGrid, Redo2, Save, Send, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/shared/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/api";
import {
  NODE_LABEL,
  addNode,
  autoLayout,
  deleteNode,
  moveNode,
  setSlotTarget,
  slotsOf,
  updateNode,
} from "@/lib/bot/graph-model";
import {
  useBotFlow,
  useBotFlowIssues,
  useBotFlowMeta,
  useDiscardBotFlowDraft,
  usePublishBotFlow,
  useSaveBotFlowDraft,
} from "@/lib/hooks/use-bot-flows";
import { useBotTexts } from "@/lib/hooks/use-bot-texts";
import { useIsAdmin } from "@/lib/hooks/use-desk";
import { cn } from "@/lib/utils";
import type { FlowGraph, FlowNode, FlowNodeType, GraphIssue } from "@/types/bot-flow";
import { FlowNodeView, type FlowNodeData, type FlowRFNode } from "./flow-node";
import { FlowSimulator } from "./flow-simulator";
import { FlowVersions } from "./flow-versions";
import { NodeInspector, type InspectorContext } from "./node-inspector";

const NODE_TYPES = { flow: FlowNodeView };
const ADDABLE: FlowNodeType[] = ["text", "buttons", "branch", "action", "go"];
const HISTORY_LIMIT = 50;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type Tab = "inspect" | "test" | "problems" | "versions";

export function FlowEditorPage({ flow }: { flow: string }) {
  const isAdmin = useIsAdmin();
  const detail = useBotFlow(flow);
  const meta = useBotFlowMeta();
  const texts = useBotTexts({});

  if (!isAdmin) {
    return (
      <PageShell title="Bot flow">
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Only admins can edit bot flows.</p>
      </PageShell>
    );
  }
  if (detail.isPending || meta.isPending || texts.isPending) {
    return (
      <PageShell title={`Flow: ${flow}`} backHref="/settings/bot">
        <Skeleton className="h-96 w-full" />
      </PageShell>
    );
  }
  if (detail.isError || meta.isError || texts.isError) {
    const error = detail.error ?? meta.error ?? texts.error;
    return (
      <PageShell title={`Flow: ${flow}`} backHref="/settings/bot">
        <div className="space-y-3 rounded-xl border bg-card p-6 text-sm">
          <p className="text-destructive">{getErrorMessage(error)}</p>
          <Button variant="outline" onClick={() => void Promise.all([detail.refetch(), meta.refetch(), texts.refetch()])}>
            Try again
          </Button>
        </div>
      </PageShell>
    );
  }
  return (
    <ReactFlowProvider>
      <Editor flow={flow} detail={detail.data} actions={meta.data.actions} texts={texts.data} />
    </ReactFlowProvider>
  );
}

function Editor({
  flow,
  detail,
  actions,
  texts,
}: {
  flow: string;
  detail: NonNullable<ReturnType<typeof useBotFlow>["data"]>;
  actions: InspectorContext["actions"];
  texts: NonNullable<ReturnType<typeof useBotTexts>["data"]>;
}) {
  // What the server holds: the draft if there is one, else the live version, else the built-in graph.
  const saved: FlowGraph = (detail.draft?.graph ?? detail.published?.graph ?? detail.builtIn) as FlowGraph;
  const [graph, setGraph] = useState<FlowGraph>(saved);
  const [past, setPast] = useState<FlowGraph[]>([]);
  const [future, setFuture] = useState<FlowGraph[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("inspect");
  const [note, setNote] = useState("");
  const [publishing, setPublishing] = useState(false);

  const save = useSaveBotFlowDraft(flow);
  const publish = usePublishBotFlow(flow);
  const discard = useDiscardBotFlowDraft(flow);
  const issuesQuery = useBotFlowIssues(flow, graph);
  const issues: GraphIssue[] = issuesQuery.data ?? detail.issues;
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  const dirty = !same(graph, saved);
  const hasDraft = !!detail.draft;
  // The editor starts from the server's copy; when that changes under it (a discard, a restore), follow it.
  const lastSaved = useRef(saved);
  useEffect(() => {
    if (!same(lastSaved.current, saved)) {
      lastSaved.current = saved;
      setGraph(saved);
      setPast([]);
      setFuture([]);
    }
  }, [saved]);

  // Leaving with unsaved edits asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const textMap = useMemo(() => new Map(texts.map((t) => [t.key, t])), [texts]);
  const variables = useMemo(() => ["name", "list"], []);
  const inspectorCtx: InspectorContext = useMemo(() => ({ actions, texts: textMap, variables }), [actions, textMap, variables]);

  /** Applies a change and remembers the graph before it for undo. */
  const commit = useCallback((next: FlowGraph) => {
    setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), graph]);
    setFuture([]);
    setGraph(next);
  }, [graph]);

  function undo() {
    const previous = past[past.length - 1];
    if (!previous) return;
    setPast(past.slice(0, -1));
    setFuture([graph, ...future]);
    setGraph(previous);
  }
  function redo() {
    const [next, ...rest] = future;
    if (!next) return;
    setFuture(rest);
    setPast([...past, graph]);
    setGraph(next);
  }

  const issueCount = useMemo(() => {
    const by = new Map<string, { errors: number; warnings: number }>();
    for (const i of issues) {
      if (!i.node) continue;
      const c = by.get(i.node) ?? { errors: 0, warnings: 0 };
      if (i.severity === "error") c.errors++;
      else c.warnings++;
      by.set(i.node, c);
    }
    return by;
  }, [issues]);

  const summary = useCallback(
    (node: FlowNode): string => {
      const say = (key: string) => {
        const t = textMap.get(key);
        return t ? (t.override?.en ?? t.defaults.en) : key ? `⚠ ${key}` : "";
      };
      switch (node.type) {
        case "text":
          return say(node.text.key);
        case "buttons":
          return `${say(node.text.key)}\n[${node.buttons.map((b) => say(b.title)).join("] [")}]`;
        case "go":
          return `State: ${node.state}`;
        case "action":
          return node.action || "Choose an action";
        case "branch":
          return `${node.cases.length} case${node.cases.length === 1 ? "" : "s"}`;
      }
    },
    [textMap],
  );

  const rfNodes: FlowRFNode[] = useMemo(
    () =>
      Object.entries(graph.nodes).map(([id, node]) => {
        const c = issueCount.get(id);
        const data: FlowNodeData = {
          id,
          node,
          slots: slotsOf(node, actions),
          summary: summary(node),
          entries: Object.entries(graph.entries).filter(([, first]) => first === id).map(([name]) => name),
          errors: c?.errors ?? 0,
          warnings: c?.warnings ?? 0,
        };
        return { id, type: "flow", position: node.ui ?? { x: 0, y: 0 }, data, selected: id === selected };
      }),
    [graph, actions, summary, issueCount, selected],
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      Object.entries(graph.nodes).flatMap(([id, node]) =>
        slotsOf(node, actions)
          .filter((s) => s.target && graph.nodes[s.target])
          .map((s) => ({
            id: `${id}|${s.handle}`,
            source: id,
            sourceHandle: s.handle,
            target: s.target as string,
            label: s.handle === "next" && node.type !== "action" ? undefined : s.label,
            markerEnd: { type: "arrowclosed" as const },
          })),
      ),
    [graph, actions],
  );

  const onNodesChange = useCallback((changes: NodeChange<FlowRFNode>[]) => {
    // Dragging moves nodes live; it is one undo step, taken when the drag starts (onNodeDragStart).
    setGraph((g) => {
      let next = g;
      for (const c of changes) {
        if (c.type === "position" && c.position) next = moveNode(next, c.id, c.position.x, c.position.y);
      }
      return next;
    });
  }, []);

  function onConnect(c: Connection) {
    if (!c.source || !c.target || !c.sourceHandle) return;
    commit(setSlotTarget(graph, c.source, c.sourceHandle, c.target));
  }

  function onEdgesDelete(edges: Edge[]) {
    let next = graph;
    for (const e of edges) if (e.sourceHandle) next = setSlotTarget(next, e.source, e.sourceHandle, undefined);
    commit(next);
  }

  function removeNode(id: string) {
    commit(deleteNode(graph, id));
    setSelected(null);
  }

  function renameNode(from: string, to: string) {
    if (graph.nodes[to]) return toast.error(`There is already a node called "${to}"`);
    const nodes = Object.fromEntries(Object.entries(graph.nodes).map(([k, n]) => [k === from ? to : k, n]));
    let next: FlowGraph = { ...graph, nodes, entries: Object.fromEntries(Object.entries(graph.entries).map(([k, v]) => [k, v === from ? to : v])) };
    for (const [id, node] of Object.entries(next.nodes)) {
      for (const slot of slotsOf(node)) if (slot.target === from) next = setSlotTarget(next, id, slot.handle, to);
    }
    commit(next);
    setSelected(to);
  }

  async function onSave() {
    try {
      await save.mutateAsync({ graph });
      toast.success("Draft saved. Customers are not affected until you publish and switch.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function onPublish() {
    try {
      if (dirty || !hasDraft) await save.mutateAsync({ graph });
      await publish.mutateAsync(note.trim() || undefined);
      toast.success("Published. Open Versions to switch customers to it.");
      setPublishing(false);
      setNote("");
      setTab("versions");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function onDiscard() {
    try {
      await discard.mutateAsync(undefined);
      toast.success("Draft discarded");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const selectedNode = selected ? graph.nodes[selected] : undefined;
  const busy = save.isPending || publish.isPending || discard.isPending;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b bg-background px-3 py-2">
        <div className="mr-auto min-w-0">
          <h1 className="font-heading text-base font-bold">Flow: {flow}</h1>
          <p className="text-xs text-muted-foreground">
            {dirty ? "Unsaved changes" : hasDraft ? "Draft saved" : "No changes"}
            {detail.engine === "graph" ? ` · live: version ${detail.publishedVersion}` : " · customers get the built-in flow"}
          </p>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Edit">
          <Button variant="outline" size="icon" aria-label="Undo" disabled={!past.length} onClick={undo}>
            <Undo2 className="size-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Redo" disabled={!future.length} onClick={redo}>
            <Redo2 className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => commit(autoLayout(graph))}>
            <LayoutGrid className="size-4" /> Tidy
          </Button>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Add a node">
          {ADDABLE.map((type) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              onClick={() => {
                const { graph: next, id } = addNode(graph, type, { x: 40, y: 40 + Object.keys(graph.nodes).length * 12 });
                commit(next);
                setSelected(id);
                setTab("inspect");
              }}
            >
              + {NODE_LABEL[type].replace("Send ", "").replace("Go to ", "Go ")}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {hasDraft && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => void onDiscard()}>
              <Trash2 className="size-4" /> Discard draft
            </Button>
          )}
          <Button variant="outline" size="sm" disabled={!dirty || busy} onClick={() => void onSave()}>
            <Save className="size-4" /> Save draft
          </Button>
          <Button size="sm" disabled={busy || errors.length > 0 || (!dirty && !hasDraft)} onClick={() => setPublishing((p) => !p)} title={errors.length ? "Fix the errors first" : undefined}>
            <Send className="size-4" /> Publish
          </Button>
        </div>
      </header>

      {publishing && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/50 px-3 py-2 text-sm" role="region" aria-label="Publish">
          <label htmlFor="publish-note" className="font-medium">What changed?</label>
          <Input id="publish-note" className="max-w-md" value={note} placeholder="Optional note for the version list" onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" disabled={busy} onClick={() => void onPublish()}>
            {busy ? "Publishing…" : "Publish version"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPublishing(false)}>
            Cancel
          </Button>
          <span className="text-xs text-muted-foreground">Publishing does not change what customers get. Switch the flow on in Versions.</span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-[24rem] flex-1" aria-label="Flow canvas">
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={NODE_TYPES}
            colorMode="system"
            fitView
            fitViewOptions={{ padding: 0.2 }}
            deleteKeyCode={["Backspace", "Delete"]}
            onNodesChange={onNodesChange}
            onNodeDragStart={() => {
              setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), graph]);
              setFuture([]);
            }}
            onConnect={onConnect}
            onEdgesDelete={onEdgesDelete}
            onNodesDelete={(nodes) => nodes.forEach((n) => removeNode(n.id))}
            onNodeClick={(_, n) => {
              setSelected(n.id);
              setTab("inspect");
            }}
            onPaneClick={() => setSelected(null)}
          >
            <Background gap={20} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable className="!hidden md:!block" />
          </ReactFlow>
        </div>

        <aside className="flex max-h-[60vh] w-full flex-col border-t lg:max-h-none lg:w-96 lg:border-t-0 lg:border-l" aria-label="Details">
          <div role="tablist" aria-label="Panel" className="flex border-b text-sm">
            {(
              [
                ["inspect", "Node"],
                ["test", "Test"],
                ["problems", `Problems${errors.length + warnings.length ? ` (${errors.length + warnings.length})` : ""}`],
                ["versions", "Versions"],
              ] as Array<[Tab, string]>
            ).map(([key, text]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn("flex-1 px-2 py-2", tab === key ? "border-b-2 border-primary font-medium" : "text-muted-foreground hover:text-foreground", key === "problems" && errors.length > 0 && "text-destructive")}
              >
                {text}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {tab === "inspect" &&
              (selected && selectedNode ? (
                <NodeInspector
                  key={selected}
                  nodeId={selected}
                  node={selectedNode}
                  ctx={inspectorCtx}
                  entries={Object.entries(graph.entries).filter(([, first]) => first === selected).map(([name]) => name)}
                  entryNames={Object.keys(graph.entries)}
                  onChange={(next) => commit(updateNode(graph, selected, { ...next, ui: selectedNode.ui }))}
                  onDelete={() => removeNode(selected)}
                  onRename={(to) => renameNode(selected, to)}
                  onEntryChange={(entry, here) => {
                    if (!here) return; // an entry always starts somewhere; pick another node to move it
                    commit({ ...graph, entries: { ...graph.entries, [entry]: selected } });
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Click a node to edit it. Drag from a dot on the right of a node to another node to connect them. Select a line and press Delete to remove it.</p>
              ))}
            {tab === "test" && <FlowSimulator flow={flow} graph={graph} />}
            {tab === "problems" && (
              <ProblemList
                issues={issues}
                pending={issuesQuery.isFetching}
                onPick={(node) => {
                  if (node && graph.nodes[node]) {
                    setSelected(node);
                    setTab("inspect");
                  }
                }}
              />
            )}
            {tab === "versions" && <FlowVersions detail={detail} hasUnsaved={dirty || hasDraft} />}
          </div>
        </aside>
      </div>
    </div>
  );
}

function ProblemList({ issues, pending, onPick }: { issues: GraphIssue[]; pending: boolean; onPick: (node?: string) => void }) {
  if (!issues.length) return <p className="text-sm text-muted-foreground">{pending ? "Checking…" : "No problems found."}</p>;
  const ordered = [...issues].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1));
  return (
    <ul className="space-y-1.5">
      {ordered.map((i, n) => (
        <li key={n}>
          <button type="button" onClick={() => onPick(i.node)} className="flex w-full items-start gap-2 rounded-lg border p-2 text-left text-xs hover:bg-muted">
            <Badge variant={i.severity === "error" ? "destructive" : "secondary"}>{i.severity}</Badge>
            <span className="min-w-0">
              {i.node && <span className="mr-1 font-mono font-medium">{i.node}</span>}
              {i.message}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
