import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { createAuditCycleSchema } from '@/lib/validators/audit.schema';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';
import { MAX_PAGE_SIZE } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const departmentId = searchParams.get('departmentId');
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Math.min(Number(searchParams.get('pageSize') ?? '25'), MAX_PAGE_SIZE);

  let query = supabase.from('audit_cycles').select(`
    *,
    department:departments(name),
    created_by_profile:employee_profiles!created_by(full_name)
  `, { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (departmentId) query = query.eq('scope_department_id', departmentId);

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 400);
  return NextResponse.json({ data, count, page, pageSize });
}

export async function POST(req: NextRequest) {
  const { supabase, profile } = await getCurrentProfile();
  if (!can.manageAuditCycles(profile)) return unauthorized();

  const parsed = createAuditCycleSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);
  const v = parsed.data;

  const { data: cycle, error: cycleError } = await supabase.from('audit_cycles').insert({
    name: v.name,
    scope_department_id: v.scopeDepartmentId ?? null,
    scope_location: v.scopeLocation ?? null,
    start_date: v.startDate,
    end_date: v.endDate,
    created_by: profile!.id,
    assigned_auditors: v.auditorEmployeeIds,
  }).select().single();

  if (cycleError) return fromPostgresError(cycleError);

  let assetsQuery = supabase.from('assets').select('id');
  if (v.scopeDepartmentId) assetsQuery = assetsQuery.eq('department_id', v.scopeDepartmentId);
  if (v.scopeLocation) assetsQuery = assetsQuery.eq('location', v.scopeLocation);
  assetsQuery = assetsQuery.in('status', ['Available', 'Allocated', 'Under Maintenance']);

  const { data: assets, error: assetsError } = await assetsQuery;
  if (assetsError) return apiError(assetsError.message, 400);

  if (assets && assets.length > 0) {
    const items = assets.map(a => ({
      audit_cycle_id: cycle.id,
      asset_id: a.id,
      verification: 'Pending' as const,
    }));
    const { error: itemsError } = await supabase.from('audit_items').insert(items);
    if (itemsError) return fromPostgresError(itemsError);
  }

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'audit.started', p_entity_type: 'audit_cycle', p_entity_id: cycle.id,
    p_metadata: { name: v.name, asset_count: assets?.length || 0 },
  });

  return NextResponse.json({ data: cycle }, { status: 201 });
}
