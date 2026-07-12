import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// SERVER-ONLY. Never import this file in a "use client" component.
// Bypasses RLS — use only for operations that must run with elevated privilege
// (e.g. reading auth.users metadata during admin promotion flows).
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
