import { createClient } from '@/lib/supabase/server';
import type { EmployeeProfile } from '@/lib/permissions';

export async function getCurrentProfile(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email?: string } | null;
  profile: EmployeeProfile | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from('employee_profiles')
    .select('id, role, department_id, status, full_name')
    .eq('id', user.id)
    .single();

  return { supabase, user, profile: (profile as EmployeeProfile) ?? null };
}
