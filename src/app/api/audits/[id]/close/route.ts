import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { unauthorized, fromPostgresError } from '@/lib/api-response';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getCurrentProfile();
  if (!can.manageAuditCycles(profile)) return unauthorized();

  const { data, error } = await supabase
    .from('audit_cycles')
    .update({ status: 'Closed' })
    .eq('id', id)
    .eq('status', 'Open')
    .select()
    .single();

  if (error) return fromPostgresError(error);

  const { data: missingItems } = await supabase
    .from('audit_items')
    .select('asset_id')
    .eq('audit_cycle_id', id)
    .eq('verification', 'Missing');

  if (missingItems && missingItems.length > 0) {
    await supabase
      .from('assets')
      .update({ status: 'Lost' })
      .in('id', missingItems.map(i => i.asset_id));
  }

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'audit.completed', p_entity_type: 'audit_cycle', p_entity_id: id,
    p_metadata: {},
  });

  return NextResponse.json({ data });
}
