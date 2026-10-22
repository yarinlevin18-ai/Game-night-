"use client";

import { useState } from "react";
import { imposter as bank } from "@/content/bank";
import { byKind, coupleOf, draw, mineOf, pick, playerName, submit, updateRound, type Ctx } from "@/lib/game";
import { Bars, coupleColor, PlayerPicker, PromptCard, Waiting } from "@/components/ui";
import { Glass } from "@/components/art";
import { buzz } from "@/lib/ux";
import { Progress } from "./likely";
import { merge, type GameDef } from "./types";

// Everyone sees the word except the imposter, who only sees the category.
// Round of one-word clues out loud, then a phone vote.
//  caught  -> everyone who voted for the imposter: +1 to their couple
//  escaped -> imposter's couple: +3
//  imposter guesses the word (host marks it) -> +2 to imposter's couple
function tally(ctx: Ctx) {
  const votes = byKind(ctx.answers, "vote");
  const count = new Map<string, number>();
  for (const v of votes) count.set(v.value, (count.get(v.value) ?? 0) + 1);
  const max = Math.max(0, ...count.values());
  const top = [...count].filter(([, n]) => n === max && max > 0).map(([id]) => id);
  // Caught only if the imposter is the single most-voted player.
  const caught = top.length === 1 && top[0] === ctx.round.subject_player_id;
  return { votes, count, caught };
}

function SecretCard(ctx: Ctx) {
  const [open, setOpen] = useState(false);
  const isImposter = ctx.meId === ctx.round.subject_player_id;
  const { word, cat } = ctx.round.prompt;
  return (
    <button
      onPointerDown={() => {
        setOpen(true);
        buzz(15);
      }}
      onPointerUp={() => setOpen(false)}
      onPointerLeave={() => setOpen(false)}
      className={`flex min-h-56 w-full select-none flex-col items-center justify-center gap-2 rounded-3xl p-6 text-center transition ${
        open ? (isImposter ? "bg-pop text-white" : "bg-sun text-bg") : "card"
      }`}
    >
      {open ? (
        isImposter ? (
          <>
            <span className="text-4xl font-black">את/ה המתחזה! 🕵️</span>
            <span className="text-lg font-bold">הקטגוריה: {cat}</span>
            <span className="text-sm">תזייף/י, ואל תיתפס/י</span>
          </>
        ) : (
          <>
            <span className="text-sm font-bold">המילה הסודית</span>
            <span className="text-5xl font-black">{word}</span>
            <span className="text-sm font-bold">({cat})</span>
          </>
        )
      ) : (
        <>
          <Glass className="size-14" />
          <span className="text-xl font-black">לחצו והחזיקו כדי לראות</span>
          <span className="text-sm text-mute">ותסתירו את המסך מהשכנים 👀</span>
        </>
      )}
    </button>
  );
}

function Reveal(ctx: Ctx) {
  const { count, caught } = tally(ctx);
  const imp = ctx.round.subject_player_id;
  const rows = ctx.players
    .filter((p) => count.has(p.id))
    .map((p) => ({ key: p.id, label: p.name, n: count.get(p.id) ?? 0, color: coupleColor(ctx.couples, p.couple_id), mark: p.id === imp }));
  return (
    <div className="flex flex-col gap-4">
      <div className={`animate-pop rounded-3xl py-5 text-center ${caught ? "bg-c4 text-bg" : "bg-pop text-white"}`}>
        <p className="text-sm font-bold">המתחזה היה/הייתה</p>
        <p className="text-4xl font-black">{playerName(ctx, imp)}</p>
        <p className="mt-1 font-bold">{caught ? "נתפס/ה! 🚨" : "ברח/ה! 😈"}</p>
      </div>
      <p className="text-center text-lg">
        המילה הייתה: <b className="text-sun">{ctx.round.prompt.word}</b>
      </p>
      <Bars rows={rows} />
      {ctx.round.prompt.guessed && <p className="animate-pop text-center font-black text-sun">המתחזה ניחש/ה את המילה! +2</p>}
    </div>
  );
}

export const imposterGame: GameDef = {
  id: "imposter",
  title: "המתחזה",
  blurb: "לכולם יש מילה סודית, חוץ מאחד. כל אחד אומר מילה אחת, ואז מצביעים מי מזייף",
  kind: "social",
  Icon: Glass,
  start: (room) => {
    const w = draw("imposter", bank).item;
    const imp = draw("imposter-subject", room.players).item;
    return { prompt: { word: w.word, cat: w.cat, first: pick(room.players).id }, subject: imp.id };
  },
  flow: {
    open: { next: "guess", label: "לפתוח הצבעה" },
    guess: { next: "reveal", label: "מי המתחזה? חשוף!" },
  },
  score: (ctx) => {
    const { votes, caught } = tally(ctx);
    const imp = ctx.round.subject_player_id;
    const impCouple = coupleOf(ctx, imp)?.id ?? "";
    const out = caught
      ? votes.filter((v) => v.value === imp).map((v) => ({ coupleId: coupleOf(ctx, v.player_id)?.id ?? "", delta: 1, reason: "המתחזה: תפסו" }))
      : [{ coupleId: impCouple, delta: 3, reason: "המתחזה: ברח" }];
    if (ctx.round.prompt.guessed) out.push({ coupleId: impCouple, delta: 2, reason: "המתחזה: ניחש מילה" });
    return merge(out.filter((a) => a.coupleId));
  },
  Player: (ctx) => {
    const first = playerName(ctx, ctx.round.prompt.first);
    if (ctx.round.phase === "reveal") return <Reveal {...ctx} />;
    if (ctx.round.phase === "open")
      return (
        <div className="flex flex-col gap-4">
          <SecretCard {...ctx} />
          <PromptCard kicker="סבב רמזים">
            כל אחד אומר מילה אחת. מתחילים מ<span className="text-sun">{first}</span>
          </PromptCard>
        </div>
      );
    const mine = mineOf(ctx.answers, ctx.meId, "vote");
    return (
      <div className="flex flex-col gap-4">
        <PromptCard kicker="הצבעה">מי המתחזה?</PromptCard>
        {mine ? (
          <Waiting text={`הצבעת: ${playerName(ctx, mine.value)}`} />
        ) : (
          <PlayerPicker players={ctx.players} couples={ctx.couples} exclude={ctx.meId ? [ctx.meId] : []} onPick={(id) => submit(ctx.round.id, ctx.meId!, "vote", id)} />
        )}
      </div>
    );
  },
  Host: (ctx) => {
    if (ctx.round.phase === "reveal") return <Reveal {...ctx} />;
    return (
      <div className="flex flex-col gap-4">
        <PromptCard kicker="המילה והמתחזה מוסתרים, גם ממך 😉">
          מתחילים מ<span className="text-sun">{playerName(ctx, ctx.round.prompt.first)}</span>
        </PromptCard>
        {ctx.round.phase === "open" ? (
          <p className="text-center font-bold">כשכולם אמרו מילה, פתחו הצבעה</p>
        ) : (
          <Progress n={byKind(ctx.answers, "vote").length} of={ctx.players.length} />
        )}
      </div>
    );
  },
  Controls: (ctx) => {
    if (ctx.round.phase !== "reveal" || ctx.round.prompt.awarded) return null;
    return (
            <button
              onClick={() => updateRound(ctx.round.id, { prompt: { ...ctx.round.prompt, guessed: !ctx.round.prompt.guessed } })}
              className={`rounded-2xl py-3 font-black active:scale-95 ${ctx.round.prompt.guessed ? "bg-sun text-bg" : "bg-white/10"}`}
            >
              {ctx.round.prompt.guessed ? "✓ המתחזה ניחש/ה את המילה (+2)" : "המתחזה ניחש/ה את המילה?"}
            </button>
    );
  },
};
