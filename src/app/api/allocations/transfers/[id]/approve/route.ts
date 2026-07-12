import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { unauthorized, fromPostgresError } from '@/lib/api-response';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getCurrentProfile();
  if (!can.approveTransfer(profile)) return unauthorized();

<<<<<<< HEAD
  const { error } = await supabase.rpc('approve_transfer', {
    p_transfer_id: id,
    p_approver_id: profile!.id
  });
=======
  const body = await req.json().catch(() => ({}));
  const decision = body.decision === 'Rejected' ? 'Rejected' : 'Approved';

  const { data, error } = await supabase
    .from('transfer_requests')
    .update({ 
      status: decision, 
      approved_by: profile!.id,
      approved_at: new Date().toISOString()
    } as any)
    .eq('id', id)
    .eq('status', 'Requested')
    .select()
    .single();
>>>>>>> f5dd0d42e68a6f5019dacd1e5669fcaa8bcba8c1

  if (error) return fromPostgresError(error);

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: `transfer.approved`, p_entity_type: 'transfer_request', p_entity_id: id,
    p_metadata: { decision: 'Approved' },
  });

  return NextResponse.json({ success: true });
}
