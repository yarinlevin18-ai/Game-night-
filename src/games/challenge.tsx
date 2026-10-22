"use client";

import { challenges as bank } from "@/content/bank";
import { draw, type Ctx } from "@/lib/game";
import { Clock, PromptCard, useCountdown } from "@/components/ui";
import { Card } from "@/components/art";
import { CoupleAvatar } from "@/components/CoupleAvatar";
import { coupleText, coupleTint } from "@/lib/colors";
import type { GameDef } from "./types";

// A random dare for a random couple. Host gives points by hand.
const SECONDS = 60;

function Body(ctx: Ctx) {
  const c = ctx.couples.find((x) => x.id === ctx.round.prompt.coupleId);
  const left = useCountdown(SECONDS, ctx.round.phase === "guess" ? ctx.round.id : null, ctx.round.prompt.startedAt);
  return (
    <div className="flex flex-col gap-4">
      {c && (
        <div className={`mx-auto flex animate-pop items-center gap-2 rounded-full px-4 py-2 text-xl font-black ${coupleTint[c.idx]} ${coupleText[c.idx]}`}>
          <CoupleAvatar idx={c.idx} className="size-8" badge={false} />
          התור של {c.name}
        </div>
      )}
      <PromptCard kicker="אתגר">{ctx.round.prompt.text}</PromptCard>
      {ctx.round.phase === "guess" && <Clock left={left} total={SECONDS} />}
      {ctx.round.phase === "reveal" && <p className="text-center text-lg font-bold">המנחה מחליט/ה כמה זה שווה…</p>}
    </div>
  );
}

export const challenge: GameDef = {
  id: "challenge",
  title: "קלפי אתגר",
  blurb: "אתגר אקראי לזוג אקראי. המנחה שופט/ת",
  kind: "social",
  Icon: Card,
  start: (room) => ({ prompt: { text: draw("challenge", bank).item, coupleId: draw("challenge-couple", room.couples).item.id } }),
  flow: {
    open: { next: "guess", label: `הפעל טיימר (${SECONDS} שנ׳)` },
    guess: { next: "reveal", label: "סיימו" },
  },
  Player: Body,
  Host: Body,
};
