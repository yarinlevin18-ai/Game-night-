"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, type Couple, type Player } from "@/lib/supabase";
import { getMe, setMe } from "@/lib/session";
import { coupleBorder, coupleShadow, coupleText, coupleTint, delay } from "@/lib/colors";
import { buzz } from "@/lib/ux";
import { Arrow, Check, Dice, Glass, Heart } from "@/components/art";
import { CoupleAvatar } from "@/components/CoupleAvatar";

export default function Page() {
  return (
    <Suspense>
      <Join />
    </Suspense>
  );
}

type Status = "idle" | "loading" | "missing" | "ready";

function Join() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [name, setName] = useState("");
  const [couples, setCouples] = useState<Couple[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Load the room once the code looks complete.
  useEffect(() => {
    setCouples([]);
    setCoupleId(null);
    setError(null);
    if (!/^\d{4}$/.test(code)) {
      setStatus("idle");
      return;
    }
    if (getMe(code)) {
      router.replace(`/room/${code}`);
      return;
    }
    setStatus("loading");
    let live = true;
    Promise.all([
      supabase.from("cn_couples").select("*").eq("room_code", code).order("idx"),
      supabase.from("cn_players").select("*").eq("room_code", code).order("created_at"),
    ]).then(([c, p]) => {
      if (!live) return;
      if (c.error) {
        setStatus("idle");
        setError("אין חיבור. בדקו את האינטרנט ונסו שוב");
      } else if (!c.data.length) {
        setStatus("missing");
        buzz(40);
      } else {
        setCouples(c.data);
        setPlayers(p.data ?? []);
        setStatus("ready");
        // Room found: send the keyboard straight to the name field.
        setTimeout(() => nameRef.current?.focus(), 350);
      }
    });
    return () => {
      live = false;
    };
  }, [code, router]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!coupleId || !n || busy) return;
    setBusy(true);
    setError(null);

    // Same name in the same couple = same person on a new phone/tab. Reuse them.
    const existing = players.find((p) => p.couple_id === coupleId && p.name === n);
    let id = existing?.id;
    if (!id) {
      const { data, error } = await supabase
        .from("cn_players")
        .insert({ room_code: code, couple_id: coupleId, name: n })
        .select()
        .single();
      if (error || !data) {
        setBusy(false);
        setError("משהו נתקע. נסו שוב");
        buzz(40);
        return;
      }
      id = data.id as string;
    }
    buzz(20);
    setMe(code, { playerId: id, name: n, coupleId });
    router.push(`/room/${code}`);
  }

  const n = name.trim();
  const ready = status === "ready" && coupleId && n;
  const cta = busy ? "נכנסים…" : !n ? "איך קוראים לך?" : !coupleId ? "בחרו זוג" : "יאללה, נכנסים";

  return (
    <form onSubmit={join} className="flex flex-col gap-6 pt-6 pb-28">
      <header className="text-center">
        <div className="flex items-end justify-center gap-2">
          <Glass className="size-16 animate-float drop-shadow-[0_8px_16px_rgb(255_79_139/0.45)]" />
          <Dice className="size-20 animate-float drop-shadow-[0_8px_16px_rgb(155_107_255/0.5)] [animation-delay:-1.2s]" />
          <Heart className="size-16 animate-float drop-shadow-[0_8px_16px_rgb(255_79_139/0.45)] [animation-delay:-2.4s]" />
        </div>
        <h1 className="mt-4 animate-pop text-5xl font-black text-party [animation-delay:150ms]">ערב זוגות</h1>
        <p className="mt-2 animate-rise text-mute [animation-delay:300ms]">רק זוג אחד יוצא מכאן עם כבוד</p>
      </header>

      <label className="flex animate-rise flex-col gap-2 [animation-delay:400ms]">
        <span className="flex items-center justify-between font-medium">
          קוד חדר
          <StatusTag status={status} />
        </span>
        <input
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={code}
          autoFocus={!code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          aria-invalid={status === "missing"}
          className={`card rounded-2xl border-2 px-4 py-3 text-center text-3xl font-black tracking-[0.5em] outline-none transition focus:shadow-lg ${
            status === "missing"
              ? "animate-shake !border-pop"
              : status === "ready"
                ? "!border-c4 shadow-c4/30"
                : "!border-line focus:!border-sun focus:shadow-sun/30"
          }`}
          placeholder="0000"
          dir="ltr"
        />
        {status === "missing" && (
          <span className="animate-rise text-center text-sm font-bold text-pop">אין חדר כזה. בדקו שוב את הקוד מהקבוצה</span>
        )}
      </label>

      {status === "loading" && <Skeleton />}

      {status === "ready" && (
        <>
          <label className="flex animate-rise flex-col gap-2">
            <span className="font-medium">איך קוראים לך?</span>
            <input
              ref={nameRef}
              value={name}
              maxLength={30}
              autoComplete="given-name"
              enterKeyHint="next"
              onChange={(e) => setName(e.target.value)}
              className="card rounded-2xl border-2 !border-line px-4 py-3 text-xl outline-none transition focus:!border-c2 focus:shadow-lg focus:shadow-c2/30"
              placeholder="השם שלך"
            />
          </label>

          <fieldset className="flex animate-rise flex-col gap-2 [animation-delay:100ms]">
            <legend className="mb-2 font-medium">עם מי באת?</legend>
            <div className="grid grid-cols-2 gap-3">
              {couples.map((c, i) => {
                const on = coupleId === c.id;
                const members = players.filter((p) => p.couple_id === c.id);
                return (
                  <div key={c.id} className="animate-pop" style={delay(i + 2, 80)}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setCoupleId(c.id);
                        buzz();
                      }}
                      className={`flex min-h-32 w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 px-3 py-3 text-lg font-bold transition duration-300 active:scale-95 ${
                        coupleTint[c.idx]
                      } ${
                        on
                          ? `${coupleBorder[c.idx]} animate-wiggle scale-105 shadow-xl ${coupleShadow[c.idx]}`
                          : "border-transparent opacity-85"
                      }`}
                    >
                      <span className={`relative size-16 transition duration-300 ${on ? "scale-115" : ""}`}>
                        <CoupleAvatar idx={c.idx} className="size-full" />
                        {on && <Check className="absolute -top-1.5 -left-2 size-6 animate-pop" />}
                      </span>
                      <span className={on ? coupleText[c.idx] : ""}>{c.name}</span>
                      <span className="line-clamp-1 text-xs font-normal text-mute">
                        {members.length ? members.map((m) => m.name).join(" + ") : "עוד ריק"}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <p key={error} role="alert" className="animate-shake text-center font-bold text-pop">
              {error}
            </p>
          )}

          {/* Pinned to the bottom so it stays reachable above the keyboard */}
          <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md bg-gradient-to-t from-bg via-bg/90 to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              disabled={!ready || busy}
              className={`w-full animate-rise rounded-2xl py-4 text-2xl font-black text-white transition duration-300 active:scale-95 [animation-delay:200ms] ${
                ready ? "bg-party animate-glow" : "bg-line text-mute"
              }`}
            >
              {busy && <span className="me-2 inline-block size-5 animate-spin rounded-full border-3 border-white/30 border-t-white align-middle" />}
              {cta}
              {ready && !busy && <Arrow className="ms-2 inline-block size-6 align-[-4px]" />}
            </button>
          </div>
        </>
      )}

      {status !== "ready" && error && (
        <p key={error} role="alert" className="animate-shake text-center font-bold text-pop">
          {error}
        </p>
      )}
    </form>
  );
}

function StatusTag({ status }: { status: Status }) {
  if (status === "loading")
    return (
      <span className="flex items-center gap-1.5 text-sm text-mute">
        <span className="size-3 animate-spin rounded-full border-2 border-mute/30 border-t-sun" />
        בודקים…
      </span>
    );
  if (status === "ready") return <span className="animate-pop text-sm font-bold text-c4">✓ נמצא!</span>;
  return null;
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="h-14 animate-pulse rounded-2xl bg-white/5" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/5" style={delay(i, 120)} />
        ))}
      </div>
    </div>
  );
}
