"use client";

// Synthesised two-tone siren (Web Audio) for the SOS alarm — no audio asset
// to ship or license. Browsers keep an AudioContext suspended until a user
// gesture, so `unlock()` must be called from one (SosProvider wires it to the
// first pointerdown/keydown on the page and to the topbar "Enable sound").

const HIGH_HZ = 960;
const LOW_HZ = 700;
const HALF_CYCLE_S = 0.45;

let ctx: AudioContext | null = null;
let osc: OscillatorNode | null = null;
let gain: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function isAlarmUnlocked(): boolean {
  return ctx?.state === "running";
}

export async function unlockAlarm(): Promise<boolean> {
  const c = getCtx();
  if (!c) return false;
  if (c.state !== "running") {
    try {
      await c.resume();
    } catch {
      return false;
    }
  }
  return c.state === "running";
}

export function isAlarmPlaying(): boolean {
  return osc !== null;
}

export function startAlarm(): void {
  const c = getCtx();
  if (!c || osc) return;

  gain = c.createGain();
  gain.gain.value = 0.18;
  gain.connect(c.destination);

  osc = c.createOscillator();
  osc.type = "square";
  osc.frequency.value = HIGH_HZ;
  osc.connect(gain);
  osc.start();

  // Schedule tone flips slightly ahead on the audio clock so the siren
  // stays steady even when the tab is throttled in the background.
  let high = true;
  const schedule = () => {
    if (!osc || !ctx) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      high = !high;
      osc.frequency.setValueAtTime(high ? HIGH_HZ : LOW_HZ, t + i * HALF_CYCLE_S);
    }
  };
  schedule();
  timer = setInterval(schedule, HALF_CYCLE_S * 4 * 1000);
}

export function stopAlarm(): void {
  if (timer) clearInterval(timer);
  timer = null;
  try {
    osc?.stop();
  } catch {
    // already stopped
  }
  osc?.disconnect();
  gain?.disconnect();
  osc = null;
  gain = null;
}
