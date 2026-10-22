"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, type Couple, type Player } from "@/lib/supabase";
import { ROOM } from "@/lib/room";

export type Phase = "open" | "guess" | "reveal" | "done";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Prompt = Record<string, any>;
export type Round = {
  id: string;
  game: string;
  prompt: Prompt;
  phase: Phase;
  subject_player_id: string | null;
  created_at: string;
};
export type Answer = { id: string; round_id: string; player_id: string; kind: string; value: string; created_at: string };
export type Award = { coupleId: string; delta: number; reason: string };

// The round everyone is on right now (null = lobby), plus its answers. Live.
export function useGame() {
  const [round, setRound] = useState<Round | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [ready, setReady] = useState(false);
  const seq = useRef(0);

  // Many realtime events fire loads in parallel; only the newest one may write state.
  const load = useCallback(async () => {
    const mine = ++seq.current;
    const { data: room } = await supabase.from("cn_rooms").select("current_round_id").eq("code", ROOM).single();
    const rid = room?.current_round_id as string | null;
    if (mine !== seq.current) return;
    if (!rid) {
      setRound(null);
      setAnswers([]);
      setReady(true);
      return;
    }
    const [r, a] = await Promise.all([
      supabase.from("cn_rounds").select("*").eq("id", rid).single(),
      supabase.from("cn_answers").select("*").eq("round_id", rid).order("created_at"),
    ]);
    if (mine !== seq.current) return;
    setRound((r.data as Round) ?? null);
    setAnswers((a.data as Answer[]) ?? []);
    setReady(true);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`game-${ROOM}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cn_rooms", filter: `code=eq.${ROOM}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "cn_rounds", filter: `room_code=eq.${ROOM}` }, load)
      // cn_answers has no room column; tiny volume, so refetch on any change.
      .on("postgres_changes", { event: "*", schema: "public", table: "cn_answers" }, load)
      .subscribe((s) => s === "SUBSCRIBED" && load());
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      supabase.removeChannel(ch);
    };
  }, [load]);

  return { round, answers, ready, reload: load };
}

// --- player action ---
export async function submit(roundId: string, playerId: string, kind: string, value: unknown) {
  const v = typeof value === "string" ? value : JSON.stringify(value);
  return supabase.from("cn_answers").upsert({ round_id: roundId, player_id: playerId, kind, value: v }, { onConflict: "round_id,player_id,kind" });
}

// --- host actions ---
export async function startRound(game: string, prompt: Prompt, subjectId: string | null = null, phase: Phase = "open") {
  const { data, error } = await supabase
    .from("cn_rounds")
    .insert({ room_code: ROOM, game, prompt, phase, subject_player_id: subjectId })
    .select("id")
    .single();
  if (error || !data) return;
  await supabase.from("cn_rooms").update({ current_game: game, current_round_id: data.id }).eq("code", ROOM);
}

export async function updateRound(id: string, patch: { phase?: Phase; prompt?: Prompt }) {
  await supabase.from("cn_rounds").update(patch).eq("id", id);
}

// Advance only if still in `from` (a double tap can't skip a phase).
// Entering "guess" stamps startedAt so every phone's timer counts from the same moment.
export async function advance(round: Round, to: Phase) {
  const patch: { phase: Phase; prompt?: Prompt } = { phase: to };
  if (to === "guess") patch.prompt = { ...round.prompt, startedAt: Date.now() };
  await supabase.from("cn_rounds").update(patch).eq("id", round.id).eq("phase", round.phase);
}

export async function endGame() {
  await supabase.from("cn_rooms").update({ current_game: null, current_round_id: null }).eq("code", ROOM);
}

// Claim the round first (only one tap/phone wins), then hand out points.
export async function claimAward(roundId: string) {
  const { data: fresh } = await supabase.from("cn_rounds").select("prompt").eq("id", roundId).single();
  if (!fresh || fresh.prompt?.awarded) return false;
  const next = { ...fresh.prompt, awarded: true };
  const { data, error } = await supabase.from("cn_rounds").update({ prompt: next }).eq("id", roundId).is("prompt->>awarded", null).select("id");
  if (error) {
    // JSON-path filter not accepted: fall back to a plain update (the fresh read above still guards).
    await supabase.from("cn_rounds").update({ prompt: next }).eq("id", roundId);
    return true;
  }
  return !!data?.length;
}

export async function giveAwards(roundId: string, awards: Award[]) {
  if (!(await claimAward(roundId))) return;
  for (const a of awards) if (a.delta) await supabase.rpc("cn_award", { p_couple: a.coupleId, p_delta: a.delta, p_reason: a.reason });
}

// Prefer people who have the app open; fall back to everyone.
export function present<T extends { id: string }>(players: T[], online: Set<string>) {
  const here = players.filter((p) => online.has(p.id));
  return here.length >= 2 ? here : players;
}

// --- helpers shared by games ---
export const parse = <T,>(v: string): T => {
  try {
    return JSON.parse(v) as T;
  } catch {
    return v as unknown as T;
  }
};
export const byKind = (answers: Answer[], kind: string) => answers.filter((a) => a.kind === kind);
export const mineOf = (answers: Answer[], playerId: string | undefined, kind: string) =>
  answers.find((a) => a.player_id === playerId && a.kind === kind);
export function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

// Draw from a bank without repeats until it runs out (remembered on the host phone).
export function draw<T>(bankId: string, bank: T[]): { item: T; index: number } {
  const key = `cn:used:${bankId}`;
  let used: number[] = [];
  try {
    used = JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {}
  let free = bank.map((_, i) => i).filter((i) => !used.includes(i));
  if (!free.length) {
    used = [];
    free = bank.map((_, i) => i);
  }
  const index = pick(free);
  try {
    localStorage.setItem(key, JSON.stringify([...used, index]));
  } catch {}
  return { item: bank[index], index };
}

export type Ctx = {
  round: Round;
  answers: Answer[];
  couples: Couple[];
  players: Player[];
  online: Set<string>;
  meId?: string; // player screens only
  onHost?: boolean; // player view rendered inside the host console
};

export const coupleOf = (ctx: Pick<Ctx, "players" | "couples">, playerId: string | null | undefined) => {
  const p = ctx.players.find((x) => x.id === playerId);
  return ctx.couples.find((c) => c.id === p?.couple_id);
};
export const playerName = (ctx: Pick<Ctx, "players">, id: string | null | undefined) => ctx.players.find((p) => p.id === id)?.name ?? "";
