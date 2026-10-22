"use client";

import { useState } from "react";
import { CoupleIcon } from "./art";
import { coupleBorder } from "@/lib/colors";

// Couple photo from /public/couples/c{idx}.jpg, ringed in the couple color,
// with the mascot as a corner badge. Falls back to the mascot alone if there's no photo.
export function CoupleAvatar({ idx, className = "", badge = true }: { idx: number; className?: string; badge?: boolean }) {
  const [missing, setMissing] = useState(false);
  if (missing) return <CoupleIcon idx={idx} className={className} />;
  return (
    <span className={`relative inline-block shrink-0 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/couples/c${idx}.jpg`}
        alt=""
        onError={() => setMissing(true)}
        className={`size-full rounded-full border-2 object-cover ${coupleBorder[idx]}`}
      />
      {badge && <CoupleIcon idx={idx} className="absolute -bottom-1 -left-1 size-[45%] drop-shadow" />}
    </span>
  );
}
