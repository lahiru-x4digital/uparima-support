"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Matches the backend's cap (whatsapp-voice.util.ts): longer recordings are cut there anyway. */
export const VOICE_MAX_SECONDS = 5 * 60;

// Whatever the browser records is converted to OGG/Opus on the server; Opus first keeps it small.
const PREFERRED_TYPES = ["audio/ogg;codecs=opus", "audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

export type VoiceRecorderState =
  | { status: "idle" }
  | { status: "recording"; seconds: number }
  | { status: "recorded"; blob: Blob; url: string; seconds: number };

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return PREFERRED_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
}

/** Records one voice note from the microphone: start → stop (or auto-stop at the limit) → a Blob to
 * preview and send. `discard` throws the take away. The microphone is released as soon as recording stops. */
export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>({ status: "idle" });
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(0);
  const cancelled = useRef(false);
  const urlRef = useRef<string | null>(null);

  const supported = typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

  const releaseMic = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  const revokeUrl = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }, []);

  const stop = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    revokeUrl();
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access was blocked. Allow it in the browser to record a voice note.");
      return;
    }
    const mimeType = pickMimeType();
    const rec = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    cancelled.current = false;
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = () => {
      releaseMic();
      const seconds = Math.round((Date.now() - startedAt.current) / 1000);
      if (cancelled.current || chunks.length === 0) {
        setState({ status: "idle" });
        return;
      }
      const blob = new Blob(chunks, { type: rec.mimeType || mimeType || "audio/webm" });
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setState({ status: "recorded", blob, url, seconds });
    };
    recorder.current = rec;
    startedAt.current = Date.now();
    rec.start(250);
    setState({ status: "recording", seconds: 0 });
    timer.current = setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt.current) / 1000);
      if (seconds >= VOICE_MAX_SECONDS) stop();
      else setState((s) => (s.status === "recording" ? { status: "recording", seconds } : s));
    }, 250);
  }, [releaseMic, revokeUrl, stop]);

  /** Drops the current take — mid-recording or after. */
  const discard = useCallback(() => {
    if (recorder.current?.state === "recording") {
      cancelled.current = true;
      recorder.current.stop();
    }
    revokeUrl();
    setState({ status: "idle" });
  }, [revokeUrl]);

  // Leaving the conversation mid-recording must not leave the microphone on.
  useEffect(
    () => () => {
      cancelled.current = true;
      if (recorder.current?.state === "recording") recorder.current.stop();
      releaseMic();
      revokeUrl();
    },
    [releaseMic, revokeUrl],
  );

  return { state, error, supported, start, stop, discard };
}

/** 75 → "1:15" */
export function formatSeconds(total: number) {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
