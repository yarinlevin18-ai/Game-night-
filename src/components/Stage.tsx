"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Round } from "@/lib/game";
import type { GameDef } from "@/games/types";
import { CoupleAvatar } from "./CoupleAvatar";
import { Confetti } from "./Confetti";
import { buzz } from "@/lib/ux";

const KIND: Record<GameDef["kind"], string> = { social: "משחק חברתי", mini: "מיני משחק", team: "משחק קבוצות", finale: "הגמר" };

// Wraps a game screen with the show moments: title card when a game starts, a flash on reveal,
// a celebration when my couple scores, and a soft transition between phases.
// Overlays are portaled out of <main> and never take taps.
export function Stage({ round, def, score, coupleIdx, children }: { round: Round; def: GameDef; score?: number; coupleIdx?: number; children: React.ReactNode }) {
  const [intro, setIntro] = useState<string | null>(null);
  const [flash, setFlash] = useState<number | null>(null);
  const [burst, setBurst] = useState<{ d: number; k: number } | null>(null);
  const seen = useRef<{ game?: string; key?: string; score?: number }>({});
  const box = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Title card: on a game change, or when we land on a round that just started (lobby -> game).
  useEffect(() => {
    const s = seen.current;
    const fresh = Math.abs(Date.now() - new Date(round.created_at).getTime()) < 8000;
    if (s.game === undefined ? fresh : s.game !== round.game) setIntro(`${round.id}`);
    s.game = round.game;
  }, [round.game, round.id, round.created_at]);

  // Phase change: slide the new screen in; on reveal, flash.
  useLayoutEffect(() => {
    const s = seen.current;
    const key = `${round.id}:${round.phase}`;
    if (s.key !== undefined && s.key !== key) {
      box.current?.animate?.(
        [
          { opacity: 0, transform: "translateY(16px) scale(0.98)", filter: "blur(6px)" },
          { opacity: 1, transform: "none", filter: "none" },
        ],
        { duration: 480, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
      );
      if (round.phase === "reveal" && def.kind !== "finale") setFlash(Date.now());
    }
    s.key = key;
  }, [round.id, round.phase, def.kind]);

  // My couple scored.
  useEffect(() => {
    const s = seen.current;
    if (score !== undefined && s.score !== undefined && score > s.score) {
      setBurst({ d: score - s.score, k: Date.now() });
      buzz(40);
    }
    s.score = score;
  }, [score]);

  useEffect(() => {
    if (!intro) return;
    const t = setTimeout(() => setIntro(null), 2100);
    return () => clearTimeout(t);
  }, [intro]);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1100);
    return () => clearTimeout(t);
  }, [flash]);
  useEffect(() => {
    if (!burst) return;
    const t = setTimeout(() => setBurst(null), 2200);
    return () => clearTimeout(t);
  }, [burst]);

  return (
    <>
      <div ref={box} className="flex flex-col gap-4">
        {children}
      </div>
      {mounted &&
        createPortal(
          <>
            {intro && (
              <div key={intro} aria-hidden className="pointer-events-none fixed inset-0 z-50 flex animate-intro flex-col items-center justify-center gap-4 bg-bg/90 px-8 text-center backdrop-blur-md">
                <div className="absolute size-[160vmax] animate-rays rounded-full opacity-40 [background:repeating-conic-gradient(from_0deg,rgb(255_79_139/0.35)_0deg_10deg,transparent_10deg_20deg)]" />
                <span className="relative rounded-full bg-white/10 px-4 py-1 text-sm font-black tracking-wide text-sun animate-rise">{KIND[def.kind]}</span>
                <def.Icon className="relative size-32 animate-spinin drop-shadow-[0_12px_30px_rgb(255_79_139/0.5)]" />
                <h2 className="relative animate-pop text-5xl leading-tight font-black text-party [animation-delay:180ms]">{def.title}</h2>
                <p className="relative max-w-xs animate-rise text-lg font-bold text-mute [animation-delay:320ms]">{def.blurb}</p>
              </div>
            )}
            {flash && (
              <div key={flash} aria-hidden className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
                <div className="absolute inset-0 animate-flash [background:radial-gradient(circle_at_center,rgb(255_201_60/0.55),rgb(255_79_139/0.25)_40%,transparent_70%)]" />
                <span className="relative animate-stamp text-6xl font-black text-sun drop-shadow-[0_6px_20px_rgb(0_0_0/0.5)]">חשיפה!</span>
              </div>
            )}
            {burst && (
              <div key={burst.k} role="status" className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
                <Confetti count={45} />
                <div className="animate-burst flex flex-col items-center gap-2 rounded-[2rem] bg-bg/85 px-8 py-6 shadow-2xl shadow-c4/30 backdrop-blur">
                  {coupleIdx && <CoupleAvatar idx={coupleIdx} className="size-16" badge={false} />}
                  <span dir="ltr" className="text-7xl font-black text-c4 tabular-nums">
                    +{burst.d}
                  </span>
                  <span className="text-xl font-black">לזוג שלכם!</span>
                </div>
              </div>
            )}
          </>,
          document.body,
        )}
    </>
  );
}
