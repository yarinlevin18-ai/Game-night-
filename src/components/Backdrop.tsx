// Slow drifting color blobs behind everything, plus a few floating party emoji.
const blobs = [
  "bg-c1 -top-24 -right-24",
  "bg-c2 top-1/3 -left-32",
  "bg-c3 bottom-0 right-0",
  "bg-c4 -bottom-32 left-1/4",
];
const emoji = [
  { e: "🎲", c: "top-[8%] left-[8%]" },
  { e: "🍷", c: "top-[22%] right-[6%]" },
  { e: "🃏", c: "top-[55%] left-[4%]" },
  { e: "💘", c: "bottom-[18%] right-[10%]" },
  { e: "🏆", c: "bottom-[6%] left-[30%]" },
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
      {emoji.map(({ e, c }, i) => (
        <span
          key={e}
          className={`absolute text-3xl opacity-20 animate-float ${c}`}
          style={{ animationDelay: `${i * -0.7}s` }}
        >
          {e}
        </span>
      ))}
    </div>
  );
}
