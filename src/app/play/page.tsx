"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Couple, type Player } from "@/lib/supabase";
import { getMe, clearMe, type Me } from "@/lib/session";
import { ROOM } from "@/lib/room";
import { coupleBg, coupleBorder, coupleText, coupleTint, delay } from "@/lib/colors";
import { buzz } from "@/lib/ux";
import { Hourglass, Sparkle } from "@/components/art";
import { CoupleAvatar } from "@/components/CoupleAvatar";

type Conn = "connecting" | "live" | "down";

export default function Play() {
  const router = useRouter();
  const [me, setMeState] = useState<Me | null>(null);
  const [couples, setCouples] = useState<Couple[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [conn, setConn] = useState<Conn>("connecting");
  const [toast, setToast] = useState<{ id: string; text: string } | null>(null);
  const playersRef = useRef<Player[]>([]);
  const synced = useRef(false);

  useEffect(() => {
    const m = getMe(ROOM);
    if (!m) {
      router.replace("/");
      return;
    }
    setMeState(m);

    const load = async () => {
      const [c, p] = await Promise.all([
        supabase.from("cn_couples").select("*").eq("room_code", ROOM).order("idx"),
        supabase.from("cn_players").select("*").eq("room_code", ROOM).order("created_at"),
      ]);
      if (c.data) setCouples(c.data);
      if (!p.data) return;
      setPlayers(p.data);
      playersRef.current = p.data;
      // Player was removed; back to the name picker.
      if (!p.data.some((x) => x.id === m.playerId)) {
        clearMe(ROOM);
        router.replace("/");
      }
    };
    load();

    // Presence = who has the app open right now. Postgres changes = scores/names.
    const ch = supabase.channel(`room-${ROOM}`, { config: { presence: { key: m.playerId } } });
    ch.on("presence", { event: "sync" }, () => {
      setOnline(new Set(Object.keys(ch.presenceState())));
      synced.current = true;
    })
      .on("presence", { event: "join" }, ({ key }) => {
        if (!synced.current || key === m.playerId) return;
        const p = playersRef.current.find((x) => x.id === key);
        if (p) {
          setToast({ id: `${key}-${Date.now()}`, text: `${p.name} הגיע/ה!` });
          buzz(15);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "cn_players", filter: `room_code=eq.${ROOM}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "cn_couples", filter: `room_code=eq.${ROOM}` }, load)
      .subscribe((s) => {
        if (s === "SUBSCRIBED") {
          setConn("live");
          ch.track({ at: Date.now() });
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
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  function switchPlayer() {
    clearMe(ROOM);
    router.replace("/");
  }

  if (!me) return null;
  const mine = couples.find((c) => c.id === me.coupleId);
  const total = players.length || 8;
  const here = players.filter((p) => online.has(p.id)).length;

  return (
    <div className="flex flex-col gap-6 pt-2 pb-8">
      {toast && (
        <div
          key={toast.id}
          role="status"
          className="fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-20 mx-auto w-fit animate-pop rounded-full bg-party px-5 py-2.5 font-bold text-white shadow-xl shadow-pop/40"
        >
          <span className="flex items-center gap-2">
            <Sparkle className="size-5 animate-spin [animation-duration:3s]" />
            {toast.text}
          </span>
        </div>
      )}

      <div className="flex justify-end">
        <ConnDot conn={conn} />
      </div>

      <header className="-mt-2 text-center">
        <h1 className="animate-pop text-4xl font-black [animation-delay:100ms]">
          היי <span className="text-party">{me.name}</span>{" "}
          <Sparkle className="inline-block size-7 animate-wiggle align-[-2px] [animation-delay:700ms] [animation-iteration-count:3]" />
        </h1>
        {mine && (
          <p
            className={`mt-2 inline-flex animate-rise items-center gap-1.5 rounded-full px-3 py-1 font-bold [animation-delay:250ms] ${coupleTint[mine.idx]} ${coupleText[mine.idx]}`}
          >
            <CoupleAvatar idx={mine.idx} className="size-6" badge={false} /> {mine.name}
          </p>
        )}
      </header>

      <div className="card animate-rise rounded-3xl p-6 text-center [animation-delay:350ms]">
        <Hourglass className="mx-auto size-16 animate-float drop-shadow-[0_8px_16px_rgb(255_201_60/0.35)]" />
        <p className="mt-3 flex items-center justify-center gap-1 text-lg font-bold">
          מחכים למנחה שיתחיל
          {[0, 1, 2].map((i) => (
            <span key={i} className="inline-block size-1.5 animate-dot rounded-full bg-sun" style={delay(i, 150)} />
          ))}
        </p>
        <p className="mt-1 text-sm text-mute">בינתיים, תתחילו לחשוד אחד בשני</p>
        <p className="mt-2 text-xs text-mute/70">המסך יתעדכן לבד כשמתחילים</p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex animate-rise items-end justify-between [animation-delay:450ms]">
          <h2 className="font-bold">מי כבר פה</h2>
          <span className="text-sm text-mute">
            <b className="text-ink">{here}</b>/{total}
          </span>
        </div>
        <div className="h-2 animate-rise overflow-hidden rounded-full bg-white/10 [animation-delay:450ms]">
          <div
            className="h-full rounded-full bg-party transition-[width] duration-700 ease-out"
            style={{ width: `${Math.min(100, (here / total) * 100)}%` }}
          />
        </div>

        {couples.map((c, i) => {
          const ps = players.filter((p) => p.couple_id === c.id);
          const isMine = c.id === me.coupleId;
          return (
            <div
              key={c.id}
              className={`flex animate-rise flex-wrap items-center gap-2 rounded-2xl border-r-4 px-4 py-3 ${coupleTint[c.idx]} ${coupleBorder[c.idx]} ${
                isMine ? "ring-2 ring-white/20" : ""
              }`}
              style={delay(i + 7)}
            >
              <CoupleAvatar idx={c.idx} className="size-10" />
              <span className={`font-bold ${coupleText[c.idx]}`}>{c.name}</span>
              <span className="mr-auto flex flex-wrap gap-1.5">
                {ps.map((p) => {
                  const on = online.has(p.id);
                  const self = p.id === me.playerId;
                  return (
                    <span
                      key={p.id}
                      className={`rounded-full px-2.5 py-0.5 text-sm font-medium transition duration-500 ${
                        on ? `${coupleBg[c.idx]} animate-pop text-bg` : "bg-white/5 text-mute"
                      } ${self ? "outline-2 outline-offset-2 outline-white" : ""}`}
                    >
                      {p.name}
                      {self && " (את/ה)"}
                    </span>
                  );
                })}
              </span>
            </div>
          );
        })}
      </section>

      <button onClick={switchPlayer} className="mx-auto animate-rise text-sm text-mute underline underline-offset-4 [animation-delay:800ms]">
        זה לא אני / החלפת שחקן
      </button>
    </div>
  );
}

function ConnDot({ conn }: { conn: Conn }) {
  const map = {
    connecting: { c: "bg-sun", t: "מתחבר…" },
    live: { c: "bg-c4", t: "מחובר" },
    down: { c: "bg-pop", t: "אין חיבור" },
  }[conn];
  return (
    <span className="flex animate-rise items-center gap-1.5 text-xs text-mute" aria-live="polite">
      <span className="relative flex size-2.5">
        {conn === "live" && <span className={`absolute inset-0 animate-ping rounded-full ${map.c} opacity-60`} />}
        <span className={`relative size-2.5 rounded-full ${map.c}`} />
      </span>
      {map.t}
    </span>
  );
}
