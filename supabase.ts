import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function normalizeSupabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (/\/(rest|auth|storage|realtime)\/v1/i.test(parsed.pathname)) {
      return `${parsed.protocol}//${parsed.host}`;
    }
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.protocol}//${parsed.host}${cleanPath}`;
  } catch {
    return trimmed
      .replace(/(?:\/+(?:rest|auth|storage|realtime)\/v1)+\/?$/i, '')
      .replace(/\/+$/, '');
  }
}

const rawSupabaseUrl = import.meta.env?.VITE_SUPABASE_URL as string | undefined;
const rawSupabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);
export const supabaseAnonKey = rawSupabaseAnonKey?.trim() || undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project-ref') &&
    !supabaseAnonKey.includes('your-supabase-anon-key')
);

/**
 * Shared Supabase client instance.
 * Remains null until environment variables are configured during backend setup.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
