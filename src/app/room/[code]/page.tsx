"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Couple, type Player } from "@/lib/supabase";
import { getMe, clearMe, type Me } from "@/lib/session";
import { coupleBg, coupleText } from "@/lib/colors";

export default function Room({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [me, setMeState] = useState<Me | null>(null);
  const [couples, setCouples] = useState<Couple[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    const m = getMe(code);
    if (!m) {
      router.replace(`/?code=${code}`);
      return;
    }
    setMeState(m);

    const load = async () => {
      const [c, p] = await Promise.all([
        supabase.from("cn_couples").select("*").eq("room_code", code).order("idx"),
        supabase.from("cn_players").select("*").eq("room_code", code).order("created_at"),
      ]);
      if (c.data) setCouples(c.data);
      if (p.data) {
        setPlayers(p.data);
        // Host may have removed this player; send them back to join.
        if (!p.data.some((x) => x.id === m.playerId)) {
          clearMe(code);
          router.replace(`/?code=${code}`);
        }
      }
    };
    load();

    // Realtime: refetch on any change in this room (tiny tables, simplest correct thing).
    const ch = supabase
      .channel(`room-${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cn_players", filter: `room_code=eq.${code}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "cn_couples", filter: `room_code=eq.${code}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [code, router]);

  if (!me) return null;
  const mine = couples.find((c) => c.id === me.coupleId);

  return (
    <div className="flex flex-col gap-6 pt-4">
      <header className="text-center">
        <p className="text-mute">חדר {code}</p>
        <h1 className="mt-1 text-3xl font-black">
          היי {me.name} 👋
        </h1>
        {mine && <p className={`mt-1 font-bold ${coupleText[mine.idx]}`}>{mine.name}</p>}
      </header>

      <div className="rounded-3xl bg-card p-5 text-center">
        <div className="text-4xl">⏳</div>
        <p className="mt-2 text-lg">מחכים למנחה שיתחיל…</p>
        <p className="text-sm text-mute">בינתיים, תתחילו לחשוד אחד בשני</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">מי כבר פה</h2>
        {couples.map((c) => {
          const ps = players.filter((p) => p.couple_id === c.id);
          return (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3">
              <span className={`size-3 shrink-0 rounded-full ${coupleBg[c.idx]}`} />
              <span className="font-bold">{c.name}</span>
              <span className="mr-auto text-sm text-mute">
                {ps.length ? ps.map((p) => p.name).join(" · ") : "עוד לא הגיעו"}
              </span>
            </div>
          );
        })}
      </section>
    </div>
  );
}
