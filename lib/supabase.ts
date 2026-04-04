import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim() ||
  "https://placeholder.local";
const supabaseAnonKey =
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim() ||
  "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
