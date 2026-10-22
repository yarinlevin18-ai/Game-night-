"use client";

import { useEffect, useRef, useState } from "react";
import { byKind, coupleOf, mineOf, playerName, submit, type Ctx } from "@/lib/game";
import { coupleColor, Hold, PromptCard } from "@/components/ui";
import { Bolt } from "@/components/art";
import { buzz } from "@/lib/ux";
import { play } from "@/lib/sound";
import { Progress } from "./likely";
import { merge, type GameDef } from "./types";

// Reaction test. Each phone times itself from the moment it turns green,
// so network lag doesn't matter. Tapping early = out. Top 3 players: +3/+2/+1.
const EARLY = "early";

function results(ctx: Ctx) {
  return byKind(ctx.answers, "tap")
    .filter((a) => a.value !== EARLY)
    .map((a) => ({ id: a.player_id, ms: Number(a.value) }))
    .sort((a, b) => a.ms - b.ms);
}

function Arena(ctx: Ctx) {
  const mine = mineOf(ctx.answers, ctx.meId, "tap");
  const [green, setGreen] = useState(false);
  const greenAt = useRef(0);

  useEffect(() => {
    setGreen(false);
    if (mine) return;
    const t = setTimeout(() => {
      greenAt.current = performance.now();
      setGreen(true);
      buzz(30);
      play("go");
    }, ctx.round.prompt.delay ?? 3000);
    return () => clearTimeout(t);
    // Restart only when a new round goes live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.round.id]);

  function tap() {
    if (mine) return;
    const v = green ? String(Math.round(performance.now() - greenAt.current)) : EARLY;
    buzz(green ? 15 : 80);
    submit(ctx.round.id, ctx.meId!, "tap", v);
  }

  if (mine)
    return (
      <div className="flex animate-pop flex-col items-center gap-2 py-10 text-center">
        {mine.value === EARLY ? (
          <p className="text-4xl font-black text-pop">מוקדם מדי! 🙈</p>
        ) : (
          <>
            <p className="text-6xl font-black tabular-nums">{mine.value}</p>
            <p className="text-lg text-mute">מילישניות</p>
          </>
        )}
      </div>
    );

  return (
    <button
      onPointerDown={tap}
      className={`flex h-[60dvh] w-full select-none items-center justify-center rounded-3xl text-4xl font-black transition-colors duration-75 ${
        green ? "bg-c4 text-bg" : "bg-pop/80 text-white"
      }`}
    >
      {green ? "עכשיו!!!" : "חכו לירוק…"}
    </button>
  );
}

function Board(ctx: Ctx) {
  const rs = results(ctx);
  const early = byKind(ctx.answers, "tap").filter((a) => a.value === EARLY);
  return (
    <div className="flex flex-col gap-2">
      {rs.map((r, i) => (
        <div key={r.id} className={`flex animate-rise items-center justify-between rounded-2xl px-4 py-3 font-black text-bg ${coupleColor(ctx.couples, coupleOf(ctx, r.id)?.id)}`} style={{ animationDelay: `${i * 120}ms` }}>
          <span>
            {i + 1}. {playerName(ctx, r.id)}
          </span>
          <span className="tabular-nums" dir="ltr">
            {r.ms} ms
          </span>
        </div>
      ))}
      {early.length > 0 && <p className="text-center text-sm text-mute">מוקדם מדי: {early.map((a) => playerName(ctx, a.player_id)).join(", ")}</p>}
    </div>
  );
}

export const fastest: GameDef = {
  id: "fastest",
  title: "מי הכי מהיר",
  blurb: "המסך מתחלף לירוק. הראשון שלוחץ מנצח",
  kind: "mini",
  Icon: Bolt,
  start: () => ({ prompt: { delay: 2000 + Math.floor(Math.random() * 3500) } }),
  flow: {
    open: { next: "guess", label: "יאללה, התחל!" },
    guess: { next: "reveal", label: "תוצאות" },
  },
  score: (ctx) =>
    merge(
      results(ctx)
        .slice(0, 3)
        .map((r, i) => ({ coupleId: coupleOf(ctx, r.id)?.id ?? "", delta: 3 - i, reason: "מי הכי מהיר" }))
        .filter((a) => a.coupleId),
    ),
  Player: (ctx) => {
    if (ctx.round.phase === "open") return <Hold text="שימו אצבע מעל המסך. כשזה הופך לירוק, לחצו!" />;
    if (ctx.round.phase === "guess") return <Arena {...ctx} />;
    return (
      <div className="flex flex-col gap-4">
        <PromptCard>מי הכי מהיר</PromptCard>
        <Board {...ctx} />
      </div>
    );
  },
  Host: (ctx) =>
    ctx.round.phase === "reveal" ? (
      <Board {...ctx} />
    ) : (
      <div className="flex flex-col gap-4">
        <PromptCard>{ctx.round.phase === "open" ? "כולם מוכנים?" : "המסכים מחכים לירוק…"}</PromptCard>
        {ctx.round.phase === "guess" && <Progress n={byKind(ctx.answers, "tap").length} of={ctx.players.length} label="לחצו" />}
      </div>
    ),
};
