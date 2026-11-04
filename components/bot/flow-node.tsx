"use client";

import { useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals, type Node, type NodeProps } from "@xyflow/react";
import { ArrowRightLeft, GitBranch, MessageSquare, MousePointerClick, Play } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NODE_LABEL, type Slot } from "@/lib/bot/graph-model";
import { cn } from "@/lib/utils";
import type { FlowNode, FlowNodeType } from "@/types/bot-flow";

export interface FlowNodeData extends Record<string, unknown> {
  id: string;
  node: FlowNode;
  slots: Slot[];
  /** What the node sends or does, in a line. */
  summary: string;
  /** The entries that start here (`show`, `info`). */
  entries: string[];
  errors: number;
  warnings: number;
}

export type FlowRFNode = Node<FlowNodeData, "flow">;

const ICON: Record<FlowNodeType, LucideIcon> = {
  go: ArrowRightLeft,
  text: MessageSquare,
  buttons: MousePointerClick,
  branch: GitBranch,
  action: Play,
};

const TINT: Record<FlowNodeType, string> = {
  go: "bg-slate-500",
  text: "bg-emerald-600",
  buttons: "bg-teal-600",
  branch: "bg-amber-600",
  action: "bg-violet-600",
};

/** One box on the canvas: a header with what it is, a line saying what it does, and a connection point per way out. */
export function FlowNodeView({ data, selected }: NodeProps<FlowRFNode>) {
  const update = useUpdateNodeInternals();
  const Icon = ICON[data.node.type];
  const slotKey = data.slots.map((s) => s.handle).join("|");
  // The connection points move when slots are added or removed; tell the canvas.
  useEffect(() => update(data.id), [slotKey, data.id, update]);

  return (
    <div
      className={cn(
        "w-60 rounded-lg border bg-card text-card-foreground shadow-sm",
        selected && "ring-2 ring-primary",
        data.errors > 0 && "border-destructive",
        data.errors === 0 && data.warnings > 0 && "border-amber-500",
      )}
    >
      <Handle type="target" position={Position.Left} className="!size-2.5" />
      <div className={cn("flex items-center gap-1.5 rounded-t-lg px-2 py-1 text-xs font-medium text-white", TINT[data.node.type])}>
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{NODE_LABEL[data.node.type]}</span>
        <span className="ml-auto truncate font-mono text-[10px] opacity-80">{data.id}</span>
      </div>
      <div className="space-y-1 px-2 py-1.5">
        {data.entries.length > 0 && (
          <p className="text-[10px] font-semibold text-primary uppercase">Starts: {data.entries.join(", ")}</p>
        )}
        <p className="line-clamp-3 text-xs break-words whitespace-pre-wrap text-muted-foreground">{data.summary || "Empty"}</p>
        {(data.errors > 0 || data.warnings > 0) && (
          <p className={cn("text-[10px] font-medium", data.errors > 0 ? "text-destructive" : "text-amber-600")}>
            {data.errors > 0 ? `${data.errors} error${data.errors > 1 ? "s" : ""}` : `${data.warnings} warning${data.warnings > 1 ? "s" : ""}`}
          </p>
        )}
      </div>
      <ul className="border-t">
        {data.slots.map((slot) => (
          <li key={slot.handle} className="relative flex h-6 items-center justify-end pr-3 pl-2 text-[11px]">
            <span className={cn("truncate", slot.target ? "text-foreground" : "text-muted-foreground italic")}>
              {slot.label}
              {!slot.target && " · not connected"}
            </span>
            <Handle id={slot.handle} type="source" position={Position.Right} className="!size-2.5" />
          </li>
        ))}
      </ul>
    </div>
  );
}
