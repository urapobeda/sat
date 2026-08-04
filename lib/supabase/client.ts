import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

let browserClient: SupabaseClient<Database> | null = null;

export class SupabaseConfigurationError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local."
    );
    this.name = "SupabaseConfigurationError";
  }
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabaseConfigDiagnostics() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const normalizedUrl = normalizeSupabaseUrl(supabaseUrl);
  const normalizedKey = supabaseAnonKey?.trim();

  return {
    anonKeyPresent: Boolean(normalizedKey),
    keyLooksUsable:
      Boolean(normalizedKey) &&
      (normalizedKey?.startsWith("sb_publishable_") ||
        normalizedKey?.split(".").length === 3),
    urlLooksUsable:
      Boolean(normalizedUrl) &&
      normalizedUrl?.startsWith("https://") &&
      normalizedUrl?.includes(".supabase.co"),
    urlPresent: Boolean(normalizedUrl)
  };
}

export function getSupabaseBrowserClient() {
  const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new SupabaseConfigurationError();
  }

  if (!browserClient) {
    browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  return browserClient;
}

export function normalizeSupabaseUrl(value?: string) {
  return value
    ?.trim()
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/auth\/v1\/?$/i, "")
    .replace(/\/storage\/v1\/?$/i, "")
    .replace(/\/+$/g, "");
}
