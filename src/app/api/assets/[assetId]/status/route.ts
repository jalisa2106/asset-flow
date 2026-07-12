import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { changeAssetStatusSchema } from '@/lib/validators/asset.schema';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const { supabase, profile } = await getCurrentProfile();
  if (!can.changeAssetStatus(profile)) return unauthorized();

  const parsed = changeAssetStatusSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { data, error } = await supabase
    .from('assets')
    .update({ status: parsed.data.status })
    .eq('id', assetId)
    .select()
    .single();

  if (error) return fromPostgresError(error);

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'asset.status_changed', p_entity_type: 'asset', p_entity_id: assetId,
    p_metadata: { new_status: parsed.data.status, reason: parsed.data.reason ?? null },
  });

  return NextResponse.json({ data });
}
