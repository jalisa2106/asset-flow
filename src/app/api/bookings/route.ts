import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { createBookingSchema } from '@/lib/validators/booking.schema';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';
import { MAX_PAGE_SIZE } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return unauthorized();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const bookedBy = searchParams.get('bookedBy');
  const resourceAssetId = searchParams.get('resourceAssetId');
  const mine = searchParams.get('mine');
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Math.min(Number(searchParams.get('pageSize') ?? '25'), MAX_PAGE_SIZE);

  let query = supabase.from('resource_bookings').select(`
    *,
    asset:assets(name, asset_tag),
    employee:employee_profiles!booked_by(full_name),
    department:departments!booked_for_department_id(name)
  `, { count: 'exact' });

  if (status) query = query.eq('status', status as any);
  if (bookedBy) query = query.eq('booked_by', bookedBy);
  if (resourceAssetId) query = query.eq('resource_asset_id', resourceAssetId);
  if (mine === 'true' || profile.role === 'Employee') query = query.eq('booked_by', profile.id);

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1).order('starts_at', { ascending: true });

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 400);
  return NextResponse.json({ data, count, page, pageSize });
}

export async function POST(req: NextRequest) {
  const { supabase, profile } = await getCurrentProfile();
  if (!can.bookResource(profile)) return unauthorized();

  const parsed = createBookingSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);
  const v = parsed.data;

  const { data, error } = await supabase.from('resource_bookings').insert({
    resource_asset_id: v.resourceAssetId,
    booked_by: profile!.id,
    booked_for_department_id: (v.bookedForDepartmentId && v.bookedForDepartmentId !== '') ? v.bookedForDepartmentId : null,
    starts_at: new Date(v.startsAt).toISOString(),
    ends_at: new Date(v.endsAt).toISOString(),
  }).select().single();

  if (error) {
    return fromPostgresError(error, {
      onExclusionViolation: () => NextResponse.json({ error: 'This resource is already booked for the selected time period', code: 'SLOT_CONFLICT' }, { status: 409 }),
    });
  }

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'booking.created', p_entity_type: 'booking', p_entity_id: data.id,
    p_metadata: { asset_id: v.resourceAssetId, starts_at: v.startsAt, ends_at: v.endsAt },
  });

  return NextResponse.json({ data }, { status: 201 });
}
