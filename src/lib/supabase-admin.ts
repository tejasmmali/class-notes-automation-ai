/*
  Server-only Supabase client.

  Uses the service-role key, which bypasses RLS — so this module must never be
  imported from a Client Component. There is no auth in the MVP, so every read
  and write goes through here and the tables stay unreachable from the browser
  (RLS is on with no policies).
*/

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const AUDIO_BUCKET = "lectures";

/* Thrown when the Supabase environment variables are missing. Callers turn this
   into a "not configured" message rather than a 500 with a stack trace. */
export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase environment variables are not set.");
    this.name = "SupabaseNotConfiguredError";
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (typeof window !== "undefined") {
    /* Guards against this module being pulled into a client bundle. */
    throw new Error("supabaseAdmin() is server-only.");
  }

  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new SupabaseNotConfiguredError();

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
