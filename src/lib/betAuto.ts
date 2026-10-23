"use client";

import type { Couple } from "@/lib/supabase";

// Resolve the bets the night's data can answer: the winning couple, from the scoreboard (not if tied).
export async function resolveFromNight(couples: Couple[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const ranked = [...couples].sort((a, b) => b.score - a.score);
  if (ranked.length > 1 && ranked[0].score !== ranked[1].score) out.winner = ranked[0].id;
  return out;
}
