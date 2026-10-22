"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, type Couple, type Player } from "@/lib/supabase";
import { ROOM } from "@/lib/room";

export type Conn = "connecting" | "live" | "down";

// Live room state shared by the player and host screens:
// couples + scores, players, who has the app open (presence), connection status.
export function useRoom(opts: { presenceKey?: string; onJoin?: (p: Player) => void; enabled?: boolean }) {
  const { presenceKey, enabled = true } = opts;
  const [couples, setCouples] = useState<Couple[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [conn, setConn] = useState<Conn>("connecting");
  const [loaded, setLoaded] = useState(false);
  const playersRef = useRef<Player[]>([]);
  const onJoin = useRef(opts.onJoin);
  onJoin.current = opts.onJoin;

  const load = useCallback(async () => {
    const [c, p] = await Promise.all([
      supabase.from("cn_couples").select("*").eq("room_code", ROOM).order("idx"),
      supabase.from("cn_players").select("*").eq("room_code", ROOM).order("created_at"),
    ]);
    if (c.data) setCouples(c.data);
    if (p.data) {
      setPlayers(p.data);
      playersRef.current = p.data;
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    load();
    let synced = false;
    const ch = supabase.channel(`room-${ROOM}`, presenceKey ? { config: { presence: { key: presenceKey } } } : undefined);
    ch.on("presence", { event: "sync" }, () => {
      setOnline(new Set(Object.keys(ch.presenceState())));
      synced = true;
    })
      .on("presence", { event: "join" }, ({ key }) => {
        if (!synced || key === presenceKey) return;
        const p = playersRef.current.find((x) => x.id === key);
        if (p) onJoin.current?.(p);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "cn_players", filter: `room_code=eq.${ROOM}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "cn_couples", filter: `room_code=eq.${ROOM}` }, load)
      .subscribe((s) => {
        if (s === "SUBSCRIBED") {
          setConn("live");
          if (presenceKey) ch.track({ at: Date.now() });
          load(); // catch anything missed while reconnecting
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setConn("down");
      });

    // Phones sleep; refresh when the tab comes back.
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      supabase.removeChannel(ch);
    };
  }, [enabled, presenceKey, load]);

  return { couples, players, online, conn, loaded, reload: load };
}
