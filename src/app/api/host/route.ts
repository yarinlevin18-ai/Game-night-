import { NextResponse } from "next/server";

// Checks the host PIN server-side so it never ships in the client bundle.
export async function POST(req: Request) {
  const { pin } = await req.json().catch(() => ({ pin: "" }));
  const ok = !!process.env.HOST_PIN && String(pin) === process.env.HOST_PIN;
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}
