"use client";

import { likely as bank } from "@/content/bank";
import { byKind, coupleOf, draw, mineOf, playerName, submit, type Ctx } from "@/lib/game";
import { Bars, coupleColor, PlayerPicker, PromptCard, Waiting } from "@/components/ui";
import { Heart } from "@/components/art";
import { merge, type GameDef } from "./types";

// Vote for who fits. Everyone who picked the crowd's top choice gets +1 for their couple.
function tally(ctx: Ctx) {
  const votes = byKind(ctx.answers, "vote");
  const count = new Map<string, number>();
  for (const v of votes) count.set(v.value, (count.get(v.value) ?? 0) + 1);
  const max = Math.max(0, ...count.values());
  const top = new Set([...count].filter(([, n]) => n === max && max >= 2).map(([id]) => id));
  return { votes, count, top };
}

function Results(ctx: Ctx) {
  const { count, top } = tally(ctx);
  const rows = ctx.players
    .filter((p) => count.has(p.id))
    .map((p) => ({ key: p.id, label: p.name, n: count.get(p.id) ?? 0, color: coupleColor(ctx.couples, p.couple_id), mark: top.has(p.id) }));
  return (
    <div className="flex flex-col gap-3">
      <Bars rows={rows} />
      <p className="text-center text-sm text-mute">מי שהצביע כמו הרוב מקבל/ת +1 לזוג</p>
    </div>
  );
}

export const likely: GameDef = {
  id: "likely",
  title: "מי הכי סביר ש...",
  blurb: "כולם מצביעים. מי שהצביע כמו הרוב מרוויח נקודה",
  kind: "social",
  Icon: Heart,
  start: () => ({ prompt: { q: draw("likely", bank).item } }),
  flow: { open: { next: "reveal", label: "חשוף תוצאות" } },
  score: (ctx) => {
    const { votes, top } = tally(ctx);
    return merge(
      votes
        .filter((v) => top.has(v.value))
        .map((v) => ({ coupleId: coupleOf(ctx, v.player_id)?.id ?? "", delta: 1, reason: "מי הכי סביר" }))
        .filter((a) => a.coupleId),
    );
  },
  Player: (ctx) => {
    const mine = mineOf(ctx.answers, ctx.meId, "vote");
    if (ctx.round.phase === "reveal") {
      const { top } = tally(ctx);
      return (
        <div className="flex flex-col gap-4">
          <PromptCard>{ctx.round.prompt.q}</PromptCard>
          <Results {...ctx} />
          {mine && (
            <p className={`text-center text-lg font-black ${top.has(mine.value) ? "text-c4" : "text-pop"}`}>
              {top.has(mine.value) ? "הצבעת כמו הרוב! +1" : `הצבעת ל${playerName(ctx, mine.value)}. לא הפעם`}
            </p>
          )}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <PromptCard kicker="מי הכי סביר ש...">{ctx.round.prompt.q}</PromptCard>
        {mine ? (
          <Waiting text={`הצבעת ל${playerName(ctx, mine.value)}`} />
        ) : (
          <PlayerPicker
            players={ctx.players}
            couples={ctx.couples}
            exclude={ctx.meId ? [ctx.meId] : []}
            onPick={(id) => submit(ctx.round.id, ctx.meId!, "vote", id)}
          />
        )}
      </div>
    );
  },
  Host: (ctx) => (
    <div className="flex flex-col gap-4">
      <PromptCard>{ctx.round.prompt.q}</PromptCard>
      {ctx.round.phase === "reveal" ? <Results {...ctx} /> : <Progress n={byKind(ctx.answers, "vote").length} of={ctx.players.length} />}
    </div>
  ),
};

export function Progress({ n, of, label = "הצביעו" }: { n: number; of: number; label?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-center text-lg font-bold">
        {n}/{of} {label}
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-party transition-[width] duration-500" style={{ width: `${(n / Math.max(1, of)) * 100}%` }} />
      </div>
    </div>
  );
}
