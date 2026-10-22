import type { FC } from "react";
import type { Couple, Player } from "@/lib/supabase";
import type { Award, Ctx, Phase, Prompt } from "@/lib/game";

export type Room = { players: Player[]; couples: Couple[]; online: Set<string> };

export type GameDef = {
  id: string;
  title: string;
  blurb: string;
  kind: "social" | "mini";
  Icon: FC<{ className?: string }>;
  // Host: build the next round.
  start: (room: Room) => { prompt: Prompt; subject?: string | null; phase?: Phase };
  Player: FC<Ctx>;
  Host: FC<Ctx>;
  // Host's "next" button per phase. `ready` gates it (e.g. wait for the subject's statement).
  flow: Partial<Record<Phase, { next: Phase; label: string; ready?: (ctx: Ctx) => boolean }>>;
  // Points suggested at reveal; host confirms. Omit for manual scoring.
  score?: (ctx: Ctx) => Award[];
};

// Sum awards per couple so the preview reads "+3 ירין ויובל", not three +1 lines.
export function merge(awards: Award[]): Award[] {
  const m = new Map<string, Award>();
  for (const a of awards) {
    const cur = m.get(a.coupleId);
    m.set(a.coupleId, cur ? { ...cur, delta: cur.delta + a.delta } : { ...a });
  }
  return [...m.values()].filter((a) => a.delta !== 0);
}
