"use client";

import type { Couple } from "@/lib/supabase";
import { shuffle } from "@/lib/game";

// Team games: two teams, each made of two whole couples (so team points still move the couple scoreboard).
// The pairing lives on the host phone and is copied into every team round's prompt.
export type TeamId = "A" | "B";
export type Teams = Record<TeamId, string[]>; // couple ids
export const TEAM_META: Record<TeamId, { name: string; bg: string; text: string; tint: string }> = {
  A: { name: "הקבוצה הכתומה", bg: "bg-sun", text: "text-sun", tint: "bg-sun/15" },
  B: { name: "הקבוצה הסגולה", bg: "bg-[#9b6bff]", text: "text-[#b99bff]", tint: "bg-[#9b6bff]/15" },
};

const KEY = "cn:teams";

export function shuffleTeams(couples: Couple[]): Teams {
  const ids = shuffle(couples.map((c) => c.id));
  const half = Math.ceil(ids.length / 2);
  const t: Teams = { A: ids.slice(0, half), B: ids.slice(half) };
  try {
    localStorage.setItem(KEY, JSON.stringify(t));
  } catch {}
  return t;
}

export function getTeams(couples: Couple[]): Teams {
  try {
    const t = JSON.parse(localStorage.getItem(KEY) ?? "null") as Teams | null;
    const all = [...(t?.A ?? []), ...(t?.B ?? [])];
    if (t && all.length === couples.length && couples.every((c) => all.includes(c.id))) return t;
  } catch {}
  return shuffleTeams(couples);
}

export const teamOfCouple = (teams: Teams | undefined, coupleId: string | undefined): TeamId | null =>
  !teams || !coupleId ? null : teams.A.includes(coupleId) ? "A" : teams.B.includes(coupleId) ? "B" : null;
