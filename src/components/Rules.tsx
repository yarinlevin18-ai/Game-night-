"use client";

import { useEffect, useState } from "react";
import { rules } from "@/content/rules";
import type { GameDef } from "@/games/types";
import { buzz } from "@/lib/ux";

const seenKey = (id: string) => `cn:rules-seen:${id}`;

// "?" button + bottom sheet with the game's rules.
// autoOpen: show it by itself the first time this phone sees the game.
export function RulesButton({ def, autoOpen = false }: { def: GameDef; autoOpen?: boolean }) {
  const r = rules[def.id];
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!autoOpen || !r) return;
    try {
      if (localStorage.getItem(seenKey(def.id))) return;
      localStorage.setItem(seenKey(def.id), "1");
    } catch {}
    setOpen(true);
  }, [autoOpen, def.id, r]);

  if (!r) return null;
  return (
    <>
      <button
        onClick={() => {
          buzz(8);
          setOpen(true);
        }}
        aria-label="איך משחקים?"
        className="grid size-9 place-items-center rounded-full bg-white/10 text-lg font-black transition active:scale-90"
      >
        ?
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md animate-rise rounded-t-3xl bg-card p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <def.Icon className="size-10" />
              <div>
                <p className="text-sm font-bold text-sun">איך משחקים?</p>
                <h2 className="text-2xl font-black">{def.title}</h2>
              </div>
            </div>
            <ol className="flex flex-col gap-2">
              {r.how.map((line, i) => (
                <li key={i} className="flex gap-3 text-lg leading-snug">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-black">{i + 1}</span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
            {r.points.length > 0 && (
              <div className="mt-4 rounded-2xl bg-c4/15 p-4">
                <p className="mb-1 font-black text-c4">נקודות</p>
                {r.points.map((line, i) => (
                  <p key={i} className="leading-snug">
                    • <Ltr text={line} />
                  </p>
                ))}
              </div>
            )}
            <button onClick={() => setOpen(false)} className="mt-5 w-full rounded-2xl bg-party py-4 text-xl font-black text-white active:scale-95">
              הבנתי, יאללה!
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// "+3" inside Hebrew text renders as "3+" unless the number is isolated as LTR.
function Ltr({ text }: { text: string }) {
  return (
    <>
      {text.split(/([+-]\d+)/).map((part, i) =>
        /^[+-]\d+$/.test(part) ? (
          <bdi key={i} dir="ltr" className="font-black">
            {part}
          </bdi>
        ) : (
          part
        ),
      )}
    </>
  );
}
