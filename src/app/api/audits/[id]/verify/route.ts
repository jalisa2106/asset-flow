import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { verifyAuditItemSchema } from '@/lib/validators/audit.schema';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getCurrentProfile();

  const parsed = verifyAuditItemSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);
  const v = parsed.data;

  const { data: cycle, error: cycleError } = await supabase
    .from('audit_cycles')
    .select(`status, audit_cycle_auditors(employee_id)`)
    .eq('id', id)
    .single();

  if (cycleError || !cycle) return apiError('Audit cycle not found', 404);
  if (cycle.status !== 'Open') return apiError('Audit cycle is not active', 400);

  const assignedAuditors = cycle.audit_cycle_auditors.map((a: any) => a.employee_id);
  if (!can.verifyAuditItem(profile, assignedAuditors)) return unauthorized();

  const { data, error } = await supabase
    .from('audit_items')
    .update({ 
      verification: v.verification,
      notes: v.notes,
      verified_by: profile!.id,
      verified_at: new Date().toISOString()
    })
    .eq('audit_cycle_id', id)
    .eq('asset_id', v.assetId)
    .select()
    .single();

  if (error) return fromPostgresError(error);

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'audit.verified', p_entity_type: 'audit_cycle', p_entity_id: id,
    p_metadata: { asset_id: v.assetId, verification: v.verification },
  });

  return NextResponse.json({ data });
}
