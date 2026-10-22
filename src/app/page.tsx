"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Couple, type Player } from "@/lib/supabase";
import { getMe, setMe } from "@/lib/session";
import { ROOM } from "@/lib/room";
import { coupleBg, coupleText, coupleTint, delay } from "@/lib/colors";
import { buzz } from "@/lib/ux";
import { Dice, Glass, Heart } from "@/components/art";
import { CoupleAvatar } from "@/components/CoupleAvatar";
import { useRoom } from "@/lib/useRoom";

// Entry: tap your name. That's it.
export default function Pick() {
  const router = useRouter();
  const [couples, setCouples] = useState<Couple[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  // Who already has the app open, so nobody grabs their partner's name by mistake.
  const { online } = useRoom({});

  useEffect(() => {
    if (getMe(ROOM)) {
      router.replace("/play");
      return;
    }
    Promise.all([
      supabase.from("cn_couples").select("*").eq("room_code", ROOM).order("idx"),
      supabase.from("cn_players").select("*").eq("room_code", ROOM).order("created_at"),
    ]).then(([c, p]) => {
      if (c.error || p.error) return setError(true);
      setCouples(c.data);
      setPlayers(p.data);
    });
  }, [router]);

  function pick(p: Player) {
    setPicked(p.id);
    buzz(20);
    setMe(ROOM, { playerId: p.id, name: p.name, coupleId: p.couple_id });
    setTimeout(() => router.push("/play"), 350);
  }

  return (
    <div className="flex flex-col gap-6 pt-6 pb-8">
      <header className="text-center">
        <div className="flex items-end justify-center gap-2">
          <Glass className="size-14 animate-float drop-shadow-[0_8px_16px_rgb(255_79_139/0.45)]" />
          <Dice className="size-18 animate-float drop-shadow-[0_8px_16px_rgb(155_107_255/0.5)] [animation-delay:-1.2s]" />
          <Heart className="size-14 animate-float drop-shadow-[0_8px_16px_rgb(255_79_139/0.45)] [animation-delay:-2.4s]" />
        </div>
        <h1 className="mt-3 animate-pop text-5xl font-black text-party [animation-delay:150ms]">ערב זוגות</h1>
        <p className="mt-2 animate-rise text-lg font-bold [animation-delay:300ms]">מי את/ה?</p>
      </header>

      {error && (
        <p role="alert" className="animate-shake text-center font-bold text-pop">
          אין חיבור. בדקו את האינטרנט ורעננו
        </p>
      )}

      {!error && !couples.length && (
        <div className="grid grid-cols-1 gap-3" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-white/5" style={delay(i, 120)} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {couples.map((c, i) => (
          <section
            key={c.id}
            className={`flex animate-rise items-center gap-3 rounded-3xl p-3 ${coupleTint[c.idx]}`}
            style={delay(i + 4, 90)}
          >
            <CoupleAvatar idx={c.idx} className="size-16" />
            <div className="grid flex-1 grid-cols-2 gap-2">
              {players
                .filter((p) => p.couple_id === c.id)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => pick(p)}
                    disabled={!!picked}
                    className={`rounded-2xl py-4 text-xl font-black transition duration-200 active:scale-95 ${
                      picked === p.id ? `${coupleBg[c.idx]} animate-wiggle text-bg` : `bg-black/25 ${coupleText[c.idx]}`
                    } ${picked && picked !== p.id ? "opacity-40" : ""}`}
                  >
                    {p.name}
                    {online.has(p.id) && picked !== p.id && <span className="block text-xs font-bold opacity-70">כבר מחובר/ת</span>}
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
