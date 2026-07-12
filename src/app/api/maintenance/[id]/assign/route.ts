import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { assignTechnicianSchema } from '@/lib/validators/maintenance.schema';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getCurrentProfile();
  if (!can.approveMaintenance(profile)) return unauthorized();

  const parsed = assignTechnicianSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { data, error } = await supabase
    .from('maintenance_requests')
    .update({ 
      assigned_to: parsed.data.technicianId,
      status: 'In Progress'
    })
    .eq('id', id)
    .in('status', ['Approved', 'Pending'])
    .select()
    .single();

  if (error) return fromPostgresError(error);

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'maintenance.assigned', p_entity_type: 'maintenance', p_entity_id: id,
    p_metadata: { assigned_to: parsed.data.technicianId },
  });

  return NextResponse.json({ data });
}
