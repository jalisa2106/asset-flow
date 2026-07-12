import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { promoteRoleSchema } from '@/lib/validators/org-setup.schema';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getCurrentProfile();
  if (!can.promoteEmployee(profile)) return unauthorized();

  const parsed = promoteRoleSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);
  const v = parsed.data;

  const { data, error } = await supabase
    .from('employee_profiles')
    .update({ 
      role: v.role,
      department_id: v.departmentId ?? null
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return fromPostgresError(error);

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'employee.promoted', p_entity_type: 'employee', p_entity_id: id,
    p_metadata: { role: v.role, department_id: v.departmentId },
  });

  return NextResponse.json({ data });
}
