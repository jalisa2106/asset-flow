import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { createMaintenanceSchema } from '@/lib/validators/maintenance.schema';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';
import { MAX_PAGE_SIZE } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return unauthorized();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const reportedBy = searchParams.get('reportedBy');
  const assetId = searchParams.get('assetId');
  const mine = searchParams.get('mine');
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Math.min(Number(searchParams.get('pageSize') ?? '25'), MAX_PAGE_SIZE);

  let query = supabase.from('maintenance_requests').select(`
    *,
    asset:assets(name, asset_tag),
    reporter:employee_profiles!raised_by(full_name)
  `, { count: 'exact' });

  if (status) query = query.eq('status', status as any);
  if (reportedBy) query = query.eq('raised_by', reportedBy);
  if (assetId) query = query.eq('asset_id', assetId);
  if (mine === 'true' || profile.role === 'Employee') query = query.eq('raised_by', profile.id);

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 400);
  return NextResponse.json({ data, count, page, pageSize });
}

export async function POST(req: NextRequest) {
  const { supabase, profile } = await getCurrentProfile();
  if (!can.raiseMaintenance(profile)) return unauthorized();

  const parsed = createMaintenanceSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);
  const v = parsed.data;

  const { data, error } = await supabase.from('maintenance_requests').insert({
    asset_id: v.assetId,
    raised_by: profile!.id,
    issue_description: v.issueDescription,
    priority: v.priority,
    photo_url: v.photoUrl,
  }).select().single();

  if (error) return fromPostgresError(error);

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'maintenance.reported', p_entity_type: 'maintenance', p_entity_id: data.id,
    p_metadata: { asset_id: v.assetId, priority: v.priority },
  });

  return NextResponse.json({ data }, { status: 201 });
}
