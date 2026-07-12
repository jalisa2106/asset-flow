import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth-context';

import { createTransferRequestSchema } from '@/lib/validators/allocation.schema';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';
import { MAX_PAGE_SIZE } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Math.min(Number(searchParams.get('pageSize') ?? '25'), MAX_PAGE_SIZE);

  let query = supabase.from('transfer_requests').select(`
    *,
    allocation:allocations(asset_id, assets(name, asset_tag)),
    from_employee:employee_profiles!from_employee_id(full_name),
    to_employee:employee_profiles!to_employee_id(full_name),
    approved_by_profile:employee_profiles!approved_by(full_name)
  `, { count: 'exact' });

  if (status) query = query.eq('status', status as any);

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 400);
  return NextResponse.json({ data, count, page, pageSize });
}

export async function POST(req: NextRequest) {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return unauthorized();

  const parsed = createTransferRequestSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);
  const v = parsed.data;

  const { data: allocation, error: allocError } = await supabase
    .from('allocations')
    .select('employee_id, status, asset_id')
    .eq('id', v.allocationId)
    .single();

  if (allocError || !allocation) return apiError('Allocation not found', 404);
  if (allocation.employee_id !== profile.id) return apiError('You can only request transfers for your own allocations', 403);
  if (allocation.status !== 'Active') return apiError('Allocation must be active to transfer', 400);

  const { data, error } = await supabase.from('transfer_requests').insert({
    allocation_id: v.allocationId,
    asset_id: allocation.asset_id,
    from_employee_id: profile.id,
    to_employee_id: v.toEmployeeId,
    reason: v.reason,
  } as any).select().single();

  if (error) return fromPostgresError(error);

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'transfer.requested', p_entity_type: 'transfer_request', p_entity_id: data.id,
    p_metadata: { allocation_id: v.allocationId, to: v.toEmployeeId },
  });

  return NextResponse.json({ data }, { status: 201 });
}
