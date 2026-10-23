// הימורי הערב: bets placed before/early in the night, resolved by the host at the end.
// kind: who/what you pick. points: per correct bet, to the bettor's couple.
export type Prop = { id: string; q: string; kind: "player" | "couple" | "yesno"; points: number };

export const props: Prop[] = [
  { id: "winner", q: "איזה זוג ינצח הערב?", kind: "couple", points: 2 },
  { id: "last", q: "איזה זוג יסיים במקום האחרון?", kind: "couple", points: 1 },
  { id: "late", q: "מי יגיע אחרון?", kind: "player", points: 1 },
  { id: "sleepy", q: "מי יפהק / יירדם ראשון?", kind: "player", points: 1 },
  { id: "spill", q: "מי ישפוך משהו?", kind: "player", points: 1 },
  { id: "fight", q: "איזה זוג יתווכח ראשון (בצחוק... או שלא)?", kind: "couple", points: 1 },
  { id: "loud", q: "מי יצעק הכי חזק באמצע משחק?", kind: "player", points: 1 },
  { id: "laugh", q: "מי יבכה מצחוק ראשון?", kind: "player", points: 1 },
  { id: "phone", q: "מי יבדוק את הטלפון הכי הרבה?", kind: "player", points: 1 },
  { id: "imposter", q: "המתחזה ייתפס כבר בסבב הראשון?", kind: "yesno", points: 1 },
];
