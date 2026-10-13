"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/modal";
import { useHotkeys } from "@/lib/hooks/use-hotkeys";

export type DocumentPreview = { label: string; url: string };

/**
 * Full-size document photo viewer, shared by the driver page and the driver form. Drivers often
 * photograph cards sideways, so the image can be rotated in 90° steps — view-only, the stored
 * file is untouched.
 */
export function DocumentPreviewModal({
  preview,
  onClose,
  position,
  onNavigate,
}: {
  preview: DocumentPreview | null;
  onClose: () => void;
  /** Where this document sits among the driver's others; enables previous/next and the ←/→ keys. */
  position?: { index: number; total: number };
  onNavigate?: (delta: -1 | 1) => void;
}) {
  const canNavigate = !!preview && !!position && !!onNavigate;
  useHotkeys(
    { arrowleft: () => onNavigate?.(-1), arrowright: () => onNavigate?.(1) },
    { enabled: canNavigate },
  );

  return (
    <Modal open={!!preview} onClose={onClose} title={preview?.label} className="sm:max-w-2xl">
      {/* Keyed on the URL so rotation resets when another document is opened. */}
      {preview && (
        <RotatableImage
          key={preview.url}
          url={preview.url}
          alt={preview.label}
          nav={
            canNavigate && (
              <div className="mr-auto flex items-center gap-1">
                <Button size="sm" variant="outline" aria-label="Previous document" onClick={() => onNavigate(-1)}>
                  <ChevronLeft />
                </Button>
                <span className="px-1 text-xs text-muted-foreground tabular-nums">
                  {position.index + 1} / {position.total}
                </span>
                <Button size="sm" variant="outline" aria-label="Next document" onClick={() => onNavigate(1)}>
                  <ChevronRight />
                </Button>
              </div>
            )
          }
        />
      )}
    </Modal>
  );
}

function RotatableImage({ url, alt, nav }: { url: string; alt: string; nav?: ReactNode }) {
  const [rotation, setRotation] = useState(0);
  const sideways = rotation % 180 !== 0;

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        {nav}
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
