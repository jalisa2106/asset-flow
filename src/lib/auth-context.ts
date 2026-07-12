import { createClient } from '@/lib/supabase/server';
import type { EmployeeProfile } from '@/lib/permissions';

export async function getCurrentProfile(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; profile: EmployeeProfile | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, profile: null };

  const { data: profile } = await supabase
    .from('employee_profiles')
    .select('id, role, department_id, status')
    .eq('id', user.id)
    .single();

  return { supabase, profile: profile as EmployeeProfile | null };
}
