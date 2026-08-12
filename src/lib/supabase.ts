import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "[Supabase Client Warning] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY environment variables.",
  );
}

export const supabase = createClient<Database>(
  supabaseUrl || "https://rviglajarujfktrqqhoh.supabase.co",
  supabaseKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

/**
 * Performs a real connection test against the remote Supabase project.
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  details?: unknown;
}> {
  try {
    // Probe test: query profiles schema or auth state
    const { data, error } = await supabase.from("profiles").select("id", { count: "exact", head: true });

    if (error) {
      // 42P01: Table does not exist yet (schema pending application)
      // PGRST116: Single row not found
      if (error.code === "42P01") {
        return {
          connected: true,
          message: "Supabase endpoint connected successfully (Database schema migrations pending application).",
        };
      }
      return {
        connected: false,
        message: `Supabase connection error: ${error.message} (Code: ${error.code})`,
        details: error,
      };
    }

    return {
      connected: true,
      message: "Supabase connected successfully to remote project.",
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Failed to connect to Supabase: ${err?.message || "Network error"}`,
      details: err,
    };
  }
}
