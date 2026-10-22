"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, clearMe, type Me } from "@/lib/session";
import { ROOM } from "@/lib/room";
import { coupleBg, coupleBorder, coupleText, coupleTint, delay } from "@/lib/colors";
import { buzz } from "@/lib/ux";
import { Hourglass, Sparkle } from "@/components/art";
import { CoupleAvatar } from "@/components/CoupleAvatar";
import { Scoreboard } from "@/components/Scoreboard";
import { useRoom, type Conn } from "@/lib/useRoom";
import { useGame } from "@/lib/game";
import { play } from "@/lib/sound";
import { SoundToggle } from "@/components/SoundToggle";
import { gameById } from "@/games";

export default function Play() {
  const router = useRouter();
  const [me, setMeState] = useState<Me | null>(null);
  const [toast, setToast] = useState<{ id: string; text: string } | null>(null);
  const { couples, players, online, conn, loaded } = useRoom({
    presenceKey: me?.playerId,
    enabled: !!me,
    onJoin: (p) => {
      setToast({ id: `${p.id}-${Date.now()}`, text: `${p.name} הגיע/ה!` });
      buzz(15);
    },
  });

  const { round, answers } = useGame();

  // Sound cues: new round, reveal, my couple scoring.
  const seen = useRef<{ round?: string | null; phase?: string; score?: number }>({});
  useEffect(() => {
    const s = seen.current;
    const id = round?.id ?? null;
    if (s.round !== undefined && id && id !== s.round) play("whoosh");
    else if (id && id === s.round && round?.phase === "reveal" && s.phase !== "reveal" && round.game !== "finale") play("reveal");
    s.round = id;
    s.phase = round?.phase;
  }, [round?.id, round?.phase, round?.game]);
  const myScore = couples.find((c) => c.id === me?.coupleId)?.score;
  useEffect(() => {
    const s = seen.current;
    if (myScore !== undefined && s.score !== undefined && myScore > s.score) play("ding");
    s.score = myScore;
  }, [myScore]);

  useEffect(() => {
    const m = getMe(ROOM);
    if (!m) router.replace("/");
    else setMeState(m);
  }, [router]);

  // Player was removed; back to the name picker.
  useEffect(() => {
    if (me && loaded && players.length && !players.some((x) => x.id === me.playerId)) {
      clearMe(ROOM);
      router.replace("/");
    }
  }, [me, loaded, players, router]);

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

  const def = round ? gameById(round.game) : undefined;
  if (round && def) {
    return (
      <div className="flex flex-col gap-4 pt-1 pb-10">
        <div className="flex items-center justify-between">
          <span className="flex animate-rise items-center gap-2 text-lg font-black">
            <def.Icon className="size-7" />
            {def.title}
          </span>
          <span className="flex items-center gap-2">
            {mine && (
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${coupleTint[mine.idx]} ${coupleText[mine.idx]}`}>
                <CoupleAvatar idx={mine.idx} className="size-5" badge={false} />
                <span dir="ltr">{mine.score}</span>
              </span>
            )}
            <SoundToggle />
          </span>
        </div>
        <def.Player key={round.id} round={round} answers={answers} couples={couples} players={players} online={online} meId={me.playerId} />
        {round.phase === "reveal" && def.kind !== "finale" && (
          <section className="mt-2 flex animate-rise flex-col gap-2 [animation-delay:600ms]">
            <h2 className="font-bold">טבלת הניקוד</h2>
            <Scoreboard couples={couples} mineId={me.coupleId} />
          </section>
        )}
        {conn !== "live" && <p className="text-center text-xs text-pop">מתחבר מחדש…</p>}
      </div>
    );
  }
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
        <span className="flex items-center gap-3">
          <ConnDot conn={conn} />
          <SoundToggle />
        </span>
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

      <section className="flex animate-rise flex-col gap-2 [animation-delay:300ms]">
        <h2 className="font-bold">טבלת הניקוד</h2>
        <Scoreboard couples={couples} mineId={me.coupleId} />
      </section>

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
