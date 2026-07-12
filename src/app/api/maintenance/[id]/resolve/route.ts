import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { resolveMaintenanceSchema } from '@/lib/validators/maintenance.schema';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getCurrentProfile();
  
  if (!can.approveMaintenance(profile)) return unauthorized();

  const parsed = resolveMaintenanceSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { data, error } = await supabase
    .from('maintenance_requests')
    .update({ 
      status: 'Resolved',
      resolved_at: new Date().toISOString(),
      resolution_notes: parsed.data.notes
    })
    .eq('id', id)
    .eq('status', 'In Progress')
    .select()
    .single();

  if (error) return fromPostgresError(error);

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'maintenance.resolved', p_entity_type: 'maintenance', p_entity_id: id,
    p_metadata: { notes: parsed.data.notes },
  });

  return NextResponse.json({ data });
}
