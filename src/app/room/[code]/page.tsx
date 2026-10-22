"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Couple, type Player } from "@/lib/supabase";
import { getMe, clearMe, type Me } from "@/lib/session";
import { coupleBg, coupleBorder, coupleEmoji, coupleText, coupleTint, delay } from "@/lib/colors";

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
        <span className="inline-block animate-rise rounded-full bg-white/10 px-3 py-1 text-sm text-mute">
          חדר {code}
        </span>
        <h1 className="mt-3 animate-pop text-4xl font-black [animation-delay:100ms]">
          היי <span className="text-party">{me.name}</span>{" "}
          <span className="inline-block origin-bottom-right animate-wiggle [animation-delay:700ms] [animation-iteration-count:3]">
            👋
          </span>
        </h1>
        {mine && (
          <p
            className={`mt-2 inline-flex animate-rise items-center gap-1 rounded-full px-3 py-1 font-bold [animation-delay:250ms] ${coupleTint[mine.idx]} ${coupleText[mine.idx]}`}
          >
            {coupleEmoji[mine.idx]} {mine.name}
          </p>
        )}
      </header>

      <div className="card animate-rise rounded-3xl p-6 text-center [animation-delay:350ms]">
        <div className="inline-block animate-float text-5xl">⏳</div>
        <p className="mt-3 flex items-center justify-center gap-1 text-lg font-bold">
          מחכים למנחה שיתחיל
          {[0, 1, 2].map((i) => (
            <span key={i} className="inline-block size-1.5 animate-dot rounded-full bg-sun" style={delay(i, 150)} />
          ))}
        </p>
        <p className="mt-1 text-sm text-mute">בינתיים, תתחילו לחשוד אחד בשני</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="animate-rise font-bold [animation-delay:450ms]">מי כבר פה</h2>
        {couples.map((c, i) => {
          const ps = players.filter((p) => p.couple_id === c.id);
          return (
            <div
              key={c.id}
              className={`flex animate-rise flex-wrap items-center gap-2 rounded-2xl border-r-4 px-4 py-3 ${coupleTint[c.idx]} ${coupleBorder[c.idx]}`}
              style={delay(i + 7)}
            >
              <span className="text-xl">{coupleEmoji[c.idx]}</span>
              <span className={`font-bold ${coupleText[c.idx]}`}>{c.name}</span>
              <span className="mr-auto flex flex-wrap gap-1.5">
                {ps.length ? (
                  ps.map((p) => (
                    // key per player, so only newcomers pop in
                    <span key={p.id} className={`animate-pop rounded-full px-2.5 py-0.5 text-sm font-medium text-bg ${coupleBg[c.idx]}`}>
                      {p.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-mute">עוד לא הגיעו</span>
                )}
              </span>
            </div>
          );
        })}
      </section>
    </div>
  );
}
