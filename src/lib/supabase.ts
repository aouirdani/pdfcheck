import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// These are safe to expose in client-side code (Supabase uses RLS for security)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

export type SupabaseClient = typeof supabase;
