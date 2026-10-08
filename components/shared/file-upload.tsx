"use client";

import { useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Drag-and-drop / browse uploader for one file. `uploader` stores the file and returns its key,
 * which `onChange` receives (and which the parent keeps).
 */
export function FileUpload({
  uploader,
  onChange,
  accept = "image/jpeg,image/png,application/pdf",
}: {
  uploader: (file: File) => Promise<string>;
  onChange: (key: string) => void;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      onChange(await uploader(file));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setUploading(false);
      // so choosing the same file again fires onChange again
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void pick(e.dataTransfer.files);
        }}
        disabled={uploading}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-60",
          dragOver && "border-primary bg-accent",
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Uploading…
          </>
        ) : (
          <>
            <UploadCloud className="size-4" /> Drag &amp; drop a file or{" "}
            <span className="font-medium text-primary underline">browse</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        aria-label="Choose a file"
        onChange={(e) => void pick(e.target.files)}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
