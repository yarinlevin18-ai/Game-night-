"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, type Couple } from "@/lib/supabase";
import { getMe, setMe } from "@/lib/session";
import { coupleBorder, coupleBg } from "@/lib/colors";

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
        <div className="text-6xl">🍷🎲</div>
        <h1 className="mt-3 text-4xl font-black">ערב זוגות</h1>
        <p className="mt-1 text-mute">רק זוג אחד יוצא מכאן עם כבוד</p>
      </header>

      <label className="flex flex-col gap-2">
        <span className="font-medium">קוד חדר</span>
        <input
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="rounded-2xl border-2 border-line bg-card px-4 py-3 text-center text-3xl tracking-[0.5em] outline-none focus:border-pop"
          placeholder="0000"
          dir="ltr"
        />
      </label>

      {error && <p className="text-center text-pop">{error}</p>}

      {couples.length > 0 && (
        <>
          <label className="flex flex-col gap-2">
            <span className="font-medium">איך קוראים לך?</span>
            <input
              value={name}
              maxLength={30}
              onChange={(e) => setName(e.target.value)}
              className="rounded-2xl border-2 border-line bg-card px-4 py-3 text-xl outline-none focus:border-pop"
              placeholder="השם שלך"
            />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-medium">עם מי באת?</legend>
            <div className="grid grid-cols-2 gap-3">
              {couples.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCoupleId(c.id)}
                  className={`flex items-center gap-2 rounded-2xl border-2 bg-card px-3 py-4 text-lg font-bold transition ${
                    coupleId === c.id ? `${coupleBorder[c.idx]} scale-105` : "border-line"
                  }`}
                >
                  <span className={`size-4 shrink-0 rounded-full ${coupleBg[c.idx]}`} />
                  {c.name}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            disabled={!ready || busy}
            className="rounded-2xl bg-pop py-4 text-2xl font-black text-white shadow-lg shadow-pop/30 transition active:scale-95 disabled:opacity-40"
          >
            {busy ? "נכנסים…" : "יאללה, נכנסים"}
          </button>
        </>
      )}
    </form>
  );
}
