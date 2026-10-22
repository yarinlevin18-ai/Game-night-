"use client";

import { charades as charadesBank, headsup as headsupBank, taboo as tabooBank } from "@/content/bank";
import { draw, playerName, shuffle, submit, type Ctx } from "@/lib/game";
import { Clock, PromptCard, useCountdown } from "@/components/ui";
import { Card, Glass, Sparkle } from "@/components/art";
import { CoupleAvatar } from "@/components/CoupleAvatar";
import { coupleText, coupleTint } from "@/lib/colors";
import { buzz } from "@/lib/ux";
import type { GameDef, Room } from "./types";

// Turn games: one player ("giver") works through a deck for 60s; their couple scores +1 per hit.
//  taboo:    giver explains without the forbidden words; partner guesses. Everyone else sees the card (to catch cheating).
//  charades: giver acts it out; partner guesses. Everyone else sees the card.
//  headsup:  giver holds the phone on their forehead (screen out); partner hints. Tap right half = got it, left = skip.
type Mode = "taboo" | "charades" | "headsup";
const SECONDS = 60;

type TabooCard = { word: string; no: string[] };
const deckFor = (mode: Mode) =>
  mode === "taboo" ? shuffle(tabooBank.map((_, i) => i)) : mode === "charades" ? shuffle(charadesBank.map((_, i) => i)) : shuffle(headsupBank.map((_, i) => i));
const cardAt = (mode: Mode, i: number) => (mode === "taboo" ? tabooBank[i] : mode === "charades" ? charadesBank[i] : headsupBank[i]);

function turnState(ctx: Ctx) {
  const { giverId, deck, mode } = ctx.round.prompt as { giverId: string; deck: number[]; mode: Mode };
  const mine = ctx.answers.filter((a) => a.player_id === giverId && /^(hit|skip)-/.test(a.kind));
  const hits = mine.filter((a) => a.kind.startsWith("hit-"));
  const cur = cardAt(mode, deck[mine.length % deck.length]);
  return { giverId, mode, n: mine.length, hits, cur };
}

function CardFace({ mode, card, big }: { mode: Mode; card: unknown; big?: boolean }) {
  if (mode === "taboo") {
    const c = card as TabooCard;
    return (
      <div className="card animate-pop rounded-3xl p-5 text-center">
        <p className="text-4xl font-black text-sun">{c.word}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {c.no.map((w) => (
            <span key={w} className="rounded-full bg-pop/25 px-3 py-1 font-bold text-pop line-through decoration-2">
              {w}
            </span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={`card animate-pop rounded-3xl p-6 text-center font-black ${big ? "text-6xl" : "text-3xl"}`}>
      {card as string}
    </div>
  );
}

function Turn(ctx: Ctx & { host?: boolean }) {
  const { giverId, mode, n, hits, cur } = turnState(ctx);
  const couple = ctx.couples.find((c) => c.id === ctx.round.prompt.coupleId);
  const running = ctx.round.phase === "guess";
  const left = useCountdown(SECONDS, running ? ctx.round.id : null);
  const isGiver = ctx.meId === giverId;
  const isPartner = !isGiver && ctx.players.find((p) => p.id === ctx.meId)?.couple_id === couple?.id;
  const giver = playerName(ctx, giverId);
  const over = running && left === 0;

  const mark = (hit: boolean) => {
    if (over) return;
    buzz(hit ? 20 : 8);
    submit(ctx.round.id, giverId, `${hit ? "hit" : "skip"}-${n}`, hit ? "1" : "0");
  };

  const header = couple && (
    <div className={`mx-auto flex animate-pop items-center gap-2 rounded-full px-4 py-2 text-lg font-black ${coupleTint[couple.idx]} ${coupleText[couple.idx]}`}>
      <CoupleAvatar idx={couple.idx} className="size-7" badge={false} />
      {mode === "headsup" ? `${giver} מנחש/ת` : `${giver} ${mode === "taboo" ? "מסביר/ה" : "מציג/ה"}`}
    </div>
  );
  const score = <p className="text-center text-2xl font-black text-c4">✓ {hits.length}</p>;

  if (ctx.round.phase === "reveal")
    return (
      <div className="flex flex-col gap-4">
        {header}
        <div className="animate-pop rounded-3xl bg-c4 py-6 text-center text-bg">
          <p className="text-6xl font-black">{hits.length}</p>
          <p className="font-bold">ניחושים נכונים</p>
        </div>
      </div>
    );

  if (!running)
    return (
      <div className="flex flex-col gap-4">
        {header}
        <PromptCard kicker={titles[mode]}>
          {isGiver
            ? mode === "headsup"
              ? "שימו את הטלפון על המצח, מסך החוצה. ימין = ניחשתי, שמאל = דלג"
              : "את/ה בתור! כשהמנחה מתחיל/ה, הקלף יופיע אצלך"
            : isPartner
              ? `אתם מנחשים! תקשיבו ל${giver}`
              : `התור של ${couple?.name}. ${mode === "taboo" ? "תשמרו שלא אומרים מילה אסורה!" : "תיהנו מההצגה"}`}
        </PromptCard>
      </div>
    );

  // Running
  if (isGiver && mode === "headsup")
    return (
      <div className="fixed inset-0 z-30 flex flex-col bg-bg">
        <div className="flex flex-1 items-center justify-center p-6 text-center text-7xl font-black text-sun">{over ? "נגמר!" : (cur as string)}</div>
        <div className="flex items-center justify-center gap-6 pb-3 text-3xl font-black">
          <span className="tabular-nums">{left}</span>
          <span className="text-c4">✓ {hits.length}</span>
        </div>
        <div className="grid h-36 grid-cols-2">
          <button onPointerDown={() => mark(true)} className="bg-c4 text-3xl font-black text-bg active:brightness-90">
            ✓
          </button>
          <button onPointerDown={() => mark(false)} className="bg-pop text-3xl font-black text-white active:brightness-90">
            דלג
          </button>
        </div>
      </div>
    );

  // Partner must not see the card in taboo/charades; in headsup everyone but the holder sees it.
  const showCard = isGiver || ctx.host || mode === "headsup" || !isPartner;
  return (
    <div className="flex flex-col gap-4">
      {header}
      <Clock left={left} total={SECONDS} />
      {over ? (
        <p className="animate-pop text-center text-4xl font-black text-pop">נגמר הזמן!</p>
      ) : showCard ? (
        <CardFace key={n} mode={mode} card={cur} big={mode === "headsup"} />
      ) : (
        <PromptCard>נחשו! 🎯</PromptCard>
      )}
      {score}
      {isGiver && !over && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => mark(true)} className="rounded-2xl bg-c4 py-6 text-2xl font-black text-bg active:scale-95">
            ✓ ניחשו
          </button>
          <button onClick={() => mark(false)} className="rounded-2xl bg-white/10 py-6 text-2xl font-black active:scale-95">
            דלג
          </button>
        </div>
      )}
    </div>
  );
}

const titles: Record<Mode, string> = { taboo: "טאבו", charades: "פנטומימה", headsup: "מה אני?" };

// Rotate couples, and alternate who gives within a couple.
function nextTurn(room: Room, mode: Mode) {
  const couple = draw(`${mode}-couple`, room.couples).item;
  const members = room.players.filter((p) => p.couple_id === couple.id);
  const key = `cn:giver:${mode}:${couple.id}`;
  let last = -1;
  try {
    last = Number(localStorage.getItem(key) ?? -1);
  } catch {}
  const idx = (last + 1) % Math.max(1, members.length);
  try {
    localStorage.setItem(key, String(idx));
  } catch {}
  return { coupleId: couple.id, giverId: members[idx]?.id ?? members[0]?.id };
}

function make(mode: Mode, Icon: GameDef["Icon"], blurb: string): GameDef {
  return {
    id: mode,
    title: titles[mode],
    blurb,
    kind: "mini",
    Icon,
    start: (room) => ({ prompt: { mode, deck: deckFor(mode), ...nextTurn(room, mode) } }),
    flow: {
      open: { next: "guess", label: `התחל (${SECONDS} שנ׳)` },
      guess: { next: "reveal", label: "סיום תור" },
    },
    score: (ctx) => {
      const { hits } = turnState(ctx);
      return hits.length ? [{ coupleId: ctx.round.prompt.coupleId, delta: hits.length, reason: titles[mode] }] : [];
    },
    Player: (ctx) => <Turn {...ctx} />,
    Host: (ctx) => <Turn {...ctx} host />,
  };
}

export const taboo = make("taboo", Card, "מסבירים מילה בלי המילים האסורות. 60 שניות");
export const charades = make("charades", Sparkle, "מציגים בלי מילים, בן/בת הזוג מנחשים. 60 שניות");
export const headsup = make("headsup", Glass, "טלפון על המצח, בן/בת הזוג נותנים רמזים. 60 שניות");
