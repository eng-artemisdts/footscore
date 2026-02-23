import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/shared/env";

export const supabase: SupabaseClient | null =
  env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY
    ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

export const isSupabaseConfigured = (): boolean => !!supabase;

