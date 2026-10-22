"use client";

import { useEffect, useState } from "react";
import type { Ctx } from "@/lib/game";
import { coupleBg, coupleText } from "@/lib/colors";
import { play } from "@/lib/sound";
import { buzz } from "@/lib/ux";
import { CoupleAvatar } from "@/components/CoupleAvatar";
import { Confetti } from "@/components/Confetti";
import { Trophy } from "@/components/art";
import type { GameDef } from "./types";

// End of the night: 3rd, then 2nd, then the winners with confetti and a fanfare.
const STEP_MS = [1200, 2800, 4600];

function Podium(ctx: Ctx) {
  const ranked = [...ctx.couples].sort((a, b) => b.score - a.score || a.idx - b.idx);
  const [shown, setShown] = useState(0); // how many places revealed (from 3rd up)

  useEffect(() => {
    const ts = STEP_MS.map((ms, i) =>
      setTimeout(() => {
        setShown(i + 1);
        if (i < 2) play("ding");
        else {
          play("fanfare");
          buzz(200);
        }
      }, ms),
    );
    return () => ts.forEach(clearTimeout);
  }, [ctx.round.id]);

  // Visual order right-to-left: 2nd, 1st, 3rd.
  const slots = [
    { place: 2, c: ranked[1], h: "h-28", at: 2 },
    { place: 1, c: ranked[0], h: "h-40", at: 3 },
    { place: 3, c: ranked[2], h: "h-20", at: 1 },
  ];
  const winner = ranked[0];

  return (
    <div className="flex flex-col items-center gap-6 pt-4">
      {shown >= 3 && <Confetti key={ctx.round.id} />}
      <h1 className="animate-pop text-4xl font-black text-party">והזוג המנצח…</h1>
      <div className="mt-4 flex h-[22rem] w-full items-end justify-center gap-2">
        {slots.map(({ place, c, h, at }) =>
          c ? (
            <div key={c.id} className="flex flex-1 flex-col items-center gap-2">
              <div className={`flex flex-col items-center gap-1 transition-all duration-700 ${shown >= at ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
                {place === 1 && <Trophy className="size-12 animate-float" />}
                <CoupleAvatar idx={c.idx} className={place === 1 ? "size-20" : "size-14"} />
                <span className={`text-center text-sm leading-tight font-black ${coupleText[c.idx]}`}>{c.name}</span>
                <span dir="ltr" className="text-xl font-black tabular-nums">{c.score}</span>
              </div>
              <div
                className={`flex w-full items-start justify-center rounded-t-2xl pt-2 text-4xl font-black text-bg transition-all duration-700 ease-out ${coupleBg[c.idx]} ${
                  shown >= at ? `${h} opacity-100` : "h-0 pt-0 opacity-0"
                }`}
              >
                {shown >= at && place}
              </div>
            </div>
          ) : null,
        )}
      </div>
      {ranked[3] && shown >= 3 && (
        <p className="animate-rise text-center text-mute">
          ובמקום הרביעי, עם הרבה אהבה: <b className={coupleText[ranked[3].idx]}>{ranked[3].name}</b> ({ranked[3].score})
        </p>
      )}
      {shown >= 3 && winner && <p className="animate-pop text-center text-2xl font-black">כל הכבוד {winner.name}! 🥂</p>}
    </div>
  );
}

export const finale: GameDef = {
  id: "finale",
  title: "סיום הערב",
  blurb: "פודיום, קונפטי וכבוד",
  kind: "finale",
  Icon: Trophy,
  start: () => ({ prompt: {}, phase: "reveal" }),
  flow: {},
  Player: Podium,
  Host: Podium,
};
