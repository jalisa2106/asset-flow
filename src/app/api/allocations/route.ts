import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { createAllocationSchema } from '@/lib/validators/allocation.schema';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';
import { MAX_PAGE_SIZE } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const employeeId = searchParams.get('employeeId');
  const departmentId = searchParams.get('departmentId');
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Math.min(Number(searchParams.get('pageSize') ?? '25'), MAX_PAGE_SIZE);

  let query = supabase.from('allocations').select(`
    *,
    asset:assets(name, asset_tag),
    employee:employee_profiles!employee_id(full_name),
    department:departments(name)
  `, { count: 'exact' });

  if (status) query = query.eq('status', status as any);
  if (employeeId) query = query.eq('employee_id', employeeId);
  if (departmentId) query = query.eq('department_id', departmentId);

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1).order('allocated_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 400);
  return NextResponse.json({ data, count, page, pageSize });
}

export async function POST(req: NextRequest) {
  const { supabase, profile } = await getCurrentProfile();
  if (!can.allocateAsset(profile)) return unauthorized();

  const parsed = createAllocationSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);
  const v = parsed.data;

  const { data, error } = await supabase.from('allocations').insert({
    asset_id: v.assetId,
    employee_id: v.employeeId ?? null,
    department_id: v.departmentId ?? null,
    expected_return_date: v.expectedReturnDate,
  }).select().single();

  if (error) {
    return fromPostgresError(error, {
      onExclusionViolation: () => apiError('Asset is already allocated during this period', 409),
    });
  }

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'allocation.created', p_entity_type: 'allocation', p_entity_id: data.id,
    p_metadata: { asset_id: v.assetId },
  });

  return NextResponse.json({ data }, { status: 201 });
}
