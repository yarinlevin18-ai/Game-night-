"use client";

import { charades as charadesBank, headsup as headsupBank, taboo as tabooBank } from "@/content/bank";
import { draw, playerName, present, shuffle, submit, type Ctx } from "@/lib/game";
import { Clock, PromptCard, useCountdown } from "@/components/ui";
import { Card, Glass, Sparkle } from "@/components/art";
import { CoupleAvatar } from "@/components/CoupleAvatar";
import { coupleText, coupleTint } from "@/lib/colors";
import { buzz } from "@/lib/ux";
import type { GameDef, Room } from "./types";
import { getTeams, TEAM_META, type TeamId } from "@/lib/teams";

// Turn games: one player ("giver") works through a deck for 60s; their couple scores +1 per hit.
//  taboo:    giver explains without the forbidden words; partner guesses. Everyone else sees the card (to catch cheating).
//  charades: giver acts it out; partner guesses. Everyone else sees the card.
//  headsup:  giver holds the phone on their forehead (screen out); partner hints. Tap right half = got it, left = skip.
type Mode = "taboo" | "charades" | "headsup";
const SECONDS = 60;
// Balance: 1 point per 2 hits (rounded up), so a 60s turn is worth about one round of the other games.
export const turnPoints = (hits: number) => Math.ceil(hits / 2);

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
  const side: string[] = ctx.round.prompt.coupleIds ?? [ctx.round.prompt.coupleId];
  const team = ctx.round.prompt.team as TeamId | undefined;
  const couple = ctx.couples.find((c) => c.id === (team ? ctx.players.find((p) => p.id === giverId)?.couple_id : side[0]));
  const running = ctx.round.phase === "guess";
  const left = useCountdown(SECONDS, running ? ctx.round.id : null, ctx.round.prompt.startedAt);
  const isGiver = ctx.meId === giverId;
  // "Partner" = anyone guessing on the giver's side (the partner, or the whole team in team mode).
  const isPartner = !isGiver && side.includes(ctx.players.find((p) => p.id === ctx.meId)?.couple_id ?? "");
  const giver = playerName(ctx, giverId);
  const over = running && left === 0;

  const mark = (hit: boolean) => {
    if (over) return;
    buzz(hit ? 20 : 8);
    submit(ctx.round.id, giverId, `${hit ? "hit" : "skip"}-${n}`, hit ? "1" : "0");
  };

  const header = team ? (
    <div className={`mx-auto flex animate-pop flex-col items-center rounded-2xl px-4 py-2 text-center ${TEAM_META[team].tint}`}>
      <span className={`text-lg font-black ${TEAM_META[team].text}`}>{TEAM_META[team].name}</span>
      <span className="text-sm font-bold">
        {mode === "headsup" ? `${giver} מנחש/ת, הקבוצה נותנת רמזים` : `${giver} ${mode === "taboo" ? "מסביר/ה" : "מציג/ה"} לקבוצה`}
      </span>
    </div>
  ) : couple && (
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
          <p className="mt-1 text-lg font-black" dir="rtl">
            = <bdi dir="ltr">+{turnPoints(hits.length)}</bdi> {team ? "לכל זוג בקבוצה" : "לזוג"}
          </p>
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
              : `התור של ${team ? TEAM_META[team].name : couple?.name}. ${mode === "taboo" ? "תשמרו שלא אומרים מילה אסורה!" : "תיהנו מההצגה"}`}
        </PromptCard>
      </div>
    );

  // Running
  if (isGiver && mode === "headsup")
    return (
      <div className={ctx.onHost ? "flex min-h-[60dvh] flex-col overflow-hidden rounded-3xl bg-bg" : "fixed inset-0 z-30 flex flex-col bg-bg"}>
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
  const here = present(room.players, room.online);
  const couples = room.couples.filter((c) => here.some((p) => p.couple_id === c.id));
  const couple = draw(`${mode}-couple`, couples.length ? couples : room.couples).item;
  const all = room.players.filter((p) => p.couple_id === couple.id);
  const members = all.filter((p) => here.includes(p)).length ? all.filter((p) => here.includes(p)) : all;
  const key = `cn:giver:${mode}:${couple.id}`;
  let last = -1;
  try {
    last = Number(localStorage.getItem(key) ?? -1);
  } catch {}
  const idx = (last + 1) % Math.max(1, members.length);
  try {
    localStorage.setItem(key, String(idx));
  } catch {}
  let turnNo = 1;
  try {
    turnNo = JSON.parse(localStorage.getItem(`cn:used:${mode}-couple`) ?? "[]").length || 1;
  } catch {}
  return { coupleId: couple.id, giverId: members[idx]?.id ?? members[0]?.id, turnNo, turnsTotal: couples.length || room.couples.length };
}

// Team turn: teams alternate; within a team the giver rotates over its (present) players.
function nextTeamTurn(room: Room, mode: Mode) {
  const teams = getTeams(room.couples);
  const tKey = `cn:teamturn:${mode}`;
  let last: TeamId = "B";
  try {
    last = (localStorage.getItem(tKey) as TeamId) ?? "B";
  } catch {}
  const team: TeamId = last === "A" ? "B" : "A";
  const here = present(room.players, room.online);
  const all = room.players.filter((p) => teams[team].includes(p.couple_id));
  const members = all.filter((p) => here.includes(p)).length ? all.filter((p) => here.includes(p)) : all;
  const gKey = `cn:teamgiver:${mode}:${team}`;
  let g = -1;
  try {
    g = Number(localStorage.getItem(gKey) ?? -1);
    localStorage.setItem(tKey, team);
    localStorage.setItem(gKey, String((g + 1) % Math.max(1, members.length)));
  } catch {}
  return { team, coupleIds: teams[team], giverId: members[(g + 1) % Math.max(1, members.length)]?.id ?? members[0]?.id, turnNo: team === "A" ? 1 : 2, turnsTotal: 2 };
}

function make(mode: Mode, Icon: GameDef["Icon"], blurb: string, teamMode = false): GameDef {
  return {
    id: teamMode ? `team-${mode}` : mode,
    title: teamMode ? `${titles[mode]} קבוצות` : titles[mode],
    blurb,
    kind: teamMode ? "team" : "mini",
    Icon,
    start: (room) => ({ prompt: { mode, deck: deckFor(mode), ...(teamMode ? nextTeamTurn(room, mode) : nextTurn(room, mode)) } }),
    flow: {
      open: { next: "guess", label: `התחל (${SECONDS} שנ׳)` },
      guess: { next: "reveal", label: "סיום תור" },
    },
    score: (ctx) => {
      const { hits } = turnState(ctx);
      const side: string[] = ctx.round.prompt.coupleIds ?? [ctx.round.prompt.coupleId];
      const pts = turnPoints(hits.length);
      return pts ? side.map((coupleId) => ({ coupleId, delta: pts, reason: titles[mode] })) : [];
    },
    Player: (ctx) => <Turn {...ctx} />,
    Host: (ctx) => <Turn {...ctx} host />,
  };
}

export const taboo = make("taboo", Card, "מסבירים מילה בלי המילים האסורות. 60 שניות");
export const charades = make("charades", Sparkle, "מציגים בלי מילים, בן/בת הזוג מנחשים. 60 שניות");
export const headsup = make("headsup", Glass, "טלפון על המצח, בן/בת הזוג נותנים רמזים. 60 שניות");

export const teamTaboo = make("taboo", Card, "קבוצות מעורבבות: מסבירים לקבוצה בלי המילים האסורות", true);
export const teamCharades = make("charades", Sparkle, "קבוצות מעורבבות: מציגים לקבוצה בלי מילים", true);
export const teamHeadsup = make("headsup", Glass, "קבוצות מעורבבות: טלפון על המצח, כל הקבוצה נותנת רמזים", true);
