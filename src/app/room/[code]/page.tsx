"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Couple, type Player } from "@/lib/supabase";
import { getMe, clearMe, type Me } from "@/lib/session";
import { coupleBg, coupleBorder, coupleText, coupleTint, delay } from "@/lib/colors";
import { buzz } from "@/lib/ux";
import { CoupleIcon, Hourglass, Sparkle } from "@/components/art";

type Conn = "connecting" | "live" | "down";
const EXPECTED = 8;

export default function Room({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [me, setMeState] = useState<Me | null>(null);
  const [couples, setCouples] = useState<Couple[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [conn, setConn] = useState<Conn>("connecting");
  const [toast, setToast] = useState<{ id: string; text: string } | null>(null);
  const known = useRef<Set<string> | null>(null);

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
      if (!p.data) return;
      setPlayers(p.data);

      // Host may have removed this player; send them back to join.
      if (!p.data.some((x) => x.id === m.playerId)) {
        clearMe(code);
        router.replace(`/?code=${code}`);
        return;
      }
      // Announce newcomers (not on first load, not myself).
      const fresh = p.data.filter((x) => known.current && !known.current.has(x.id) && x.id !== m.playerId);
      if (fresh.length) {
        const last = fresh[fresh.length - 1];
        setToast({ id: last.id, text: `${last.name} הגיע/ה!` });
        buzz(15);
      }
      known.current = new Set(p.data.map((x) => x.id));
    };
    load();

    // Realtime: refetch on any change in this room (tiny tables, simplest correct thing).
    const ch = supabase
      .channel(`room-${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cn_players", filter: `room_code=eq.${code}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "cn_couples", filter: `room_code=eq.${code}` }, load)
      .subscribe((s) => {
        if (s === "SUBSCRIBED") {
          setConn("live");
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
  }, [code, router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  function switchPlayer() {
    clearMe(code);
    router.replace(`/?code=${code}`);
  }

  if (!me) return null;
  const mine = couples.find((c) => c.id === me.coupleId);
  const count = players.length;

  return (
    <div className="flex flex-col gap-6 pt-2 pb-8">
      {toast && (
        <div
          key={toast.id}
          role="status"
          className="fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-20 mx-auto w-fit animate-pop rounded-full bg-party px-5 py-2.5 font-bold text-white shadow-xl shadow-pop/40"
        >
          <span className="flex items-center gap-2"><Sparkle className="size-5 animate-spin [animation-duration:3s]" />{toast.text}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="animate-rise rounded-full bg-white/10 px-3 py-1 text-sm text-mute">חדר {code}</span>
        <ConnDot conn={conn} />
      </div>

      <header className="-mt-2 text-center">
        <h1 className="animate-pop text-4xl font-black [animation-delay:100ms]">
          היי <span className="text-party">{me.name}</span>{" "}
          <Sparkle className="inline-block size-7 animate-wiggle align-[-2px] [animation-delay:700ms] [animation-iteration-count:3]" />
        </h1>
        {mine && (
          <p
            className={`mt-2 inline-flex animate-rise items-center gap-1 rounded-full px-3 py-1 font-bold [animation-delay:250ms] ${coupleTint[mine.idx]} ${coupleText[mine.idx]}`}
          >
            <CoupleIcon idx={mine.idx} className="size-5" /> {mine.name}
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
            <b className="text-ink">{count}</b>/{EXPECTED}
          </span>
        </div>
        <div className="h-2 animate-rise overflow-hidden rounded-full bg-white/10 [animation-delay:450ms]">
          <div
            className="h-full rounded-full bg-party transition-[width] duration-700 ease-out"
            style={{ width: `${Math.min(100, (count / EXPECTED) * 100)}%` }}
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
              <CoupleIcon idx={c.idx} className="size-7" />
              <span className={`font-bold ${coupleText[c.idx]}`}>{c.name}</span>
              <span className="mr-auto flex flex-wrap gap-1.5">
                {ps.length ? (
                  ps.map((p) => (
                    // key per player, so only newcomers pop in
                    <span
                      key={p.id}
                      className={`animate-pop rounded-full px-2.5 py-0.5 text-sm font-medium text-bg ${coupleBg[c.idx]} ${
                        p.id === me.playerId ? "outline-2 outline-offset-2 outline-white" : ""
                      }`}
                    >
                      {p.name}
                      {p.id === me.playerId && " (את/ה)"}
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
