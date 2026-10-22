"use client";

import { useMemo } from "react";
import { trivia as bank } from "@/content/bank";
import { byKind, coupleOf, draw, mineOf, shuffle, submit, type Ctx } from "@/lib/game";
import { Options, PromptCard, Waiting } from "@/components/ui";
import { Bolt } from "@/components/art";
import { getTeams, TEAM_META, teamOfCouple, type TeamId, type Teams } from "@/lib/teams";
import { Progress } from "./likely";
import type { GameDef } from "./types";

// Mixed teams (two couples each). Everyone answers on their own phone.
// The team with more correct answers takes the question: +2 to each of its couples. Tie: +1 to everyone.
function tally(ctx: Ctx) {
  const teams = ctx.round.prompt.teams as Teams;
  const right = ctx.round.prompt.answer as string;
  const n: Record<TeamId, number> = { A: 0, B: 0 };
  for (const a of byKind(ctx.answers, "ans")) {
    const t = teamOfCouple(teams, coupleOf(ctx, a.player_id)?.id);
    if (t && a.value === right) n[t]++;
  }
  const winner: TeamId | "tie" | null = n.A === n.B ? (n.A > 0 ? "tie" : null) : n.A > n.B ? "A" : "B";
  return { teams, n, winner };
}

function TeamsBar(ctx: Ctx) {
  const { teams, n } = tally(ctx);
  const reveal = ctx.round.phase === "reveal";
  return (
    <div className="grid grid-cols-2 gap-2">
      {(["A", "B"] as TeamId[]).map((t) => (
        <div key={t} className={`rounded-2xl p-3 text-center ${TEAM_META[t].tint}`}>
          <p className={`font-black ${TEAM_META[t].text}`}>{TEAM_META[t].name}</p>
          <p className="text-xs text-mute">{teams[t].map((id) => ctx.couples.find((c) => c.id === id)?.name).join(" + ")}</p>
          {reveal && <p className="mt-1 animate-pop text-3xl font-black">{n[t]} ✓</p>}
        </div>
      ))}
    </div>
  );
}

function Body(ctx: Ctx) {
  const { q, options, answer } = ctx.round.prompt as { q: string; options: string[]; answer: string };
  const mine = mineOf(ctx.answers, ctx.meId, "ans");
  const myTeam = teamOfCouple(ctx.round.prompt.teams, coupleOf(ctx, ctx.meId)?.id);
  const order = useMemo(() => options, [options]);
  if (ctx.round.phase === "reveal") {
    const { winner } = tally(ctx);
    return (
      <div className="flex flex-col gap-4">
        <PromptCard>{q}</PromptCard>
        <Options options={order} correct={answer} />
        <TeamsBar {...ctx} />
        <p className="animate-pop text-center text-2xl font-black">
          {winner === "tie" ? "תיקו!" : winner ? `${TEAM_META[winner].name} לוקחת!` : "אף אחד לא ידע 😅"}
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <TeamsBar {...ctx} />
      <PromptCard kicker={myTeam ? `את/ה ב${TEAM_META[myTeam].name}` : "טריוויה קבוצות"}>{q}</PromptCard>
      {ctx.meId ? mine ? <Waiting /> : <Options options={order} onPick={(o) => submit(ctx.round.id, ctx.meId!, "ans", o)} /> : null}
      {!ctx.meId && <Progress n={byKind(ctx.answers, "ans").length} of={ctx.players.length} label="ענו" />}
    </div>
  );
}

export const teamTrivia: GameDef = {
  id: "team-trivia",
  title: "טריוויה קבוצות",
  blurb: "קבוצות מעורבבות. כולם עונים, הקבוצה עם יותר תשובות נכונות לוקחת",
  kind: "team",
  Icon: Bolt,
  start: (room) => {
    const t = draw("trivia", bank).item;
    return { prompt: { q: t.q, options: shuffle(t.options), answer: t.options[0], teams: getTeams(room.couples) } };
  },
  flow: { open: { next: "reveal", label: "חשוף תשובה" } },
  score: (ctx) => {
    const { teams, winner } = tally(ctx);
    if (!winner) return [];
    if (winner === "tie") return [...teams.A, ...teams.B].map((coupleId) => ({ coupleId, delta: 1, reason: "טריוויה: תיקו" }));
    return teams[winner].map((coupleId) => ({ coupleId, delta: 2, reason: "טריוויה קבוצות" }));
  },
  Player: Body,
  Host: Body,
};
