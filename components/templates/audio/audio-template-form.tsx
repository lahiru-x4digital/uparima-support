"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Mic, Save, Square, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { OptionSelect } from "@/components/inbox/option-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/api";
import { useAudioTemplate, useDeleteAudioTemplate, useSaveAudioTemplate } from "@/lib/hooks/use-audio-templates";
import { useCan } from "@/lib/hooks/use-desk";
import { formatSeconds, useVoiceRecorder, VOICE_MAX_SECONDS } from "@/lib/hooks/use-voice-recorder";
import { cn } from "@/lib/utils";
import type { AudioTemplate, TemplateProduct } from "@/types/message-template";
import { PRODUCT_OPTIONS } from "../meta-products";

/** Matches the backend's upload cap; the saved OGG is much smaller. */
const MAX_BYTES = 16 * 1024 * 1024;
const ACCEPT = "audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/webm,audio/wav,audio/x-wav,.mp3,.m4a,.ogg,.opus,.webm,.wav,.aac";

type Source = "record" | "upload";

/** New / edit audio template. Pass `templateId` to edit. */
export function AudioTemplateFormPage({ templateId }: { templateId?: number }) {
  const id = templateId ?? null;
  const { data, isLoading, error } = useAudioTemplate(id);
  if (id !== null && isLoading) {
    return <div className="flex flex-1 items-center justify-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>;
  }
  if (id !== null && !data) return <p className="p-6 text-sm text-destructive">{error ? getErrorMessage(error) : "Template not found."}</p>;
  return <Form key={data?.id ?? "new"} id={id} template={data ?? null} />;
}

function Form({ id, template }: { id: number | null; template: AudioTemplate | null }) {
  const router = useRouter();
  const save = useSaveAudioTemplate(id);
  const remove = useDeleteAudioTemplate();
  const canWrite = useCan(id === null ? "audio-template.create" : "audio-template.update");
  const canDelete = useCan("audio-template.delete");

  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [product, setProduct] = useState<TemplateProduct | "">(template?.product ?? "");
  const [source, setSource] = useState<Source>("record");
  const voice = useVoiceRecorder();
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  const recorded = voice.state.status === "recorded" ? voice.state : null;
  const audio: Blob | null = source === "record" ? recorded?.blob ?? null : file;

  function chooseFile(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("audio/") && !/\.(mp3|m4a|ogg|opus|webm|wav|aac)$/i.test(f.name)) {
      toast.error("Choose an audio file (MP3, M4A, OGG, WebM or WAV)");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("Audio files must be 16 MB or smaller");
      return;
    }
    setFile(f);
    setFileUrl(URL.createObjectURL(f));
  }

  function clearFile() {
    setFile(null);
    setFileUrl(null);
    if (picker.current) picker.current.value = "";
  }

  function submit() {
    if (!name.trim()) return void toast.error("Give the template a name");
    if (id === null && !audio) return void toast.error(source === "record" ? "Record the message first" : "Choose an audio file");
    save.mutate(
      { name: name.trim(), description: description.trim(), product: product || null, audio: audio ?? undefined },
      { onSuccess: (saved) => (id === null ? router.replace(`/templates/audio/${saved.id}`) : router.push("/templates/audio")) },
    );
  }

  const busy = save.isPending || voice.state.status === "recording";
  const field = "mb-1 text-xs font-semibold";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/40">
      <header className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-3">
        <Button variant="outline" size="sm" render={<Link href="/templates/audio" />} nativeButton={false}><ArrowLeft /> Audio templates</Button>
        <h1 className="text-base font-semibold">{id === null ? "New audio template" : template?.name}</h1>
        <div className="ml-auto flex gap-2">
          {id !== null && canDelete && (
            <Button variant="ghost" size="sm" disabled={remove.isPending}
              onClick={() => window.confirm(`Delete audio template "${template?.name}"?`) &&
                remove.mutate(id, { onSuccess: () => router.replace("/templates/audio") })}>
              <Trash2 className="text-destructive" /> Delete
            </Button>
          )}
          {canWrite && (
            <Button size="sm" onClick={submit} disabled={busy}>
              {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save
            </Button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <fieldset disabled={!canWrite || save.isPending} className="mx-auto max-w-3xl space-y-4">
          <section className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:grid-cols-[1fr_200px]">
            <div>
              <Label className={field} htmlFor="audio-name">Name</Label>
              <Input id="audio-name" value={name} maxLength={150} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome greeting (Sinhala)" />
            </div>
            <div>
              <Label className={field}>Product</Label>
              <OptionSelect label="Product" value={product} options={PRODUCT_OPTIONS} onChange={setProduct} className="w-full" />
            </div>
            <div className="sm:col-span-2">
              <Label className={field} htmlFor="audio-description">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea id="audio-description" value={description} maxLength={500} rows={2} onChange={(e) => setDescription(e.target.value)}
                placeholder="What the message says, so agents can find the right one" />
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{template ? "Replace the audio" : "Audio"}{template && <span className="font-normal text-muted-foreground"> (optional)</span>}</h2>
              <div className="flex rounded-lg border p-0.5 text-xs" role="radiogroup" aria-label="Audio source">
                {([["record", "Record", Mic], ["upload", "Upload file", Upload]] as const).map(([value, label, Icon]) => (
                  <button key={value} type="button" role="radio" aria-checked={source === value} disabled={voice.state.status === "recording"}
                    onClick={() => setSource(value)}
                    className={cn("flex items-center gap-1 rounded-md px-2.5 py-1", source === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                    <Icon className="size-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {template && !audio && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                <span className="text-xs text-muted-foreground">Current</span>
                <audio controls preload="none" src={template.url} className="h-9 min-w-0 flex-1" />
                <span className="text-xs tabular-nums text-muted-foreground">{formatSeconds(template.durationSeconds)}</span>
              </div>
            )}

            {source === "record" ? (
              <>
                {voice.error && <p className="text-xs text-destructive">{voice.error}</p>}
                {!voice.supported ? (
                  <p className="text-sm text-muted-foreground">This browser can&apos;t record audio — upload a file instead.</p>
                ) : voice.state.status === "recording" ? (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                    <span className="size-2.5 animate-pulse rounded-full bg-destructive" aria-hidden />
                    <span className="flex-1 text-sm tabular-nums">
                      Recording {formatSeconds(voice.state.seconds)}
                      <span className="text-muted-foreground"> / {formatSeconds(VOICE_MAX_SECONDS)}</span>
                    </span>
                    <Button variant="ghost" size="icon" aria-label="Discard recording" onClick={voice.discard}><Trash2 /></Button>
                    <Button size="icon" aria-label="Stop recording" onClick={voice.stop}><Square className="fill-current" /></Button>
                  </div>
                ) : recorded ? (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-2 py-1.5">
                    <Button variant="ghost" size="icon" aria-label="Discard recording" onClick={voice.discard}><Trash2 /></Button>
                    <audio controls src={recorded.url} className="h-9 min-w-0 flex-1" />
                    <span className="text-xs tabular-nums text-muted-foreground">{formatSeconds(recorded.seconds)}</span>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => void voice.start()}><Mic /> Start recording</Button>
                )}
              </>
            ) : (
              <>
                <input ref={picker} type="file" accept={ACCEPT} hidden onChange={(e) => chooseFile(e.target.files?.[0])} />
                {file && fileUrl ? (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-2 py-1.5">
                    <Button variant="ghost" size="icon" aria-label="Remove file" onClick={clearFile}><Trash2 /></Button>
                    <audio controls src={fileUrl} className="h-9 min-w-0 flex-1" />
                    <span className="max-w-40 truncate text-xs text-muted-foreground" title={file.name}>{file.name}</span>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => picker.current?.click()}><Upload /> Choose audio file</Button>
                )}
                <p className="text-xs text-muted-foreground">MP3, M4A, OGG, WebM or WAV, up to 16 MB.</p>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              Keep it under about 4 minutes — longer audio can&apos;t play inline as a WhatsApp voice note. Saved as OGG/Opus.
            </p>
          </section>
        </fieldset>
      </div>
    </div>
  );
}
