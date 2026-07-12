import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { unauthorized, fromPostgresError } from '@/lib/api-response';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getCurrentProfile();
  if (!can.approveTransfer(profile)) return unauthorized();

  const { data, error } = await supabase
    .from('transfer_requests')
    .update({ 
      status: 'Rejected', 
      approved_by: profile!.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('status', 'Requested')
    .select()
    .single();

  if (error) return fromPostgresError(error);

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'transfer.rejected', p_entity_type: 'transfer_request', p_entity_id: id,
    p_metadata: { decision: 'Rejected' },
  });

  return NextResponse.json({ data });
}
