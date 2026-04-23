import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim() ||
  "https://placeholder.local";
const supabaseAnonKey =
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim() ||
  "placeholder-anon-key";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
