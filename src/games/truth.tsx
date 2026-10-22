"use client";

import { useState } from "react";
import { byKind, coupleOf, draw, mineOf, parse, playerName, submit, type Ctx } from "@/lib/game";
import { Hold, PromptCard, Waiting } from "@/components/ui";
import { Sparkle } from "@/components/art";
import { buzz } from "@/lib/ux";
import { Progress } from "./likely";
import { merge, type GameDef } from "./types";

// Subject writes a fact about themselves (true or a lie). Everyone votes.
// Right guess = +1 to the guesser's couple; each fooled player = +1 to the subject's couple.
type Stmt = { text: string; truth: boolean };
const stmtOf = (ctx: Ctx) => {
  const a = byKind(ctx.answers, "stmt")[0];
  return a ? parse<Stmt>(a.value) : null;
};

function Write(ctx: Ctx) {
  const [text, setText] = useState("");
  const send = (truth: boolean) => {
    buzz(20);
    submit(ctx.round.id, ctx.meId!, "stmt", { text: text.trim(), truth });
  };
  return (
    <div className="flex flex-col gap-3">
      <PromptCard kicker="תורך!">כתבו משהו על עצמכם. אמת או שקר, אתם מחליטים</PromptCard>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={120}
        rows={3}
        placeholder="פעם אכלתי 12 פיתות בישיבה אחת…"
        className="card rounded-2xl border-2 !border-line p-4 text-xl outline-none focus:!border-sun"
      />
      <div className="grid grid-cols-2 gap-2">
        <button disabled={!text.trim()} onClick={() => send(true)} className="rounded-2xl bg-c4 py-4 text-xl font-black text-bg disabled:opacity-30">
          זה אמת
        </button>
        <button disabled={!text.trim()} onClick={() => send(false)} className="rounded-2xl bg-pop py-4 text-xl font-black text-white disabled:opacity-30">
          זה שקר
        </button>
      </div>
    </div>
  );
}

function Vote({ ctx, stmt }: { ctx: Ctx; stmt: Stmt }) {
  const mine = mineOf(ctx.answers, ctx.meId, "vote");
  return (
    <div className="flex flex-col gap-4">
      <PromptCard kicker={`${playerName(ctx, ctx.round.subject_player_id)} אומר/ת:`}>“{stmt.text}”</PromptCard>
      {mine ? (
        <Waiting text={`הצבעת: ${mine.value === "true" ? "אמת" : "שקר"}`} />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => submit(ctx.round.id, ctx.meId!, "vote", "true")} className="animate-pop rounded-2xl bg-c4 py-8 text-2xl font-black text-bg active:scale-95">
            אמת
          </button>
          <button onClick={() => submit(ctx.round.id, ctx.meId!, "vote", "false")} className="animate-pop rounded-2xl bg-pop py-8 text-2xl font-black text-white active:scale-95">
            שקר
          </button>
        </div>
      )}
    </div>
  );
}

function Reveal(ctx: Ctx) {
  const stmt = stmtOf(ctx);
  if (!stmt) return null;
  const votes = byKind(ctx.answers, "vote");
  const fooled = votes.filter((v) => (v.value === "true") !== stmt.truth);
  return (
    <div className="flex flex-col gap-4">
      <PromptCard>“{stmt.text}”</PromptCard>
      <div className={`animate-pop rounded-3xl py-6 text-center text-5xl font-black ${stmt.truth ? "bg-c4 text-bg" : "bg-pop text-white"}`}>
        {stmt.truth ? "אמת!" : "שקר!"}
      </div>
      <p className="text-center font-bold">
        {fooled.length ? `${playerName(ctx, ctx.round.subject_player_id)} עבד/ה על: ${fooled.map((v) => playerName(ctx, v.player_id)).join(", ")}` : "אף אחד לא נפל בפח"}
      </p>
    </div>
  );
}

export const truth: GameDef = {
  id: "truth",
  title: "אמת או שקר",
  blurb: "מישהו כותב עובדה על עצמו. אמת? שקר? כל מי שנפל בפח נותן לו נקודה",
  kind: "social",
  Icon: Sparkle,
  start: (room) => ({ prompt: {}, subject: draw("truth-subject", room.players).item.id }),
  flow: {
    open: { next: "guess", label: "הצג לכולם", ready: (ctx) => !!stmtOf(ctx) },
    guess: { next: "reveal", label: "חשוף" },
  },
  score: (ctx) => {
    const stmt = stmtOf(ctx);
    if (!stmt) return [];
    const subj = coupleOf(ctx, ctx.round.subject_player_id)?.id ?? "";
    return merge(
      byKind(ctx.answers, "vote")
        .map((v) =>
          (v.value === "true") === stmt.truth
            ? { coupleId: coupleOf(ctx, v.player_id)?.id ?? "", delta: 1, reason: "אמת או שקר" }
            : { coupleId: subj, delta: 1, reason: "אמת או שקר: עבד עליהם" },
        )
        .filter((a) => a.coupleId),
    );
  },
  Player: (ctx) => {
    const isSubject = ctx.meId === ctx.round.subject_player_id;
    const stmt = stmtOf(ctx);
    const name = playerName(ctx, ctx.round.subject_player_id);
    if (ctx.round.phase === "reveal") return <Reveal {...ctx} />;
    if (ctx.round.phase === "open") {
      if (isSubject) return stmt ? <Waiting text="נשלח! עכשיו תעשו פרצוף פוקר" /> : <Write {...ctx} />;
      return <Hold text={`${name} כותב/ת משהו על עצמו/ה… תכינו את חוש הריח לשקרים`} />;
    }
    if (isSubject) return <Hold text="כולם מצביעים. שמרו על פרצוף פוקר!" />;
    return stmt ? <Vote ctx={ctx} stmt={stmt} /> : null;
  },
  Host: (ctx) => {
    const stmt = stmtOf(ctx);
    const name = playerName(ctx, ctx.round.subject_player_id);
    if (ctx.round.phase === "reveal") return <Reveal {...ctx} />;
    return (
      <div className="flex flex-col gap-4">
        <PromptCard kicker={`התור של ${name}`}>{stmt ? `“${stmt.text}”` : "כותב/ת…"}</PromptCard>
        {ctx.round.phase === "guess" && <Progress n={byKind(ctx.answers, "vote").length} of={ctx.players.length - 1} />}
      </div>
    );
  },
};
