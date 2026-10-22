"use client";

// Tiny synth so there are no audio files to load. Phones only allow sound after a tap,
// so the context is created lazily and resumed on the first pointer event.
let ctx: AudioContext | null = null;
const MUTE_KEY = "cn:mute";

export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}
export function setMuted(m: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {}
}

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

if (typeof window !== "undefined") {
  const unlock = () => {
    ac();
    window.removeEventListener("pointerdown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = "sine", gain = 0.18, slideTo?: number) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const sounds = {
  tap: () => tone(660, 0, 0.06, "triangle", 0.12),
  tick: () => tone(1200, 0, 0.05, "square", 0.06),
  whoosh: () => tone(220, 0, 0.35, "sawtooth", 0.06, 880),
  ding: () => {
    tone(880, 0, 0.18, "triangle");
    tone(1320, 0.08, 0.25, "triangle");
  },
  go: () => tone(990, 0, 0.25, "square", 0.12),
  buzzer: () => tone(140, 0, 0.5, "sawtooth", 0.15, 90),
  reveal: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.3, "triangle", 0.14)),
  fanfare: () => {
    [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, [0, 0.12, 0.24, 0.36, 0.6, 0.84, 0.96, 1.2][i], i === 7 ? 0.9 : 0.2, "triangle", 0.16));
    tone(262, 1.2, 0.9, "sine", 0.1);
  },
};

export type Sound = keyof typeof sounds;
export function play(s: Sound) {
  if (isMuted()) return;
  try {
    sounds[s]();
  } catch {}
}
