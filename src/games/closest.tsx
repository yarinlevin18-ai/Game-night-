"use client";

import { closest as bank } from "@/content/bank";
import { byKind, coupleOf, draw, mineOf, playerName, submit, updateRound, type Ctx } from "@/lib/game";
import { coupleColor, NumberPad, PromptCard, Waiting } from "@/components/ui";
import { Trophy } from "@/components/art";
import { Progress } from "./likely";
import { merge, type GameDef } from "./types";

// Everyone guesses a number. Closest three players: +3/+2/+1.
// Questions about the group have no answer in the bank; the host types it in.
function ranked(ctx: Ctx) {
  const ans = ctx.round.prompt.answer as number | null;
  if (ans === null || ans === undefined) return [];
  return byKind(ctx.answers, "num")
    .map((a) => ({ id: a.player_id, v: Number(a.value), d: Math.abs(Number(a.value) - ans) }))
    .sort((a, b) => a.d - b.d);
}

function Board(ctx: Ctx) {
  const { answer, unit } = ctx.round.prompt;
  return (
    <div className="flex flex-col gap-3">
      <div className="animate-pop rounded-3xl bg-sun py-5 text-center text-bg">
        <p className="text-sm font-bold">התשובה</p>
        <p className="text-5xl font-black tabular-nums">
          {answer?.toLocaleString("he-IL")} <span className="text-xl">{unit}</span>
        </p>
      </div>
      {ranked(ctx).map((r, i) => (
        <div key={r.id} className={`flex animate-rise items-center justify-between rounded-2xl px-4 py-3 font-black text-bg ${coupleColor(ctx.couples, coupleOf(ctx, r.id)?.id)}`} style={{ animationDelay: `${i * 120}ms` }}>
          <span>
            {i + 1}. {playerName(ctx, r.id)}
          </span>
          <span className="tabular-nums">{r.v.toLocaleString("he-IL")}</span>
        </div>
      ))}
    </div>
  );
}

export const closest: GameDef = {
  id: "closest",
  title: "הכי קרוב מנצח",
  blurb: "שאלה עם מספר. מי שהכי קרוב מנצח",
  kind: "mini",
  Icon: Trophy,
  start: () => {
    const q = draw("closest", bank).item;
    return { prompt: { q: q.q, answer: q.answer, unit: q.unit ?? "" } };
  },
  flow: {
    open: { next: "reveal", label: "חשוף", ready: (ctx) => ctx.round.prompt.answer !== null && ctx.round.prompt.answer !== undefined },
  },
  score: (ctx) =>
    merge(
      ranked(ctx)
        .slice(0, 3)
        .map((r, i) => ({ coupleId: coupleOf(ctx, r.id)?.id ?? "", delta: 3 - i, reason: "הכי קרוב" }))
        .filter((a) => a.coupleId),
    ),
  // Group questions have no stored answer: the host types it (after guessing, if playing).
  Controls: (ctx) => {
    const { answer, unit } = ctx.round.prompt;
    if (ctx.round.phase !== "open" || (answer !== null && answer !== undefined)) return null;
    return (
      <div className="card flex flex-col gap-2 rounded-2xl p-3">
        <p className="text-center font-bold text-sun">מנחה: הקלד/י את התשובה הנכונה</p>
        <NumberPad unit={unit} onSubmit={(n) => updateRound(ctx.round.id, { prompt: { ...ctx.round.prompt, answer: n } })} />
      </div>
    );
  },
  Player: (ctx) => {
    const { q, unit } = ctx.round.prompt;
    if (ctx.round.phase === "reveal")
      return (
        <div className="flex flex-col gap-4">
          <PromptCard>{q}</PromptCard>
          <Board {...ctx} />
        </div>
      );
    const mine = mineOf(ctx.answers, ctx.meId, "num");
    return (
      <div className="flex flex-col gap-4">
        <PromptCard kicker="הכי קרוב מנצח">{q}</PromptCard>
        {mine ? <Waiting text={`ניחשת ${Number(mine.value).toLocaleString("he-IL")}`} /> : <NumberPad unit={unit} onSubmit={(n) => submit(ctx.round.id, ctx.meId!, "num", String(n))} />}
      </div>
    );
  },
  Host: (ctx) => {
    const { q } = ctx.round.prompt;
    if (ctx.round.phase === "reveal") return <Board {...ctx} />;
    return (
      <div className="flex flex-col gap-4">
        <PromptCard>{q}</PromptCard>
        <Progress n={byKind(ctx.answers, "num").length} of={ctx.players.length} label="ניחשו" />
      </div>
    );
  },
};
