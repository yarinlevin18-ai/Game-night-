"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, type Couple } from "@/lib/supabase";
import { getMe, setMe } from "@/lib/session";
import { coupleBorder, coupleEmoji, coupleShadow, coupleText, coupleTint, delay } from "@/lib/colors";

export default function Page() {
  return (
    <Suspense>
      <Join />
    </Suspense>
  );
}

function Join() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [name, setName] = useState("");
  const [couples, setCouples] = useState<Couple[]>([]);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Load couples once the code looks complete.
  useEffect(() => {
    setCouples([]);
    setCoupleId(null);
    if (!/^\d{4}$/.test(code)) return;
    if (getMe(code)) {
      router.replace(`/room/${code}`);
      return;
    }
    let live = true;
    supabase
      .from("cn_couples")
      .select("*")
      .eq("room_code", code)
      .order("idx")
      .then(({ data }) => {
        if (!live) return;
        if (!data?.length) setError("אין חדר כזה. בדקו שוב את הקוד");
        else {
          setError(null);
          setCouples(data);
        }
      });
    return () => {
      live = false;
    };
  }, [code, router]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!coupleId || !name.trim()) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("cn_players")
      .insert({ room_code: code, couple_id: coupleId, name: name.trim() })
      .select()
      .single();
    setBusy(false);
    if (error || !data) {
      setError("משהו נתקע. נסו שוב");
      return;
    }
    setMe(code, { playerId: data.id, name: data.name, coupleId });
    router.push(`/room/${code}`);
  }

  const ready = couples.length > 0 && coupleId && name.trim();

  return (
    <form onSubmit={join} className="flex flex-col gap-6 pt-8">
      <header className="text-center">
        <div className="flex justify-center gap-3 text-6xl">
          <span className="inline-block animate-float">🍷</span>
          <span className="inline-block animate-float [animation-delay:-1.2s]">🎲</span>
          <span className="inline-block animate-float [animation-delay:-2.4s]">💘</span>
        </div>
        <h1 className="mt-4 animate-pop text-5xl font-black text-party [animation-delay:150ms]">ערב זוגות</h1>
        <p className="mt-2 animate-rise text-mute [animation-delay:300ms]">רק זוג אחד יוצא מכאן עם כבוד</p>
      </header>

      <label className="flex animate-rise flex-col gap-2 [animation-delay:400ms]">
        <span className="font-medium">קוד חדר</span>
        <input
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="card rounded-2xl border-2 !border-line px-4 py-3 text-center text-3xl font-black tracking-[0.5em] outline-none transition focus:!border-sun focus:shadow-lg focus:shadow-sun/30"
          placeholder="0000"
          dir="ltr"
        />
      </label>

      {error && (
        <p key={error} className="animate-shake text-center font-bold text-pop">
          {error}
        </p>
      )}

      {couples.length > 0 && (
        <>
          <label className="flex animate-rise flex-col gap-2">
            <span className="font-medium">איך קוראים לך?</span>
            <input
              value={name}
              maxLength={30}
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
                return (
                  <div key={c.id} className="animate-pop" style={delay(i + 2, 80)}>
                    <button
                      type="button"
                      onClick={() => setCoupleId(c.id)}
                      className={`flex w-full flex-col items-center gap-1 rounded-2xl border-2 px-3 py-4 text-lg font-bold transition duration-300 active:scale-95 ${
                        coupleTint[c.idx]
                      } ${
                        on
                          ? `${coupleBorder[c.idx]} animate-wiggle scale-105 shadow-xl ${coupleShadow[c.idx]}`
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                    >
                      <span className={`text-3xl transition duration-300 ${on ? "scale-125" : ""}`}>
                        {coupleEmoji[c.idx]}
                      </span>
                      <span className={on ? coupleText[c.idx] : ""}>{c.name}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </fieldset>

          <button
            disabled={!ready || busy}
            className={`animate-rise rounded-2xl py-4 text-2xl font-black text-white transition duration-300 active:scale-95 disabled:opacity-40 [animation-delay:200ms] ${
              ready ? "bg-party animate-glow" : "bg-line"
            }`}
          >
            {busy ? "נכנסים…" : "יאללה, נכנסים 🚀"}
          </button>
        </>
      )}
    </form>
  );
}
