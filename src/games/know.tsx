"use client";

import { know as bank } from "@/content/bank";
import { byKind, coupleOf, draw, mineOf, playerName, submit, type Ctx } from "@/lib/game";
import { Options, PromptCard, Waiting } from "@/components/ui";
import { Dice } from "@/components/art";
import { Progress } from "./likely";
import { merge, type GameDef } from "./types";

// The subject answers about themselves in secret; everyone guesses.
// Partner right = +2, anyone else right = +1 (to the guesser's couple).
function truthOf(ctx: Ctx) {
  return byKind(ctx.answers, "truth")[0]?.value;
}

export const know: GameDef = {
  id: "know",
  title: "כמה אתם מכירים?",
  blurb: "מישהו עונה על עצמו בסוד, כולם מנחשים. בן/בת הזוג מקבלים 2 נקודות על תשובה נכונה",
  kind: "social",
  Icon: Dice,
  start: (room) => {
    const subject = draw("know-subject", room.players).item;
    const q = draw("know", bank).item;
    return { prompt: { q: q.q.replaceAll("{name}", subject.name), options: q.options }, subject: subject.id };
  },
  flow: { open: { next: "reveal", label: "חשוף תשובה", ready: (ctx) => !!truthOf(ctx) } },
  score: (ctx) => {
    const truth = truthOf(ctx);
    const subjCouple = coupleOf(ctx, ctx.round.subject_player_id)?.id;
    return merge(
      byKind(ctx.answers, "guess")
        .filter((g) => g.value === truth)
        .map((g) => {
          const c = coupleOf(ctx, g.player_id)?.id ?? "";
          return { coupleId: c, delta: c === subjCouple ? 2 : 1, reason: "כמה אתם מכירים" };
        })
        .filter((a) => a.coupleId),
    );
  },
  Player: (ctx) => {
    const { q, options } = ctx.round.prompt;
    const isSubject = ctx.meId === ctx.round.subject_player_id;
    const kind = isSubject ? "truth" : "guess";
    const mine = mineOf(ctx.answers, ctx.meId, kind);
    if (ctx.round.phase === "reveal") {
      const truth = truthOf(ctx);
      const right = byKind(ctx.answers, "guess").filter((g) => g.value === truth);
      return (
        <div className="flex flex-col gap-4">
          <PromptCard>{q}</PromptCard>
          <Options options={options} correct={truth} />
          <p className="text-center font-bold">
            {right.length ? `צדקו: ${right.map((g) => playerName(ctx, g.player_id)).join(", ")}` : "אף אחד לא צדק 😅"}
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <PromptCard kicker={isSubject ? "ענו בכנות. אף אחד לא רואה 🤫" : `נחשו מה ${playerName(ctx, ctx.round.subject_player_id)} ענה/תה`}>{q}</PromptCard>
        {mine ? <Waiting /> : <Options options={options} onPick={(o) => submit(ctx.round.id, ctx.meId!, kind, o)} />}
      </div>
    );
  },
  Host: (ctx) => {
    const truth = truthOf(ctx);
    return (
      <div className="flex flex-col gap-4">
        <PromptCard kicker={`על ${playerName(ctx, ctx.round.subject_player_id)}`}>{ctx.round.prompt.q}</PromptCard>
        {ctx.round.phase === "reveal" ? (
          <Options options={ctx.round.prompt.options} correct={truth} />
        ) : (
          <>
            <p className="text-center font-bold">{truth ? "✓ התשובה הסודית התקבלה" : `מחכים ש${playerName(ctx, ctx.round.subject_player_id)} יענה/תענה…`}</p>
            <Progress n={byKind(ctx.answers, "guess").length} of={ctx.players.length - 1} label="ניחשו" />
          </>
        )}
      </div>
    );
  },
};
