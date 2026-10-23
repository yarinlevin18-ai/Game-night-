"use client";

import { useState } from "react";
import type { Couple, Player } from "@/lib/supabase";
import { awardBets, scoreBets, setLocked, setResult, useBets } from "@/lib/bets";
import { props } from "@/content/props";
import { coupleText, coupleTint } from "@/lib/colors";
import { buzz } from "@/lib/ux";
import { Dice } from "./art";

// Host: share link, see who's in, lock, mark what happened, hand out points.
export function HostBets({ couples, players }: { couples: Couple[]; players: Player[] }) {
  const { bets, state } = useBets();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const bettors = new Set(bets.map((b) => b.player_id));
  const missing = players.filter((p) => !bettors.has(p.id));
  const url = typeof window !== "undefined" ? `${window.location.origin}/bets` : "/bets";
  const msg = `🎲 הימורי הערב פתוחים! המרו מי יגיע אחרון, מי יירדם ראשון ומי ינצח. כל הימור נכון = נקודות לזוג 👇\n${url}`;
  const resolvedCount = Object.keys(state.results).length;
  const { perCouple } = scoreBets(bets, state.results, players);

  const act = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    buzz(15);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  // Fill winner / last place from the current scoreboard.
  const autofill = () =>
    act(async () => {
      const ranked = [...couples].sort((a, b) => b.score - a.score);
      let r = state.results;
      if (ranked[0] && ranked[0].score !== ranked[1]?.score) {
        await setResult(r, "winner", ranked[0].id);
        r = { ...r, winner: ranked[0].id };
      }
      const last = ranked.at(-1);
      if (last && last.score !== ranked.at(-2)?.score) await setResult(r, "last", last.id);
    });

  return (
    <section className="card flex flex-col gap-3 rounded-2xl p-3">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-black">
          <Dice className="size-7" /> הימורי הערב
        </span>
        <span className="text-sm text-mute">
          {bettors.size}/{players.length} המרו · {state.awarded ? "חולק ✓" : state.locked ? "נעול" : "פתוח"} {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(msg)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-c4 py-2.5 text-center font-black text-bg active:scale-95"
            >
              שלח בוואטסאפ
            </a>
            <button
              onClick={() => {
                buzz(10);
                navigator.clipboard?.writeText(msg).catch(() => {});
              }}
              className="rounded-xl bg-white/10 py-2.5 font-black active:scale-95"
            >
              העתק קישור
            </button>
          </div>
          {missing.length > 0 && <p className="text-sm text-mute">עוד לא המרו: {missing.map((p) => p.name).join(", ")}</p>}

          <button
            disabled={busy || state.awarded}
            onClick={() => act(() => setLocked(!state.locked))}
            className={`rounded-xl py-2.5 font-black active:scale-95 disabled:opacity-40 ${state.locked ? "bg-white/10" : "bg-sun text-bg"}`}
          >
            {state.locked ? "פתח מחדש להימורים" : "נעל הימורים (לפני שמתחילים)"}
          </button>

          {state.locked && (
            <div className="flex flex-col gap-3 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between">
                <p className="font-black">מה קרה בפועל? ({resolvedCount}/{props.length})</p>
                <button onClick={autofill} disabled={busy || state.awarded} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold disabled:opacity-40">
                  מלא מנצחים לפי הטבלה
                </button>
              </div>
              {props.map((p) => {
                const opts =
                  p.kind === "player"
                    ? players.map((x) => ({ v: x.id, label: x.name, idx: couples.find((c) => c.id === x.couple_id)?.idx }))
                    : p.kind === "couple"
                      ? couples.map((c) => ({ v: c.id, label: c.name, idx: c.idx }))
                      : [
                          { v: "yes", label: "כן", idx: undefined },
                          { v: "no", label: "לא", idx: undefined },
                        ];
                return (
                  <div key={p.id} className="flex flex-col gap-1.5">
                    <p className="text-sm font-bold">{p.q}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {opts.map((o) => {
                        const on = state.results[p.id] === o.v;
                        return (
                          <button
                            key={o.v}
                            disabled={busy || state.awarded}
                            onClick={() => act(() => setResult(state.results, p.id, on ? null : o.v))}
                            className={`rounded-full px-2.5 py-1 text-xs font-black transition active:scale-95 disabled:opacity-60 ${
                              on ? "bg-c4 text-bg" : o.idx ? `${coupleTint[o.idx]} ${coupleText[o.idx]}` : "bg-white/10"
                            }`}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="rounded-xl bg-white/5 p-3">
                <p className="mb-1 text-sm font-bold">נקודות מההימורים:</p>
                <div className="flex flex-wrap gap-2">
                  {couples.map((c) => (
                    <span key={c.id} className={`rounded-full px-2.5 py-1 text-xs font-black ${coupleTint[c.idx]} ${coupleText[c.idx]}`}>
                      {c.name} <bdi dir="ltr">+{perCouple.get(c.id) ?? 0}</bdi>
                    </span>
                  ))}
                </div>
              </div>
              <button
                disabled={busy || state.awarded || resolvedCount === 0}
                onClick={() => act(() => awardBets(bets, state.results, players, couples))}
                className="rounded-xl bg-party py-3 text-lg font-black text-white shadow-lg shadow-pop/30 active:scale-95 disabled:opacity-40"
              >
                {state.awarded ? "✓ הנקודות חולקו" : "חשוף וחלק נקודות"}
              </button>
              <p className="text-center text-xs text-mute">רק את/ה רואה את הסימונים. אצל כולם התוצאות נחשפות כשלוחצים ״חשוף״. מומלץ בסוף הערב, לפני הפודיום</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
