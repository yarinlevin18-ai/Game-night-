import { Card, Dice, Glass, Heart, Sparkle, Trophy } from "./art";

// Slow drifting color blobs behind everything, plus a few floating stickers.
const blobs = [
  "bg-c1 -top-24 -right-24",
  "bg-c2 top-1/3 -left-32",
  "bg-c3 bottom-0 right-0",
  "bg-c4 -bottom-32 left-1/4",
];
const stickers = [
  { A: Dice, c: "top-[7%] left-[6%] size-10" },
  { A: Glass, c: "top-[24%] right-[4%] size-9" },
  { A: Card, c: "top-[56%] left-[3%] size-10" },
  { A: Heart, c: "bottom-[18%] right-[8%] size-9" },
  { A: Trophy, c: "bottom-[5%] left-[28%] size-10" },
  { A: Sparkle, c: "top-[40%] right-[30%] size-5" },
  { A: Sparkle, c: "top-[12%] right-[38%] size-4" },
];

export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {blobs.map((c, i) => (
        <div
          key={c}
          className={`absolute size-80 rounded-full opacity-30 blur-3xl animate-blob ${c}`}
          style={{ animationDelay: `${i * -4}s` }}
        />
      ))}
      {stickers.map(({ A, c }, i) => (
        <div key={i} className={`absolute opacity-25 animate-float ${c}`} style={{ animationDelay: `${i * -0.7}s` }}>
          <A className="size-full" />
        </div>
      ))}
    </div>
  );
}
