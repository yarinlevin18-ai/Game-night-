"use client";

import { useEffect, useState } from "react";
import { isMuted, play, setMuted } from "@/lib/sound";

export function SoundToggle() {
  const [muted, setM] = useState(false);
  useEffect(() => setM(isMuted()), []);
  return (
    <button
      onClick={() => {
        setMuted(!muted);
        setM(!muted);
        if (muted) play("ding");
      }}
      aria-label={muted ? "הפעל צלילים" : "השתק"}
      className="grid size-9 place-items-center rounded-full bg-white/10 transition active:scale-90"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
        {muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />}
      </svg>
    </button>
  );
}
