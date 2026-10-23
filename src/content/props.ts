// הימורי הערב: bets placed before the night, resolved by the host at the end.
// kind: what you pick. points: per correct bet, to the bettor's couple (harder calls pay 2).
// auto: the host's "fill from the night" button resolves it from game data.
export type Prop = {
  id: string;
  q: string;
  kind: "player" | "couple" | "yesno" | "choice";
  options?: string[];
  points: number;
  auto?: boolean;
};

export const props: Prop[] = [
  { id: "winner", q: "איזה זוג ינצח הערב?", kind: "couple", points: 2, auto: true },
  { id: "last", q: "איזה זוג יסיים במקום האחרון?", kind: "couple", points: 1, auto: true },
  { id: "star", q: "מי ייבחר הכי הרבה פעמים ב״מי הכי סביר ש...״?", kind: "player", points: 2, auto: true },
  { id: "liar", q: "מי יעבוד על הכי הרבה אנשים ב״אמת או שקר״?", kind: "player", points: 2, auto: true },
  { id: "escape", q: "מתחזה כלשהו יצליח לברוח הערב בלי להיתפס?", kind: "yesno", points: 1, auto: true },
  { id: "cheat", q: "מי ייתפס מרמה בטאבו?", kind: "player", points: 1 },
  { id: "wedding", q: "מי ישאל ראשון ״נו, אז מתי אתם מתחתנים / מביאים ילד?״", kind: "player", points: 1 },
  { id: "blame", q: "מי יאשים את האפליקציה כשהוא מפסיד?", kind: "player", points: 1 },
  { id: "leave", q: "מי יגיד ראשון ״טוב, אנחנו זזים״?", kind: "player", points: 1 },
  { id: "hour", q: "מתי ייגמר הערב?", kind: "choice", options: ["לפני 23:00", "23:00–00:00", "00:00–01:00", "אחרי 01:00"], points: 2 },
  { id: "bottles", q: "כמה בקבוקים (יין / אלכוהול) ייגמרו הערב?", kind: "choice", options: ["0–1", "2–3", "4–5", "6 ומעלה"], points: 2 },
  { id: "loudest", q: "באיזה משחק יהיו הכי הרבה צעקות?", kind: "choice", options: ["המתחזה", "טאבו", "אמת או שקר", "מי הכי מהיר"], points: 1 },
];

// Options for a prop, shared by the bets page and the host panel.
export function propOptions(
  p: Prop,
  players: { id: string; name: string; couple_id: string }[],
  couples: { id: string; name: string; idx: number }[],
): { v: string; label: string; idx?: number }[] {
  if (p.kind === "player") return players.map((x) => ({ v: x.id, label: x.name, idx: couples.find((c) => c.id === x.couple_id)?.idx }));
  if (p.kind === "couple") return couples.map((c) => ({ v: c.id, label: c.name, idx: c.idx }));
  if (p.kind === "yesno")
    return [
      { v: "yes", label: "כן" },
      { v: "no", label: "לא" },
    ];
  return (p.options ?? []).map((o) => ({ v: o, label: o }));
}
