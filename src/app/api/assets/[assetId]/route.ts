import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { updateAssetSchema } from '@/lib/validators/asset.schema';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';

export async function GET(req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const { supabase } = await getCurrentProfile();

  const { data, error } = await supabase
    .from('assets')
    .select(`
      *,
      category:asset_categories(name),
      department:departments!department_id(name),
      allocations!allocations_asset_id_fkey(
        id, employee_id, department_id, expected_return_date,
        employee_profiles!employee_id(full_name),
        departments!department_id(name)
      )
    `)
    .eq('id', assetId)
    .eq('allocations.status', 'Active')
    .single();

  if (error) return apiError(error.message, 400);
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const { supabase, profile } = await getCurrentProfile();
  if (!can.registerOrEditAsset(profile)) return unauthorized();

  const parsed = updateAssetSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);
  
  const v = parsed.data;
  
  const { data, error } = await supabase.from('assets').update({
    name: v.name,
    category_id: v.categoryId,
    serial_number: v.serialNumber,
    acquisition_date: v.acquisitionDate,
    acquisition_cost: v.acquisitionCost,
    condition: v.condition,
    location: v.location,
    department_id: v.departmentId,
    is_bookable: v.isBookable,
    photo_url: v.photoUrl,
  }).eq('id', assetId).select().single();

  if (error) return fromPostgresError(error);

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'asset.updated', p_entity_type: 'asset', p_entity_id: assetId,
    p_metadata: {},
  });

  return NextResponse.json({ data });
}
