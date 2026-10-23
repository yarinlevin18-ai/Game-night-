"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMe, type Me } from "@/lib/session";
import { ROOM } from "@/lib/room";
import { useRoom } from "@/lib/useRoom";
import { placeBet, scoreBets, useBets, type Bet } from "@/lib/bets";
import { propOptions, props, type Prop } from "@/content/props";
import type { Couple, Player } from "@/lib/supabase";
import { coupleBg, coupleText, coupleTint, delay } from "@/lib/colors";
import { buzz } from "@/lib/ux";
import { Dice, Trophy } from "@/components/art";
import { CoupleAvatar } from "@/components/CoupleAvatar";

// הימורי הערב: everyone bets on what will happen tonight. Hidden until the host locks; host resolves at the end.
export default function Bets() {
  const router = useRouter();
  const [me, setMeState] = useState<Me | null>(null);
  const { couples, players } = useRoom({});
  const { bets, state, ready } = useBets();

  useEffect(() => {
    const m = getMe(ROOM);
    if (!m) router.replace("/?next=/bets");
    else setMeState(m);
  }, [router]);

  if (!me) return null;
  const mine = (prop: string) => bets.find((b) => b.player_id === me.playerId && b.prop === prop)?.value;
  const done = props.filter((p) => mine(p.id)).length;
  // Players see results only once the host reveals (and hands out the points).
  const resolved = state.awarded;
  const bettors = new Set(bets.map((b) => b.player_id)).size;

  return (
    <div className="flex flex-col gap-5 pt-2 pb-12">
      <header className="flex flex-col items-center gap-2 text-center">
        <Dice className="size-16 animate-float" />
        <h1 className="animate-pop text-4xl font-black text-party">הימורי הערב</h1>
        <p className="animate-rise text-mute">
          {state.locked ? "ההימורים נעולים. עכשיו רואים על מה כולם הימרו 👀" : "המרו מה יקרה הערב, על החבר'ה ועל המשחקים. בסוף הערב המנחה חושף, וכל הימור נכון = נקודות לזוג"}
        </p>
        {!state.locked && (
          <div className="mt-1 w-full max-w-xs">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-party transition-[width] duration-500" style={{ width: `${(done / props.length) * 100}%` }} />
            </div>
            <p className="mt-1 text-sm font-bold">
              הימרת על {done}/{props.length} · {bettors} כבר המרו
            </p>
          </div>
        )}
      </header>

      {resolved && <Prophets bets={bets} results={state.results} players={players} couples={couples} meId={me.playerId} />}

      {ready &&
        props.map((p, i) => (
          <PropCard
            key={p.id}
            prop={p}
            index={i}
            mine={mine(p.id)}
            bets={bets.filter((b) => b.prop === p.id)}
            result={resolved ? state.results[p.id] : undefined}
            locked={state.locked}
            players={players}
            couples={couples}
            onPick={(v) => {
              buzz(10);
              placeBet(me.playerId, p.id, v);
            }}
          />
        ))}

      {!state.locked && done === props.length && (
        <p className="animate-pop text-center text-xl font-black text-c4">✓ הימרת על הכל! נתראה הערב</p>
      )}
      <Link href="/play" className="mx-auto text-sm text-mute underline underline-offset-4">
        למסך המשחק
      </Link>
    </div>
  );
}

function PropCard({
  prop,
  index,
  mine,
  bets,
  result,
  locked,
  players,
  couples,
  onPick,
}: {
  prop: Prop;
  index: number;
  mine?: string;
  bets: Bet[];
  result?: string;
  locked: boolean;
  players: Player[];
  couples: Couple[];
  onPick: (v: string) => void;
}) {
  const count = (v: string) => bets.filter((b) => b.value === v).length;
  const options = propOptions(prop, players, couples);
  const hit = result !== undefined && mine === result;

  return (
    <section className="card animate-rise rounded-3xl p-4" style={delay(index, 60)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-lg leading-snug font-black">{prop.q}</h2>
        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold" dir="rtl">
          <bdi dir="ltr">+{prop.points}</bdi>
        </span>
      </div>
      <div className={`grid gap-2 ${prop.kind === "player" ? "grid-cols-4" : "grid-cols-2"}`}>
        {options.map((o) => {
          const on = mine === o.v;
          const isResult = result === o.v;
          return (
            <button
              key={o.v}
              disabled={locked}
              onClick={() => onPick(o.v)}
              className={`relative flex flex-col items-center gap-0.5 rounded-2xl border-2 px-1 py-2 text-sm font-black transition active:scale-95 ${
                o.idx ? coupleTint[o.idx] : "bg-white/5"
              } ${on ? `border-white scale-105` : "border-transparent"} ${result !== undefined && !isResult ? "opacity-40" : ""} ${
                isResult ? "ring-4 ring-c4" : ""
              }`}
            >
              {prop.kind === "couple" && o.idx && <CoupleAvatar idx={o.idx} className="size-7" badge={false} />}
              <span dir="auto" className={o.idx ? coupleText[o.idx] : ""}>{o.label}</span>
              {locked && <span className="text-xs font-bold text-mute">{count(o.v)} 🎲</span>}
              {on && <span className="absolute -top-2 -left-1 rounded-full bg-white px-1.5 text-[10px] font-black text-bg">שלך</span>}
            </button>
          );
        })}
      </div>
      {result !== undefined && (
        <p className={`mt-3 animate-pop text-center font-black ${hit ? "text-c4" : "text-pop"}`}>
          {hit ? `צדקת! +${prop.points} לזוג` : mine ? "לא הפעם 😅" : "לא הימרת על זה"}
        </p>
      )}
    </section>
  );
}

function Prophets({ bets, results, players, couples, meId }: { bets: Bet[]; results: Record<string, string>; players: Player[]; couples: Couple[]; meId: string }) {
  const { perPlayer, perCouple } = scoreBets(bets, results, players);
  const ranked = players.map((p) => ({ p, n: perPlayer.get(p.id) ?? 0 })).sort((a, b) => b.n - a.n);
  const top = ranked[0]?.n ?? 0;
  return (
    <section className="animate-pop rounded-3xl bg-sun/10 p-4">
      <div className="mb-2 flex items-center justify-center gap-2">
        <Trophy className="size-8 animate-float" />
        <h2 className="text-xl font-black text-sun">נביא/ת הערב</h2>
      </div>
      <p className="mb-3 text-center text-2xl font-black">
        {top > 0 ? ranked.filter((r) => r.n === top).map((r) => r.p.name).join(" ו") : "אף אחד 🙃"}{" "}
        {top > 0 && <span className="text-base text-mute">({top} נכונים)</span>}
      </p>
      <div className="grid grid-cols-4 gap-1.5 text-center text-sm">
        {ranked.map(({ p, n }) => {
          const c = couples.find((x) => x.id === p.couple_id);
          return (
            <div key={p.id} className={`rounded-xl py-1.5 ${c ? coupleTint[c.idx] : ""} ${p.id === meId ? "ring-2 ring-white" : ""}`}>
              <p className={`font-black ${c ? coupleText[c.idx] : ""}`}>{p.name}</p>
              <p className="font-bold">{n} ✓</p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {couples.map((c) => (
          <span key={c.id} className={`rounded-full px-3 py-1 text-xs font-black text-bg ${coupleBg[c.idx]}`}>
            {c.name}: <bdi dir="ltr">+{perCouple.get(c.id) ?? 0}</bdi>
          </span>
        ))}
      </div>
    </section>
  );
}
