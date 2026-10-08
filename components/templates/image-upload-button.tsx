"use client";

import { useRef } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadTemplateImage } from "@/lib/hooks/use-email-templates";
import type { UploadedTemplateImage } from "@/types/message-template";

/** Picks an image and uploads it to the riders bucket; reports the stored key and public URL. */
export function ImageUploadButton({ onUploaded, label = "Upload image", disabled }: {
  onUploaded: (img: UploadedTemplateImage) => void;
  label?: string;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadTemplateImage();

  return (
    <>
      <Button type="button" variant="outline" size="sm" disabled={disabled || upload.isPending} onClick={() => input.current?.click()}>
        {upload.isPending ? <Loader2 className="animate-spin" /> : <ImagePlus />} {upload.isPending ? "Uploading…" : label}
      </Button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload.mutate(file, { onSuccess: onUploaded });
        }} />
    </>
  );
}
