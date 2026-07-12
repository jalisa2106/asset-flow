import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { createAssetSchema } from '@/lib/validators/asset.schema';
import { apiError, unauthorized } from '@/lib/api-response';
import { MAX_PAGE_SIZE } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const category = searchParams.get('category');
  const status = searchParams.get('status');
  const department = searchParams.get('department');
  const sortBy = searchParams.get('sortBy') ?? 'created_at';
  const sortDir = searchParams.get('sortDir') === 'asc';
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Math.min(Number(searchParams.get('pageSize') ?? '25'), MAX_PAGE_SIZE);

  let query = supabase
    .from('assets')
    .select('*, asset_categories(name), departments(name)', { count: 'exact' });

  const bookable = searchParams.get('bookable');
  if (bookable === 'true') query = query.eq('is_bookable', true);
  if (q) query = query.textSearch('asset_tag', q, { type: 'websearch', config: 'english' });
  if (category) query = query.eq('category_id', category);
  if (status) query = query.eq('status', status as any);
  if (department) query = query.eq('department_id', department);

  const allowedSortColumns = ['created_at', 'name', 'status', 'asset_tag'];
  query = query.order(allowedSortColumns.includes(sortBy) ? sortBy : 'created_at', { ascending: sortDir });

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 400);
  return NextResponse.json({ data, count, page, pageSize });
}

export async function POST(req: NextRequest) {
  const { supabase, profile } = await getCurrentProfile();
  if (!can.registerOrEditAsset(profile)) return unauthorized();

  const parsed = createAssetSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);
  const v = parsed.data;

  const { data, error } = await supabase.from('assets').insert({
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
  }).select().single();

  if (error) return apiError(error.message, 400);

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'asset.registered', p_entity_type: 'asset', p_entity_id: data.id,
    p_metadata: { name: data.name, asset_tag: data.asset_tag },
  });

  return NextResponse.json({ data }, { status: 201 });
}
