"use client";

import { useEffect, useState } from "react";
import type { Couple, Player } from "@/lib/supabase";
import { coupleBg, coupleBorder, coupleText, coupleTint, delay } from "@/lib/colors";
import { CoupleAvatar } from "./CoupleAvatar";
import { Check, Hourglass } from "./art";
import { buzz } from "@/lib/ux";

// Big prompt card at the top of every game screen.
export function PromptCard({ kicker, children }: { kicker?: string; children: React.ReactNode }) {
  return (
    <div className="card animate-pop rounded-3xl p-5 text-center">
      {kicker && <p className="mb-2 text-sm font-bold text-sun">{kicker}</p>}
      <div className="text-2xl leading-snug font-black">{children}</div>
    </div>
  );
}

export function Waiting({ text = "נשלח! מחכים לשאר…" }: { text?: string }) {
  return (
    <div className="flex animate-pop flex-col items-center gap-3 py-6 text-center">
      <Check className="size-14" />
      <p className="text-lg font-bold">{text}</p>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2 animate-dot rounded-full bg-sun" style={delay(i, 150)} />
        ))}
      </div>
    </div>
  );
}

export function Hold({ text }: { text: string }) {
  return (
    <div className="flex animate-pop flex-col items-center gap-3 py-8 text-center">
      <Hourglass className="size-16 animate-float" />
      <p className="text-lg font-bold">{text}</p>
    </div>
  );
}

// Pick a player (voting). Shows them grouped by couple.
export function PlayerPicker({
  players,
  couples,
  exclude,
  value,
  onPick,
}: {
  players: Player[];
  couples: Couple[];
  exclude?: string[];
  value?: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {players
        .filter((p) => !exclude?.includes(p.id))
        .map((p, i) => {
          const c = couples.find((x) => x.id === p.couple_id);
          const on = value === p.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                buzz();
                onPick(p.id);
              }}
              className={`flex animate-pop items-center gap-2 rounded-2xl border-2 px-3 py-3 text-lg font-black transition active:scale-95 ${
                c ? coupleTint[c.idx] : ""
              } ${on && c ? `${coupleBorder[c.idx]} scale-105` : "border-transparent"}`}
              style={delay(i, 40)}
            >
              {c && <CoupleAvatar idx={c.idx} className="size-8" badge={false} />}
              <span className={c ? coupleText[c.idx] : ""}>{p.name}</span>
            </button>
          );
        })}
    </div>
  );
}

export function Options({ options, value, onPick, correct }: { options: string[]; value?: string; onPick?: (o: string) => void; correct?: string }) {
  const colors = ["bg-c1", "bg-c2", "bg-c3", "bg-c4"];
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o, i) => {
        const dim = (value && value !== o) || (correct !== undefined && correct !== o);
        return (
          <button
            key={o}
            disabled={!onPick}
            onClick={() => {
              buzz();
              onPick?.(o);
            }}
            className={`animate-pop rounded-2xl px-3 py-5 text-lg font-black text-bg transition active:scale-95 ${colors[i % 4]} ${
              dim ? "opacity-35" : ""
            } ${correct === o ? "ring-4 ring-white" : ""}`}
            style={delay(i, 60)}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

// Horizontal bars, biggest first.
export function Bars({ rows }: { rows: { key: string; label: React.ReactNode; n: number; color: string; mark?: boolean }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  const sorted = [...rows].sort((a, b) => b.n - a.n);
  return (
    <div className="flex flex-col gap-2">
      {sorted.map((r, i) => (
        <div key={r.key} className="flex animate-rise items-center gap-2" style={delay(i, 120)}>
          <span className="w-20 shrink-0 truncate font-bold">{r.label}</span>
          <div className="h-8 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className={`flex h-full items-center justify-end rounded-full px-3 font-black text-bg transition-[width] duration-1000 ease-out ${r.color} ${
                r.mark ? "ring-2 ring-white" : ""
              }`}
              style={{ width: `${Math.max(12, (r.n / max) * 100)}%` }}
            >
              {r.n}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export const coupleColor = (couples: Couple[], coupleId?: string) => {
  const c = couples.find((x) => x.id === coupleId);
  return c ? coupleBg[c.idx] : "bg-mute";
};

// Countdown from when this screen first saw `startKey` (each phone runs its own clock).
export function useCountdown(seconds: number, startKey: string | null) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (!startKey) {
      setLeft(seconds);
      return;
    }
    const t0 = Date.now();
    setLeft(seconds);
    const id = setInterval(() => {
      const l = Math.max(0, seconds - Math.floor((Date.now() - t0) / 1000));
      setLeft(l);
      if (l === 0) clearInterval(id);
    }, 200);
    return () => clearInterval(id);
  }, [seconds, startKey]);
  return left;
}

export function Clock({ left, total }: { left: number; total: number }) {
  const pct = (left / total) * 100;
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Pop only in the last 5 seconds, so the number doesn't flicker every tick. */}
      <span key={left <= 5 ? left : "t"} className={`text-6xl font-black tabular-nums ${left <= 5 ? "animate-pop text-pop" : ""}`}>
        {left}
      </span>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-party transition-[width] duration-200 ease-linear" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function NumberPad({ onSubmit, unit }: { onSubmit: (n: number) => void; unit?: string }) {
  const [v, setV] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <div className="card rounded-2xl py-3 text-center text-4xl font-black tabular-nums" dir="ltr">
        {v || "0"}
        {unit && <span className="ms-2 text-base text-mute">{unit}</span>}
      </div>
      <div className="grid grid-cols-3 gap-2" dir="ltr">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"].map((k) => (
          <button
            key={k}
            disabled={k === "✓" && !v}
            onClick={() => {
              buzz(8);
              if (k === "⌫") setV((x) => x.slice(0, -1));
              else if (k === "✓") onSubmit(Number(v));
              else setV((x) => (x + k).replace(/^0+/, "").slice(0, 7));
            }}
            className={`rounded-2xl py-4 text-2xl font-black transition active:scale-90 disabled:opacity-30 ${k === "✓" ? "bg-c4 text-bg" : "card"}`}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm font-bold ${className}`}>{children}</span>;
}
