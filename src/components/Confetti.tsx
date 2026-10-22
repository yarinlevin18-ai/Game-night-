"use client";

import { useMemo } from "react";

const COLORS = ["#ff4f8b", "#3cc8ff", "#ffc93c", "#6ee7a8", "#b86bff", "#ffffff"];

// CSS-only confetti burst. Re-mount (change key) to fire again.
export function Confetti({ count = 90 }: { count?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2.4 + Math.random() * 2,
        drift: (Math.random() - 0.5) * 160,
        spin: (Math.random() - 0.5) * 1440,
        size: 6 + Math.random() * 8,
        round: i % 3 === 0,
        color: COLORS[i % COLORS.length],
      })),
    [count],
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {bits.map((b, i) => (
        <span
          key={i}
          className="absolute -top-4 block"
          style={
            {
              left: `${b.left}%`,
              width: b.size,
              height: b.round ? b.size : b.size * 0.45,
              borderRadius: b.round ? 999 : 2,
              background: b.color,
              animation: `confetti ${b.dur}s cubic-bezier(.2,.6,.4,1) ${b.delay}s both`,
              "--dx": `${b.drift}px`,
              "--rot": `${b.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
