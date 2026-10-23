"use client";

import { supabase, type Couple, type Player } from "@/lib/supabase";
import { ROOM } from "@/lib/room";

type Row = { id: string; game: string; phase: string; prompt: Record<string, unknown>; subject_player_id: string | null };
type Ans = { round_id: string; player_id: string; kind: string; value: string };

// Resolve the bets that the night's data can answer. Returns only what is unambiguous (no ties).
export async function resolveFromNight(couples: Couple[], players: Player[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const coupleOf = (pid: string) => players.find((p) => p.id === pid)?.couple_id;

  // Scoreboard: winner / last place (only if not tied).
  const ranked = [...couples].sort((a, b) => b.score - a.score);
  if (ranked.length > 1 && ranked[0].score !== ranked[1].score) out.winner = ranked[0].id;
  if (ranked.length > 1 && ranked.at(-1)!.score !== ranked.at(-2)!.score) out.last = ranked.at(-1)!.id;

  const { data: rounds } = await supabase
    .from("cn_rounds")
    .select("id, game, phase, prompt, subject_player_id")
    .eq("room_code", ROOM)
    .in("game", ["likely", "truth", "imposter"]);
  const rs = ((rounds ?? []) as Row[]).filter((r) => r.phase === "reveal");
  if (!rs.length) return out;
  const { data: answers } = await supabase.from("cn_answers").select("round_id, player_id, kind, value").in("round_id", rs.map((r) => r.id));
  const ans = (answers ?? []) as Ans[];
  const top = (m: Map<string, number>) => {
    const max = Math.max(0, ...m.values());
    const ids = [...m].filter(([, n]) => n === max && max > 0).map(([id]) => id);
    return ids.length === 1 ? ids[0] : null;
  };

  // מי הכי סביר: most votes received across all rounds.
  const star = new Map<string, number>();
  for (const a of ans) if (a.kind === "vote" && rs.find((r) => r.id === a.round_id)?.game === "likely") star.set(a.value, (star.get(a.value) ?? 0) + 1);
  const s = top(star);
  if (s) out.star = s;

  // אמת או שקר: most people fooled (subject's own couple doesn't count).
  const fooled = new Map<string, number>();
  for (const r of rs.filter((x) => x.game === "truth" && x.subject_player_id)) {
    const stmt = ans.find((a) => a.round_id === r.id && a.kind === "stmt");
    if (!stmt) continue;
    let truth: boolean;
    try {
      truth = JSON.parse(stmt.value).truth;
    } catch {
      continue;
    }
    const subjCouple = coupleOf(r.subject_player_id!);
    const n = ans.filter((a) => a.round_id === r.id && a.kind === "vote" && coupleOf(a.player_id) !== subjCouple && (a.value === "true") !== truth).length;
    fooled.set(r.subject_player_id!, (fooled.get(r.subject_player_id!) ?? 0) + n);
  }
  const l = top(fooled);
  if (l) out.liar = l;

  // המתחזה: did any imposter escape? (caught = imposter alone at the top of the vote)
  const imps = rs.filter((x) => x.game === "imposter" && x.subject_player_id);
  if (imps.length) {
    const escaped = imps.some((r) => {
      const votes = new Map<string, number>();
      for (const a of ans) if (a.round_id === r.id && a.kind === "vote") votes.set(a.value, (votes.get(a.value) ?? 0) + 1);
      return top(votes) !== r.subject_player_id;
    });
    out.escape = escaped ? "yes" : "no";
  }
  return out;
}
