import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getCurrentProfile();
  if (!can.approveTransfer(profile)) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const decision = body.decision === 'Rejected' ? 'Rejected' : 'Approved';

  const { data, error } = await supabase
    .from('transfer_requests')
    .update({ 
      status: decision, 
      approved_by: profile!.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('status', 'Pending')
    .select()
    .single();

  if (error) return fromPostgresError(error);

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: `transfer.${decision.toLowerCase()}`, p_entity_type: 'transfer_request', p_entity_id: id,
    p_metadata: { decision },
  });

  return NextResponse.json({ data });
}
