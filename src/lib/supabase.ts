import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
);

export type Couple = { id: string; room_code: string; idx: number; name: string; score: number };
export type Player = { id: string; room_code: string; couple_id: string; name: string };
