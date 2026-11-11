"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { NODE_LABEL } from "@/lib/bot/graph-model";
import type { ActionInfo, ButtonDef, Condition, FlowNode, ParamValue, TextRef } from "@/types/bot-flow";
import type { BotText } from "@/types/bot-text";

export interface InspectorContext {
  actions: ActionInfo[];
  /** Built-in message catalogue by key, for pickers and previews. */
  texts: Map<string, BotText>;
  /** Variables a text parameter can use (`name`, plus what actions set). */
  variables: string[];
}

const textOf = (ctx: InspectorContext, key: string) => {
  const t = ctx.texts.get(key);
  return t ? (t.override?.en ?? t.defaults.en) : undefined;
};

const label = "text-xs font-medium text-muted-foreground";

/** A message-key box with suggestions and a preview of what it says. */
function KeyField({ id, value, onChange, ctx, prefix }: { id: string; value: string; onChange: (key: string) => void; ctx: InspectorContext; prefix?: string }) {
  const list = `${id}-keys`;
  const preview = textOf(ctx, value);
  return (
    <div className="space-y-1">
      <Input id={id} list={list} value={value} placeholder="Message key, e.g. home.customer" aria-invalid={!!value && !preview} onChange={(e) => onChange(e.target.value.trim())} />
      <datalist id={list}>
        {[...ctx.texts.keys()]
          .filter((k) => !prefix || k.startsWith(prefix))
          .map((k) => (
            <option key={k} value={k} />
          ))}
      </datalist>
      <p className={cn("line-clamp-3 text-xs whitespace-pre-wrap", preview ? "text-muted-foreground" : "text-destructive")}>
        {value ? (preview ?? "No such message") : "Pick a message"}
      </p>
    </div>
  );
}

/** `$name` means "the variable called name"; anything else is typed text. */
const toInput = (v: ParamValue | undefined) => (v === undefined ? "" : typeof v === "object" ? `$${v.var}` : String(v));
const fromInput = (s: string): ParamValue | undefined => (s === "" ? undefined : s.startsWith("$") ? { var: s.slice(1) } : s);

function TextRefField({ idBase, value, onChange, ctx, prefix }: { idBase: string; value: TextRef; onChange: (t: TextRef) => void; ctx: InspectorContext; prefix?: string }) {
  const placeholders = ctx.texts.get(value.key)?.placeholders ?? Object.keys(value.params ?? {});
  return (
    <div className="space-y-2">
      <KeyField id={`${idBase}-key`} value={value.key} ctx={ctx} prefix={prefix} onChange={(key) => onChange({ ...value, key })} />
      {placeholders.map((p) => (
        <div key={p} className="grid grid-cols-[5rem_1fr] items-center gap-2">
          <label htmlFor={`${idBase}-p-${p}`} className="font-mono text-xs">{`{${p}}`}</label>
          <Input
            id={`${idBase}-p-${p}`}
            value={toInput(value.params?.[p])}
            placeholder={ctx.variables.length ? `$${ctx.variables[0]} or text` : "text"}
            list={`${idBase}-vars`}
            onChange={(e) => {
              const params = { ...(value.params ?? {}) };
              const next = fromInput(e.target.value);
              if (next === undefined) delete params[p];
              else params[p] = next;
              onChange({ ...value, params });
            }}
          />
        </div>
      ))}
      <datalist id={`${idBase}-vars`}>
        {ctx.variables.map((v) => (
          <option key={v} value={`$${v}`} />
        ))}
      </datalist>
      {placeholders.length > 0 && <p className="text-xs text-muted-foreground">Write $name to use the variable called name.</p>}
    </div>
  );
}

const SIMPLE_OPS = ["driver", "driverStatus", "incompleteDriver", "hasPrefs", "lang", "result"] as const;
const OP_LABEL: Record<string, string> = {
  driver: "Is a driver",
  driverStatus: "Driver status is",
  incompleteDriver: "Driver signup unfinished",
  hasPrefs: "Has seen the menu before",
  lang: "Language is",
  result: "Last action returned",
};

function ConditionField({ idBase, value, onChange }: { idBase: string; value: Condition; onChange: (c: Condition) => void }) {
  const negated = value.op === "not";
  const inner = value.op === "not" ? value.cond : value;
  const simple = (SIMPLE_OPS as readonly string[]).includes(inner.op);
  const wrap = (c: Condition): Condition => (negated ? { op: "not", cond: c } : c);
  if (!simple || (negated && value.op === "not" && !(SIMPLE_OPS as readonly string[]).includes(value.cond.op))) {
    return <JsonField idBase={idBase} value={value} onChange={(v) => onChange(v as Condition)} />;
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <NativeSelect
          aria-label="Condition"
          value={inner.op}
          onChange={(e) => {
            const op = e.target.value as (typeof SIMPLE_OPS)[number];
            const next: Condition =
              op === "driverStatus" ? { op, is: "pending" } : op === "lang" ? { op, is: "en" } : op === "result" ? { op, is: "" } : ({ op } as Condition);
            onChange(wrap(next));
          }}
        >
          {SIMPLE_OPS.map((op) => (
            <option key={op} value={op}>
              {OP_LABEL[op]}
            </option>
          ))}
        </NativeSelect>
        <label className="flex shrink-0 items-center gap-1 text-xs">
          <input type="checkbox" checked={negated} onChange={(e) => onChange(e.target.checked ? { op: "not", cond: inner } : inner)} /> not
        </label>
      </div>
      {inner.op === "lang" ? (
        <NativeSelect aria-label="Language" value={inner.is} onChange={(e) => onChange(wrap({ op: "lang", is: e.target.value as "en" | "si" | "ta" }))}>
          <option value="en">English</option>
          <option value="si">සිංහල</option>
          <option value="ta">தமிழ்</option>
        </NativeSelect>
      ) : inner.op === "driverStatus" || inner.op === "result" ? (
        <Input aria-label="Value" value={inner.is} placeholder={inner.op === "driverStatus" ? "pending, approved…" : "result tag"} onChange={(e) => onChange(wrap({ ...inner, is: e.target.value.trim() }))} />
      ) : null}
    </div>
  );
}

/** For the rare structure the forms don't cover (combined conditions, state data). */
function JsonField({ idBase, value, onChange }: { idBase: string; value: unknown; onChange: (v: unknown) => void }) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [bad, setBad] = useState(false);
  return (
    <div className="space-y-1">
      <Textarea
        id={`${idBase}-json`}
        rows={5}
        className="font-mono text-xs"
        value={text}
        aria-invalid={bad}
        onChange={(e) => {
          setText(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
            setBad(false);
          } catch {
            setBad(true);
          }
        }}
      />
      {bad && <p className="text-xs text-destructive">Not valid JSON yet; the last valid version is kept.</p>}
    </div>
  );
}

function ButtonsField({ idBase, value, onChange, ctx }: { idBase: string; value: ButtonDef[]; onChange: (b: ButtonDef[]) => void; ctx: InspectorContext }) {
  return (
    <div className="space-y-2">
      {value.map((b, i) => (
        <div key={i} className="space-y-1 rounded-lg border p-2">
          <div className="flex items-center gap-2">
            <Input aria-label={`Button ${i + 1} id`} value={b.id} placeholder="Tap id, e.g. home:hub" onChange={(e) => onChange(value.map((x, n) => (n === i ? { ...x, id: e.target.value.trim() } : x)))} />
            <Button variant="ghost" size="icon" aria-label={`Remove button ${i + 1}`} onClick={() => onChange(value.filter((_, n) => n !== i))}>
              <Trash2 className="size-4" />
            </Button>
          </div>
          <KeyField id={`${idBase}-b${i}`} value={b.title} ctx={ctx} prefix="btn." onChange={(title) => onChange(value.map((x, n) => (n === i ? { ...x, title } : x)))} />
        </div>
      ))}
      <Button variant="outline" size="sm" disabled={value.length >= 3} onClick={() => onChange([...value, { id: "", title: "" }])}>
        <Plus className="size-4" /> Add button {value.length >= 3 && "(3 at most)"}
      </Button>
    </div>
  );
}

/** The form for the selected node. Changes go straight to the graph. */
export function NodeInspector({ nodeId, node, ctx, entries, entryNames, onChange, onDelete, onRename, onEntryChange }: {
  nodeId: string;
  node: FlowNode;
  ctx: InspectorContext;
  /** The entries that start at this node. */
  entries: string[];
  /** Every entry the flow has (the bot calls them by name). */
  entryNames: string[];
  onChange: (next: FlowNode) => void;
  onDelete: () => void;
  onRename: (id: string) => void;
  onEntryChange: (entry: string, here: boolean) => void;
}) {
  const [rename, setRename] = useState(nodeId);
  const base = `n-${nodeId}`;
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{NODE_LABEL[node.type]}</h3>
          {entries.length > 0 && <p className="text-xs text-primary">Starts: {entries.join(", ")}</p>}
        </div>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="size-4" /> Delete
        </Button>
      </div>

      <div className="space-y-1">
        <label htmlFor={`${base}-id`} className={label}>Node name</label>
        <Input
          id={`${base}-id`}
          value={rename}
          onChange={(e) => setRename(e.target.value.replace(/[^\w-]/g, ""))}
          onBlur={() => (rename && rename !== nodeId ? onRename(rename) : setRename(nodeId))}
        />
      </div>

      {node.type === "go" && (
        <div className="space-y-1">
          <label htmlFor={`${base}-state`} className={label}>Move the conversation to state</label>
          <Input id={`${base}-state`} value={node.state} onChange={(e) => onChange({ ...node, state: e.target.value.trim() })} />
          <p className="text-xs text-muted-foreground">The state decides which flow handles the customer&apos;s next message. &quot;idle&quot; is the main menu.</p>
        </div>
      )}

      {node.type === "text" && (
        <div className="space-y-1">
          <span className={label}>Message</span>
          <TextRefField idBase={base} value={node.text} ctx={ctx} onChange={(text) => onChange({ ...node, text })} />
        </div>
      )}

      {node.type === "buttons" && (
        <>
          <div className="space-y-1">
            <span className={label}>Message</span>
            <TextRefField idBase={base} value={node.text} ctx={ctx} onChange={(text) => onChange({ ...node, text })} />
          </div>
          <div className="space-y-1">
            <span className={label}>Buttons (up to 3)</span>
            <ButtonsField idBase={base} value={node.buttons} ctx={ctx} onChange={(buttons) => onChange({ ...node, buttons })} />
          </div>
        </>
      )}

      {node.type === "branch" && (
        <div className="space-y-2">
          <span className={label}>Cases, checked in order</span>
          {node.cases.map((c, i) => (
            <div key={i} className="space-y-1 rounded-lg border p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Case {i + 1}</span>
                <Button variant="ghost" size="icon" aria-label={`Remove case ${i + 1}`} onClick={() => onChange({ ...node, cases: node.cases.filter((_, n) => n !== i) })}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <ConditionField idBase={`${base}-c${i}`} value={c.when} onChange={(when) => onChange({ ...node, cases: node.cases.map((x, n) => (n === i ? { ...x, when } : x)) })} />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => onChange({ ...node, cases: [...node.cases, { when: { op: "driver" }, next: "" }] })}>
            <Plus className="size-4" /> Add case
          </Button>
          <p className="text-xs text-muted-foreground">Connect each case, and &quot;otherwise&quot;, on the canvas.</p>
        </div>
      )}

      {node.type === "action" && (
        <div className="space-y-1">
          <label htmlFor={`${base}-action`} className={label}>Action</label>
          <NativeSelect id={`${base}-action`} value={node.action} onChange={(e) => onChange({ ...node, action: e.target.value, results: {} })}>
            <option value="">Choose…</option>
            {ctx.actions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id}
              </option>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground">{ctx.actions.find((a) => a.id === node.action)?.title ?? "What this does is built into the bot; you choose what happens after."}</p>
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor={`${base}-note`} className={label}>Note (only you see this)</label>
        <Input id={`${base}-note`} value={node.note ?? ""} onChange={(e) => onChange({ ...node, note: e.target.value || undefined })} />
      </div>

      <fieldset className="space-y-1">
        <legend className={label}>Where the bot starts</legend>
        <p className="text-xs text-muted-foreground">The bot calls these named entries. Tick one to start it at this node instead.</p>
        {entryNames.map((e) => (
          <label key={e} className="mr-3 inline-flex items-center gap-1 text-xs">
            <input type="checkbox" checked={entries.includes(e)} onChange={(ev) => onEntryChange(e, ev.target.checked)} /> {e}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
