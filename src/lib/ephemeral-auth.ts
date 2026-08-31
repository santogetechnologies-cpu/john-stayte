import { createClient } from "@supabase/supabase-js";

/**
 * Ephemeral Supabase Client:
 * Uses in-memory session handling (persistSession: false) so that calling
 * signUp() on this client NEVER replaces, overwrites, or corrupts the
 * administrator's active session in localStorage.
 */
export const getEphemeralAuthClient = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};
