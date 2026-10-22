// Who am I on this phone, per room. No auth: just a player id in localStorage.
export type Me = { playerId: string; name: string; coupleId: string };

const key = (code: string) => `cn:me:${code}`;

export function getMe(code: string): Me | null {
  try {
    const raw = localStorage.getItem(key(code));
    return raw ? (JSON.parse(raw) as Me) : null;
  } catch {
    return null;
  }
}

export function setMe(code: string, me: Me) {
  try {
    localStorage.setItem(key(code), JSON.stringify(me));
  } catch {}
}

export function clearMe(code: string) {
  try {
    localStorage.removeItem(key(code));
  } catch {}
}
