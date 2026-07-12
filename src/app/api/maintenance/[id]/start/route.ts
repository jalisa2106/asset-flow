import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return apiError('Not authenticated', 401);
  if (!can.approveMaintenance(profile)) return unauthorized();

  const { data, error } = await supabase
    .from('maintenance_requests')
    .update({ status: 'In Progress' })
    .eq('id', id)
    .eq('status', 'Technician Assigned')
    .select()
    .single();

  if (error) return fromPostgresError(error);
  if (!data) return apiError('Request must be in Technician Assigned status to start work', 409);

  await supabase.rpc('log_activity', { p_actor_id: profile.id, p_action: 'maintenance.started', p_entity_type: 'maintenance_request', p_entity_id: id, p_metadata: {} });
  return NextResponse.json({ data });
}
