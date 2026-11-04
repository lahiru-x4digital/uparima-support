"use client";

import { useMemo, useState } from "react";
import { History, RotateCcw, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/shared/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/api";
import { groupOf, lengthOf, problemsFor, renderSample } from "@/lib/bot/text-rules";
import { useBotTextHistory, useBotTexts, useRevertBotText, useSaveBotText } from "@/lib/hooks/use-bot-texts";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useIsAdmin } from "@/lib/hooks/use-desk";
import { cn } from "@/lib/utils";
import { BOT_LANGUAGES, BOT_LANGUAGE_LABEL, type BotLanguage, type BotText, type BotTextValues } from "@/types/bot-text";

/** What the bot currently says for this key (the override, else the built-in text). */
const current = (t: BotText): BotTextValues => ({ en: t.override?.en ?? t.defaults.en, si: t.override?.si ?? t.defaults.si, ta: t.override?.ta ?? t.defaults.ta });

const SAMPLES: Record<string, string> = { name: "Nimal", list: "• Item one\n• Item two", n: "3", amount: "1,500", plate: "CAB-1234" };

export function BotTexts() {
  const isAdmin = useIsAdmin();
  const [search, setSearch] = useState("");
  const [prefix, setPrefix] = useState("");
  const [modifiedOnly, setModifiedOnly] = useState(false);
  const debounced = useDebouncedValue(search);
  const query = useBotTexts({ search: debounced, prefix, modified: modifiedOnly });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const all = useBotTexts({});
  const groups = useMemo(() => [...new Set((all.data ?? []).map((t) => groupOf(t.key)))].sort(), [all.data]);
  const selected = query.data?.find((t) => t.key === selectedKey) ?? all.data?.find((t) => t.key === selectedKey) ?? null;

  if (!isAdmin) {
    return (
      <PageShell title="Bot texts">
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Only admins can edit the bot&apos;s texts.</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Bot texts"
      description="Change what the WhatsApp bot says, in all three languages. A text you haven't changed keeps its built-in wording."
      width="max-w-6xl"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section aria-label="Messages" className="flex min-h-0 flex-col rounded-xl border bg-card">
          <div className="space-y-2 border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search key or text…" aria-label="Search bot texts" className="pl-8" />
            </div>
            <div className="flex items-center gap-2">
              <NativeSelect aria-label="Group" value={prefix} onChange={(e) => setPrefix(e.target.value)}>
                <option value="">All groups</option>
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </NativeSelect>
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" checked={modifiedOnly} onChange={(e) => setModifiedOnly(e.target.checked)} /> Changed
              </label>
            </div>
          </div>
          <div className="max-h-[70vh] min-h-48 overflow-y-auto">
            {query.isPending ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : query.isError ? (
              <div className="space-y-2 p-4 text-sm">
                <p className="text-destructive">{getErrorMessage(query.error)}</p>
                <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                  Try again
                </Button>
              </div>
            ) : query.data.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No messages match.</p>
            ) : (
              <ul>
                {query.data.map((t) => (
                  <li key={t.key}>
                    <button
                      type="button"
                      onClick={() => setSelectedKey(t.key)}
                      aria-current={t.key === selectedKey}
                      className={cn("block w-full border-b px-3 py-2 text-left outline-none hover:bg-muted focus-visible:bg-muted", t.key === selectedKey && "bg-muted")}
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate font-mono text-xs">{t.key}</span>
                        {t.override && <Badge variant="secondary">Changed</Badge>}
                      </span>
                      <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{current(t).en}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {selected ? (
          <Editor key={`${selected.key}:${selected.override?.version ?? 0}`} text={selected} />
        ) : (
          <div className="flex min-h-48 items-center justify-center rounded-xl border bg-card p-6 text-sm text-muted-foreground">Pick a message to edit it.</div>
        )}
      </div>
    </PageShell>
  );
}

function Editor({ text }: { text: BotText }) {
  const save = useSaveBotText();
  const revert = useRevertBotText();
  const [values, setValues] = useState<BotTextValues>(current(text));
  const [lang, setLang] = useState<BotLanguage>("en");
  const [showHistory, setShowHistory] = useState(false);
  const saved = current(text);
  const dirty = BOT_LANGUAGES.some((l) => values[l] !== saved[l]);
  const problems = useMemo(() => problemsFor(values, text.placeholders, text.maxLength), [values, text.placeholders, text.maxLength]);
  const hasProblems = Object.keys(problems).length > 0;
  const isDefault = BOT_LANGUAGES.every((l) => values[l] === text.defaults[l]);

  async function onSave() {
    try {
      await save.mutateAsync({ key: text.key, values });
      toast.success("Saved. The bot uses it within 30 seconds.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }
  async function onRevert() {
    try {
      await revert.mutateAsync(text.key);
      toast.success("Back to the built-in text");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <section aria-label={`Edit ${text.key}`} className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate font-mono text-sm font-semibold">{text.key}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {text.override ? `Changed · version ${text.override.version}` : "Built-in text"} · up to {text.maxLength} characters
          </p>
        </div>
        {text.placeholders.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" title="Keep these in every language. The bot fills them in.">
            Keep:
            {text.placeholders.map((p) => (
              <code key={p} className="rounded bg-muted px-1.5 py-0.5">{`{${p}}`}</code>
            ))}
          </div>
        )}
      </div>

      <div role="tablist" aria-label="Language" className="flex gap-1 rounded-lg border p-0.5 text-sm">
        {BOT_LANGUAGES.map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={lang === l}
            onClick={() => setLang(l)}
            className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1", lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {BOT_LANGUAGE_LABEL[l]}
            {(problems[l] || values[l] !== saved[l]) && <span aria-hidden className={cn("size-1.5 rounded-full", problems[l] ? "bg-destructive" : "bg-amber-500")} />}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="bot-text" className="text-sm font-medium">
            {BOT_LANGUAGE_LABEL[lang]}
          </label>
          <Textarea
            id="bot-text"
            rows={Math.min(14, Math.max(4, values[lang].split("\n").length + 2))}
            value={values[lang]}
            aria-invalid={!!problems[lang]}
            onChange={(e) => setValues((v) => ({ ...v, [lang]: e.target.value }))}
          />
          <div className="flex items-center justify-between text-xs">
            <span className={problems[lang] ? "text-destructive" : "text-muted-foreground"} role={problems[lang] ? "alert" : undefined}>
              {problems[lang] ?? "Use *bold* and line breaks like in WhatsApp."}
            </span>
            <span className={cn("tabular-nums", lengthOf(values[lang]) > text.maxLength ? "text-destructive" : "text-muted-foreground")}>
              {lengthOf(values[lang])}/{text.maxLength}
            </span>
          </div>
          {values[lang] !== text.defaults[lang] && (
            <button type="button" className="text-xs text-primary hover:underline" onClick={() => setValues((v) => ({ ...v, [lang]: text.defaults[lang] }))}>
              Use the built-in {BOT_LANGUAGE_LABEL[lang]} text
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium">Preview</p>
          <div className="rounded-xl bg-[#e7ddd3] p-3 dark:bg-muted">
            <div className="max-w-[85%] whitespace-pre-wrap rounded-lg rounded-tl-none bg-white p-2.5 text-sm text-black shadow-sm">
              <Formatted text={renderSample(values[lang], SAMPLES)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Example values are filled in for the placeholders.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <Button variant="ghost" size="sm" onClick={() => setShowHistory((s) => !s)} aria-expanded={showHistory}>
          <History className="size-4" /> History
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={!text.override || revert.isPending} onClick={() => void onRevert()}>
            <RotateCcw className="size-4" /> Back to built-in
          </Button>
          <Button variant="outline" disabled={!dirty || save.isPending} onClick={() => setValues(saved)}>
            Discard
          </Button>
          <Button disabled={!dirty || hasProblems || save.isPending || (isDefault && !text.override)} onClick={() => void onSave()}>
            <Save className="size-4" /> {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
      {showHistory && <HistoryList keyName={text.key} />}
    </section>
  );
}

/** Renders WhatsApp's *bold* so the preview matches what people see. */
function Formatted({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*)/g);
  return (
    <>
      {parts.map((p, i) => (p.length > 2 && p.startsWith("*") && p.endsWith("*") ? <strong key={i}>{p.slice(1, -1)}</strong> : <span key={i}>{p}</span>))}
    </>
  );
}

function HistoryList({ keyName }: { keyName: string }) {
  const history = useBotTextHistory(keyName);
  if (history.isPending) return <Skeleton className="h-16 w-full" />;
  if (history.isError) return <p className="text-sm text-destructive">{getErrorMessage(history.error)}</p>;
  if (history.data.length === 0) return <p className="text-sm text-muted-foreground">No changes yet.</p>;
  return (
    <ul className="space-y-1 text-xs">
      {history.data.map((h) => (
        <li key={h.id} className="rounded-lg border p-2">
          <span className="font-medium">{h.action === "revert" ? "Back to built-in" : `Version ${h.version}`}</span>
          <span className="text-muted-foreground"> · {new Date(h.changedAt).toLocaleString()} · user #{h.changedBy ?? "?"}</span>
          {h.en && <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-muted-foreground">{h.en}</p>}
        </li>
      ))}
    </ul>
  );
}
