"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ROOM } from "@/lib/room";
import { useRoom } from "@/lib/useRoom";
import { buzz } from "@/lib/ux";
import { coupleText } from "@/lib/colors";
import { Scoreboard } from "@/components/Scoreboard";
import { Trophy } from "@/components/art";

const HOST_KEY = "cn:host";
type Ev = { id: number; couple_id: string; delta: number; reason: string | null; created_at: string };

export default function Host() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      setAuthed(localStorage.getItem(HOST_KEY) === "1");
    } catch {
      setAuthed(false);
    }
  }, []);
  if (authed === null) return null;
  return authed ? <Console /> : <PinGate onOk={() => setAuthed(true)} />;
}

function PinGate({ onOk }: { onOk: () => void }) {
  const [pin, setPin] = useState("");
  const [bad, setBad] = useState(0);
  const [busy, setBusy] = useState(false);

  async function submit(p: string) {
    setBusy(true);
    const r = await fetch("/api/host", { method: "POST", body: JSON.stringify({ pin: p }) }).catch(() => null);
    setBusy(false);
    if (r?.ok) {
      try {
        localStorage.setItem(HOST_KEY, "1");
      } catch {}
      buzz(20);
      onOk();
    } else {
      buzz(60);
      setBad((b) => b + 1);
      setPin("");
    }
  }

  function press(d: string) {
    if (busy) return;
    const next = (pin + d).slice(0, 4);
    setPin(next);
    buzz(8);
    if (next.length === 4) submit(next);
  }

  return (
    <div className="flex flex-col items-center gap-8 pt-14">
      <Trophy className="size-20 animate-float" />
      <h1 className="animate-pop text-3xl font-black">מסך מנחה</h1>
      <div key={bad} className={`flex gap-3 ${bad ? "animate-shake" : ""}`} dir="ltr">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`size-4 rounded-full transition ${i < pin.length ? "scale-110 bg-sun" : "bg-white/15"}`} />
        ))}
      </div>
      {bad > 0 && <p className="-mt-4 text-sm font-bold text-pop">PIN שגוי</p>}
      <div className="grid w-64 grid-cols-3 gap-3" dir="ltr">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              onClick={() => (k === "⌫" ? setPin((p) => p.slice(0, -1)) : press(k))}
              className="card aspect-square rounded-2xl text-2xl font-black transition active:scale-90 active:bg-white/20"
            >
              {k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function Console() {
  const { couples, players, online, conn } = useRoom({});
  const [events, setEvents] = useState<Ev[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);

  const loadEvents = useCallback(async () => {
    const { data } = await supabase.from("cn_score_events").select("*").eq("room_code", ROOM).order("id", { ascending: false }).limit(6);
    if (data) setEvents(data);
  }, []);

  useEffect(() => {
    loadEvents();
    const ch = supabase
      .channel(`host-events-${ROOM}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cn_score_events", filter: `room_code=eq.${ROOM}` }, loadEvents)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [loadEvents]);

  async function award(coupleId: string, delta: number) {
    buzz(12);
    await supabase.rpc("cn_award", { p_couple: coupleId, p_delta: delta, p_reason: null });
  }

  async function undo() {
    const last = events[0];
    if (!last) return;
    buzz(20);
    // Delete first so a double tap can't undo the same event twice.
    const { data } = await supabase.from("cn_score_events").delete().eq("id", last.id).select("id");
    if (data?.length) await supabase.rpc("cn_add_points", { p_couple: last.couple_id, p_delta: -last.delta });
  }

  async function resetAll() {
    setConfirmReset(false);
    buzz(40);
    await supabase.from("cn_score_events").delete().eq("room_code", ROOM);
    await supabase.from("cn_couples").update({ score: 0 }).eq("room_code", ROOM);
  }

  const name = (id: string) => couples.find((c) => c.id === id);
  const here = players.filter((p) => online.has(p.id)).length;

  return (
    <div className="flex flex-col gap-5 pb-10">
      <header className="flex items-center justify-between">
        <h1 className="animate-pop text-2xl font-black text-party">מסך מנחה</h1>
        <span className="flex items-center gap-1.5 text-sm text-mute">
          <span className={`size-2.5 rounded-full ${conn === "live" ? "bg-c4" : conn === "down" ? "bg-pop" : "bg-sun"}`} />
          {here}/{players.length || 8} מחוברים
        </span>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">ניקוד</h2>
        <Scoreboard couples={couples}>
          {(c) => (
            <div className="flex gap-1.5" dir="ltr">
              {[-1, 1, 2, 3, 5].map((d) => (
                <button
                  key={d}
                  onClick={() => award(c.id, d)}
                  className={`flex-1 rounded-xl py-2 text-lg font-black transition active:scale-90 ${
                    d < 0 ? "bg-black/30 text-pop" : "bg-black/25 text-ink active:bg-white/25"
                  }`}
                >
                  {d > 0 ? `+${d}` : d}
                </button>
              ))}
            </div>
          )}
        </Scoreboard>
      </section>

      <section className="card flex flex-col gap-2 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">אחרונים</h2>
          <button
            onClick={undo}
            disabled={!events.length}
            className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold transition active:scale-95 disabled:opacity-30"
          >
            ↶ ביטול אחרון
          </button>
        </div>
        {events.length === 0 && <p className="text-sm text-mute">עוד לא חולקו נקודות</p>}
        {events.map((e, i) => {
          const c = name(e.couple_id);
          return (
            <p key={e.id} className={`flex justify-between text-sm ${i === 0 ? "animate-rise" : "opacity-70"}`}>
              <span className={c ? coupleText[c.idx] : ""}>{c?.name}</span>
              <b className={e.delta > 0 ? "text-c4" : "text-pop"} dir="ltr">
                {e.delta > 0 ? `+${e.delta}` : e.delta}
              </b>
            </p>
          );
        })}
      </section>

      {confirmReset ? (
        <div className="flex animate-pop gap-2">
          <button onClick={resetAll} className="flex-1 rounded-2xl bg-pop py-3 font-black text-white">
            כן, לאפס הכל
          </button>
          <button onClick={() => setConfirmReset(false)} className="flex-1 rounded-2xl bg-white/10 py-3 font-bold">
            ביטול
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirmReset(true)} className="mx-auto text-sm text-mute underline underline-offset-4">
          איפוס ניקוד
        </button>
      )}
    </div>
  );
}
