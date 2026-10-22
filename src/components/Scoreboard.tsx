"use client";

import { useEffect, useRef, useState } from "react";
import type { Couple } from "@/lib/supabase";
import { coupleBorder, coupleText, coupleTint } from "@/lib/colors";
import { CoupleAvatar } from "./CoupleAvatar";
import { Trophy } from "./art";

const ROW = 64; // px per row; rows slide to their rank position

// Live ranking: rows glide when the order changes, score pops and shows a +N bubble.
export function Scoreboard({ couples, mineId, children }: { couples: Couple[]; mineId?: string; children?: (c: Couple) => React.ReactNode }) {
  const ranked = [...couples].sort((a, b) => b.score - a.score || a.idx - b.idx);
  const rank = new Map(ranked.map((c, i) => [c.id, i]));
  const prev = useRef<Map<string, number>>(new Map());
  const [deltas, setDeltas] = useState<Record<string, { d: number; k: number }>>({});

  // Diff scores against the previous render to show +N / -N bubbles.
  useEffect(() => {
    const next: Record<string, { d: number; k: number }> = {};
    for (const c of couples) {
      const before = prev.current.get(c.id);
      if (before !== undefined && before !== c.score) next[c.id] = { d: c.score - before, k: Date.now() };
      prev.current.set(c.id, c.score);
    }
    if (Object.keys(next).length) {
      setDeltas((d) => ({ ...d, ...next }));
      const t = setTimeout(() => setDeltas({}), 1600);
      return () => clearTimeout(t);
    }
  }, [couples]);

  const rowH = children ? ROW + 48 : ROW;
  const top = ranked[0]?.score ?? 0;

  return (
    <div className="relative" style={{ height: couples.length * (rowH + 8) }}>
      {couples.map((c) => {
        const r = rank.get(c.id) ?? 0;
        const lead = r === 0 && top > 0 && ranked[1]?.score !== top;
        const d = deltas[c.id];
        return (
          <div
            key={c.id}
            className={`absolute inset-x-0 rounded-2xl border-r-4 px-3 transition-transform duration-700 ease-[cubic-bezier(0.3,1.3,0.5,1)] ${coupleTint[c.idx]} ${coupleBorder[c.idx]} ${
              c.id === mineId ? "ring-2 ring-white/25" : ""
            }`}
            style={{ transform: `translateY(${r * (rowH + 8)}px)`, height: rowH }}
          >
            <div className="flex items-center gap-3" style={{ height: ROW }}>
              <span className="w-5 text-center text-lg font-black text-mute">{r + 1}</span>
              <CoupleAvatar idx={c.idx} className="size-10" />
              <span className={`flex-1 truncate text-lg font-bold ${coupleText[c.idx]}`}>{c.name}</span>
              {lead && <Trophy className="size-7 animate-float" title="מובילים" />}
              <span className="relative min-w-12 text-left">
                <span key={c.score} className="inline-block animate-pop text-3xl font-black tabular-nums">
                  {c.score}
                </span>
                {d && (
                  <span
                    key={d.k}
                    dir="ltr"
                    className={`absolute -top-5 left-0 animate-floatup text-lg font-black ${d.d > 0 ? "text-c4" : "text-pop"}`}
                  >
                    {d.d > 0 ? `+${d.d}` : d.d}
                  </span>
                )}
              </span>
            </div>
            {children?.(c)}
          </div>
        );
      })}
    </div>
  );
}
