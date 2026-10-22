"use client";

import { useState } from "react";
import type { Couple, Player } from "@/lib/supabase";
import { endGame, giveAwards, startRound, updateRound, type Answer, type Round } from "@/lib/game";
import { gameById, GAMES } from "@/games";
import type { GameDef } from "@/games/types";
import { coupleText, delay } from "@/lib/colors";
import { buzz } from "@/lib/ux";
import { supabase } from "@/lib/supabase";
import { Dice, Trophy } from "./art";

type RoomData = { couples: Couple[]; players: Player[]; online: Set<string> };

export function GamePicker({ room }: { room: RoomData }) {
  const [spinning, setSpinning] = useState<string | null>(null);

  async function go(g: GameDef) {
    buzz(20);
    const r = g.start(room);
    await startRound(g.id, r.prompt, r.subject ?? null, r.phase ?? "open");
  }

  // Flick through the games for a second, then land on one.
  function random() {
    if (spinning) return;
    const order = GAMES.filter((g) => g.kind !== "finale").sort(() => Math.random() - 0.5);
    let i = 0;
    const id = setInterval(() => {
      setSpinning(order[i % order.length].id);
      buzz(5);
      i++;
      if (i > 14) {
        clearInterval(id);
        const g = order[(i - 1) % order.length];
        setTimeout(() => {
          setSpinning(null);
          go(g);
        }, 600);
      }
    }, 90);
  }

  const section = (kind: GameDef["kind"], title: string) => (
    <section className="flex flex-col gap-2">
      <h2 className="font-bold">{title}</h2>
      <div className="grid grid-cols-2 gap-2">
        {GAMES.filter((g) => g.kind === kind).map((g, i) => (
          <button
            key={g.id}
            onClick={() => go(g)}
            className={`card flex animate-pop flex-col items-start gap-1 rounded-2xl p-3 text-right transition active:scale-95 ${
              spinning === g.id ? "scale-105 ring-4 ring-sun" : ""
            }`}
            style={delay(i, 50)}
          >
            <g.Icon className="size-9" />
            <span className="font-black">{g.title}</span>
            <span className="text-xs leading-tight text-mute">{g.blurb}</span>
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={random}
        className="flex items-center justify-center gap-3 rounded-2xl bg-party py-4 text-2xl font-black text-white shadow-lg shadow-pop/30 active:scale-95"
      >
        <Dice className={`size-9 ${spinning ? "animate-spin" : ""}`} />
        משחק אקראי
      </button>
      {section("social", "משחקים חברתיים")}
      {section("mini", "מיני משחקים")}
      <button
        onClick={() => go(GAMES.find((g) => g.kind === "finale")!)}
        className="mt-2 flex items-center justify-center gap-3 rounded-2xl border-2 border-sun/60 bg-sun/10 py-4 text-xl font-black text-sun active:scale-95"
      >
        <Trophy className="size-8" />
        סיום הערב: פודיום
      </button>
    </div>
  );
}

export function HostGame({ round, answers, room }: { round: Round; answers: Answer[]; room: RoomData }) {
  const def = gameById(round.game);
  const [busy, setBusy] = useState(false);
  if (!def) return null;
  const ctx = { round, answers, ...room };
  const step = def.flow[round.phase];
  const canStep = step && (!step.ready || step.ready(ctx));
  const awards = round.phase === "reveal" && def.score ? def.score(ctx) : [];
  const awarded = !!round.prompt.awarded;
  const name = (id: string) => room.couples.find((c) => c.id === id);

  const act = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    buzz(15);
    await fn();
    setBusy(false);
  };
  const next = () => act(async () => {
    const r = def.start(room);
    await startRound(def.id, r.prompt, r.subject ?? null, r.phase ?? "open");
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xl font-black">
          <def.Icon className="size-8" /> {def.title}
        </span>
        <button onClick={() => act(endGame)} className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold active:scale-95">
          ✕ לתפריט
        </button>
      </div>

      <def.Host {...ctx} />

      {step && (
        <button
          disabled={!canStep || busy}
          onClick={() => act(() => updateRound(round.id, { phase: step.next }))}
          className="rounded-2xl bg-party py-4 text-2xl font-black text-white shadow-lg shadow-pop/30 transition active:scale-95 disabled:opacity-40"
        >
          {step.label}
        </button>
      )}

      {round.phase === "reveal" && def.kind !== "finale" && (
        <div className="card flex animate-rise flex-col gap-2 rounded-2xl p-4">
          {def.score ? (
            <>
              <p className="font-bold">נקודות לסיבוב:</p>
              {awards.length === 0 && <p className="text-sm text-mute">אף אחד לא קיבל נקודות הפעם</p>}
              {awards.map((a) => {
                const c = name(a.coupleId);
                return (
                  <p key={a.coupleId} className="flex justify-between text-lg">
                    <span className={c ? coupleText[c.idx] : ""}>{c?.name}</span>
                    <b className="text-c4" dir="ltr">
                      +{a.delta}
                    </b>
                  </p>
                );
              })}
              {awards.length > 0 && (
                <button
                  disabled={awarded || busy}
                  onClick={() => act(() => giveAwards(round.id, round.prompt, awards))}
                  className="mt-1 rounded-xl bg-c4 py-3 text-xl font-black text-bg transition active:scale-95 disabled:opacity-40"
                >
                  {awarded ? "✓ חולק" : "חלק נקודות"}
                </button>
              )}
            </>
          ) : (
            <ManualAward round={round} couple={name(round.prompt.coupleId)} />
          )}
        </div>
      )}

      <div className={`grid grid-cols-2 gap-2 ${def.kind === "finale" ? "hidden" : ""}`}>
        <button onClick={next} disabled={busy} className="rounded-2xl bg-white/10 py-3 font-black active:scale-95">
          {round.phase === "reveal" ? "סיבוב הבא ←" : "דלג על הסיבוב"}
        </button>
        <button onClick={() => act(endGame)} disabled={busy} className="rounded-2xl bg-white/5 py-3 font-bold text-mute active:scale-95">
          משחק אחר
        </button>
      </div>
    </div>
  );
}

function ManualAward({ round, couple }: { round: Round; couple?: Couple }) {
  const [given, setGiven] = useState<number | null>(round.prompt.awarded ? -1 : null);
  if (!couple) return null;
  return (
    <>
      <p className="font-bold">
        כמה נקודות ל<span className={coupleText[couple.idx]}>{couple.name}</span>?
      </p>
      <div className="flex gap-2" dir="ltr">
        {[0, 1, 2, 3, 5].map((d) => (
          <button
            key={d}
            disabled={given !== null}
            onClick={async () => {
              setGiven(d);
              buzz(15);
              if (d) await supabase.rpc("cn_award", { p_couple: couple.id, p_delta: d, p_reason: "אתגר" });
              await updateRound(round.id, { prompt: { ...round.prompt, awarded: true } });
            }}
            className={`flex-1 rounded-xl py-3 text-lg font-black transition active:scale-90 disabled:opacity-40 ${given === d ? "bg-c4 text-bg" : "bg-black/25"}`}
          >
            {d ? `+${d}` : "0"}
          </button>
        ))}
      </div>
    </>
  );
}
