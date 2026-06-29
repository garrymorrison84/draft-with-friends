import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    return {
      client: null,
      error: "Missing NEXT_PUBLIC_SUPABASE_URL",
    };
  }

  if (!serviceRoleKey) {
    return {
      client: null,
      error: "Missing SUPABASE_SERVICE_ROLE_KEY",
    };
  }

  return {
    client: createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    }),
    error: null,
  };
}
