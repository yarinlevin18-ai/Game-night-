"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, type Couple, type Player } from "@/lib/supabase";
import { ROOM } from "@/lib/room";
import { props } from "@/content/props";

export type Bet = { id: string; player_id: string; prop: string; value: string };
export type BetState = { locked: boolean; results: Record<string, string>; awarded: boolean };

// All bets + lock/results state, live.
export function useBets() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [state, setState] = useState<BetState>({ locked: false, results: {}, awarded: false });
  const [ready, setReady] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    const [b, s] = await Promise.all([
      supabase.from("cn_bets").select("id, player_id, prop, value").eq("room_code", ROOM),
      supabase.from("cn_bet_state").select("locked, results, awarded").eq("room_code", ROOM).maybeSingle(),
    ]);
    if (mine !== seq.current) return;
    if (b.data) setBets(b.data as Bet[]);
    if (s.data) setState(s.data as BetState);
    setReady(true);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`bets-${ROOM}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cn_bets", filter: `room_code=eq.${ROOM}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "cn_bet_state", filter: `room_code=eq.${ROOM}` }, load)
      .subscribe((s) => s === "SUBSCRIBED" && load());
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      supabase.removeChannel(ch);
    };
  }, [load]);

  return { bets, state, ready, reload: load };
}

export async function placeBet(playerId: string, prop: string, value: string) {
  // Refuse after lock (the page also hides the buttons).
  const { data } = await supabase.from("cn_bet_state").select("locked").eq("room_code", ROOM).maybeSingle();
  if (data?.locked) return;
  await supabase.from("cn_bets").upsert({ room_code: ROOM, player_id: playerId, prop, value }, { onConflict: "room_code,player_id,prop" });
}

export async function setLocked(locked: boolean) {
  await supabase.from("cn_bet_state").update({ locked }).eq("room_code", ROOM);
}

export async function setResult(results: Record<string, string>, prop: string, value: string | null) {
  const next = { ...results };
  if (value === null) delete next[prop];
  else next[prop] = value;
  await supabase.from("cn_bet_state").update({ results: next }).eq("room_code", ROOM);
}

// Who got what right, per player and per couple.
export function scoreBets(bets: Bet[], results: Record<string, string>, players: Player[]) {
  const perPlayer = new Map<string, number>();
  const perCouple = new Map<string, number>();
  for (const b of bets) {
    const p = props.find((x) => x.id === b.prop);
    if (!p || results[b.prop] === undefined || results[b.prop] !== b.value) continue;
    perPlayer.set(b.player_id, (perPlayer.get(b.player_id) ?? 0) + 1);
    const couple = players.find((x) => x.id === b.player_id)?.couple_id;
    if (couple) perCouple.set(couple, (perCouple.get(couple) ?? 0) + p.points);
  }
  return { perPlayer, perCouple };
}

// Claim once (only one tap/phone wins), then add the points.
export async function awardBets(bets: Bet[], results: Record<string, string>, players: Player[], couples: Couple[]) {
  const { data } = await supabase.from("cn_bet_state").update({ awarded: true }).eq("room_code", ROOM).eq("awarded", false).select("room_code");
  if (!data?.length) return;
  const { perCouple } = scoreBets(bets, results, players);
  for (const c of couples) {
    const d = perCouple.get(c.id);
    if (d) await supabase.rpc("cn_award", { p_couple: c.id, p_delta: d, p_reason: "הימורי הערב" });
  }
}
