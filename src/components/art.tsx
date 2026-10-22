// Hand-drawn SVG sticker set: bold shapes, palette gradients, dark outline, glossy highlight.
// One style for every icon so the app reads as one thing (instead of mixed emoji fonts).
import { useId } from "react";

const OUT = "#1a1033";
type P = { className?: string; title?: string };

function Svg({ className, title, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      fill="none"
      stroke={OUT}
      strokeWidth={3}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

// Vertical gradient def + its url().
function useGrad(from: string, to: string) {
  const id = "g" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const def = (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={from} />
        <stop offset="1" stopColor={to} />
      </linearGradient>
    </defs>
  );
  return [def, `url(#${id})`] as const;
}

const Shine = ({ d }: { d: string }) => <path d={d} stroke="#fff" strokeOpacity={0.75} strokeWidth={3.5} />;

export function Dice(p: P) {
  const [def, fill] = useGrad("#ffffff", "#dccbff");
  return (
    <Svg {...p}>
      {def}
      <g transform="rotate(-10 32 32)">
        <rect x="10" y="10" width="44" height="44" rx="11" fill={fill} />
        {[
          [22, 22],
          [42, 22],
          [32, 32],
          [22, 42],
          [42, 42],
        ].map(([cx, cy]) => (
          <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="4" fill={cx === 32 ? "#ff4f8b" : OUT} stroke="none" />
        ))}
        <Shine d="M17 24 V19 Q17 16 20 16 H26" />
      </g>
    </Svg>
  );
}

export function Heart(p: P) {
  const [def, fill] = useGrad("#ff86b0", "#ff2e74");
  return (
    <Svg {...p}>
      {def}
      <path d="M32 54C12 41 6 30 9 21C12 12 25 10 32 20C39 10 52 12 55 21C58 30 52 41 32 54Z" fill={fill} />
      <Shine d="M16 22Q18 17 23 17" />
    </Svg>
  );
}

export function Glass(p: P) {
  const [def, fill] = useGrad("#ff5f9a", "#a3175b");
  return (
    <Svg {...p}>
      {def}
      <path d="M17 8H47C47 26 41 35 32 35C23 35 17 26 17 8Z" fill="#ffffff" fillOpacity={0.25} />
      <path d="M18.5 17H45.5C44 29 39 35 32 35C25 35 20 29 18.5 17Z" fill={fill} stroke="none" />
      <path d="M17 8H47C47 26 41 35 32 35C23 35 17 26 17 8Z" />
      <path d="M32 35V50" />
      <path d="M21 54Q32 48 43 54Z" fill="#b9a8e0" />
      <Shine d="M22 13V21" />
    </Svg>
  );
}

export function Card(p: P) {
  return (
    <Svg {...p}>
      <g transform="rotate(12 32 32)">
        <rect x="14" y="7" width="36" height="50" rx="7" fill="#fff" />
        <rect x="19" y="12" width="26" height="40" rx="4" stroke="#ffc93c" strokeWidth={2} />
        <path d="M32 40C24 35 22 31 23.5 28C25 25 29 25 32 29C35 25 39 25 40.5 28C42 31 40 35 32 40Z" fill="#ff4f8b" />
      </g>
    </Svg>
  );
}

export function Trophy(p: P) {
  const [def, fill] = useGrad("#ffe27a", "#f5a300");
  return (
    <Svg {...p}>
      {def}
      <path d="M18 13H10C10 24 14 29 21 29" />
      <path d="M46 13H54C54 24 50 29 43 29" />
      <path d="M17 8H47V20C47 31 40 38 32 38C24 38 17 31 17 20Z" fill={fill} />
      <path d="M28 38H36V46H28Z" fill={fill} />
      <rect x="19" y="46" width="26" height="10" rx="3" fill="#9b6bff" />
      <path d="M32 15L34.4 20 39.5 20.6 35.7 24 36.8 29 32 26.5 27.2 29 28.3 24 24.5 20.6 29.6 20Z" fill="#fff" strokeWidth={2} />
      <Shine d="M22 13V22" />
    </Svg>
  );
}

export function Hourglass(p: P) {
  const [def, fill] = useGrad("#ffe27a", "#ff9f1c");
  return (
    <Svg {...p}>
      {def}
      <path d="M20 12H44C44 24 35 28 35 32C35 36 44 40 44 52H20C20 40 29 36 29 32C29 28 20 24 20 12Z" fill="#fff" fillOpacity={0.2} />
      <path d="M24 18H40C38 24 34 26 32 29C30 26 26 24 24 18Z" fill={fill} stroke="none" />
      <path d="M22 51C24 43 29 40 32 39C35 40 40 43 42 51Z" fill={fill} stroke="none" />
      <path d="M32 31V39" stroke={fill} strokeWidth={2} className="animate-pulse" />
      <path d="M20 12H44C44 24 35 28 35 32C35 36 44 40 44 52H20C20 40 29 36 29 32C29 28 20 24 20 12Z" />
      <rect x="14" y="6" width="36" height="7" rx="3.5" fill="#9b6bff" />
      <rect x="14" y="51" width="36" height="7" rx="3.5" fill="#9b6bff" />
    </Svg>
  );
}

export function Sparkle(p: P) {
  const [def, fill] = useGrad("#fff3b0", "#ffc93c");
  return (
    <Svg {...p}>
      {def}
      <path d="M32 4C34 22 42 30 60 32C42 34 34 42 32 60C30 42 22 34 4 32C22 30 30 22 32 4Z" fill={fill} />
    </Svg>
  );
}

// --- couple mascots ---

export function Flame(p: P) {
  const [def, fill] = useGrad("#ffc93c", "#ff3d7f");
  return (
    <Svg {...p}>
      {def}
      <path d="M32 5C37 17 49 22 49 38C49 50 41 58 32 58C23 58 15 50 15 38C15 28 23 24 23 13C28 17 30 22 30 27C34 22 35 14 32 5Z" fill={fill} />
      <path d="M32 33C36 39 40 42 40 47C40 52 36 55 32 55C28 55 24 52 24 47C24 42 29 40 32 33Z" fill="#ffe9a0" strokeWidth={2.5} />
    </Svg>
  );
}

export function Drop(p: P) {
  const [def, fill] = useGrad("#8be3ff", "#1e8fff");
  return (
    <Svg {...p}>
      {def}
      <path d="M32 5C40 19 50 29 50 40C50 50 42 58 32 58C22 58 14 50 14 40C14 29 24 19 32 5Z" fill={fill} />
      <Shine d="M22 40Q22 33 27 28" />
    </Svg>
  );
}

export function Bolt(p: P) {
  const [def, fill] = useGrad("#fff07a", "#ffb000");
  return (
    <Svg {...p}>
      {def}
      <path d="M37 4L13 37H29L25 60L51 25H34Z" fill={fill} />
      <Shine d="M33 12L22 29" />
    </Svg>
  );
}

export function Leaf(p: P) {
  const [def, fill] = useGrad("#a6f7c8", "#22b86a");
  return (
    <Svg {...p}>
      {def}
      <path d="M11 53C11 25 29 9 55 9C55 37 39 53 11 53Z" fill={fill} />
      <path d="M11 53L42 22M24 40H34M30 34V24" strokeWidth={2.5} />
    </Svg>
  );
}

const mascots = [null, Flame, Drop, Bolt, Leaf];
export function CoupleIcon({ idx, ...p }: P & { idx: number }) {
  const M = mascots[idx] ?? Sparkle;
  return <M {...p} />;
}

// --- UI bits ---

export function Check(p: P) {
  return (
    <Svg {...p}>
      <circle cx="32" cy="32" r="26" fill="#6ee7a8" />
      <path d="M20 33L28 41L45 23" stroke="#fff" strokeWidth={6} />
    </Svg>
  );
}

// Points "forward" in RTL (to the left).
export function Arrow(p: P) {
  return (
    <svg viewBox="0 0 24 24" className={p.className} aria-hidden fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M11 6L5 12L11 18" />
    </svg>
  );
}
