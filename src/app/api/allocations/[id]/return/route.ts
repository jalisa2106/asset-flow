import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { returnAllocationSchema } from '@/lib/validators/allocation.schema';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getCurrentProfile();
  if (!can.allocateAsset(profile)) return unauthorized();

  const parsed = returnAllocationSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { data, error } = await supabase
    .from('allocations')
    .update({ 
      status: 'Returned', 
      returned_at: new Date().toISOString(),
      return_condition_notes: parsed.data.returnConditionNotes 
    })
    .eq('id', id)
    .eq('status', 'Active')
    .select()
    .single();

  if (error) return fromPostgresError(error);

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'allocation.returned', p_entity_type: 'allocation', p_entity_id: id,
    p_metadata: { notes: parsed.data.returnConditionNotes },
  });

  return NextResponse.json({ data });
}
