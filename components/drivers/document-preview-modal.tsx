"use client";

import { useState } from "react";
import { RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";

export type DocumentPreview = { label: string; url: string };

/**
 * Full-size document photo viewer, shared by the driver page and the driver form. Drivers often
 * photograph cards sideways, so the image can be rotated in 90° steps — view-only, the stored
 * file is untouched.
 */
export function DocumentPreviewModal({
  preview,
  onClose,
}: {
  preview: DocumentPreview | null;
  onClose: () => void;
}) {
  return (
    <Modal open={!!preview} onClose={onClose} title={preview?.label} className="sm:max-w-2xl">
      {/* Keyed on the URL so rotation resets when another document is opened. */}
      {preview && <RotatableImage key={preview.url} url={preview.url} alt={preview.label} />}
    </Modal>
  );
}

function RotatableImage({ url, alt }: { url: string; alt: string }) {
  const [rotation, setRotation] = useState(0);
  const sideways = rotation % 180 !== 0;

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setRotation((r) => r - 90)}>
          <RotateCcw /> Rotate left
        </Button>
        <Button size="sm" variant="outline" onClick={() => setRotation((r) => r + 90)}>
          <RotateCw /> Rotate right
        </Button>
      </div>
      {/* Size container: when sideways the image box takes the container's swapped dimensions
          (cqh × cqw), so after rotating it fits exactly instead of overflowing the dialog. */}
      <div className="flex h-[60vh] items-center justify-center overflow-hidden" style={{ containerType: "size" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className="shrink-0 object-contain transition-transform duration-200"
          style={{
            transform: `rotate(${rotation}deg)`,
            width: sideways ? "100cqh" : "100cqw",
            height: sideways ? "100cqw" : "100cqh",
          }}
        />
      </div>
    </div>
  );
}
