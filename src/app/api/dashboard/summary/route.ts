import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { apiError } from '@/lib/api-response';

export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return apiError('Not authenticated', 401);

  const [available, allocated, reserved, activeBookings, pendingTransfers, overdue, recentActivity] = await Promise.all([
    supabase.from('assets').select('id', { count: 'exact', head: true }).eq('status', 'Available'),
    supabase.from('assets').select('id', { count: 'exact', head: true }).eq('status', 'Allocated'),
    supabase.from('assets').select('id', { count: 'exact', head: true }).eq('status', 'Reserved'),
    supabase.from('resource_bookings').select('id', { count: 'exact', head: true }).in('status', ['Upcoming', 'Ongoing']),
    supabase.from('transfer_requests').select('id', { count: 'exact', head: true }).eq('status', 'Requested'),
    supabase.from('allocations').select('id, expected_return_date, asset_id, employee_id').eq('status', 'Active').lt('expected_return_date', new Date().toISOString().slice(0, 10)),
    supabase.from('activity_log').select('id, action, entity_type, entity_id, created_at, actor_id').order('created_at', { ascending: false }).limit(8),
  ]);

  return NextResponse.json({
    kpis: {
      assetsAvailable: available.count ?? 0,
      assetsAllocated: allocated.count ?? 0,
      assetsReserved: reserved.count ?? 0,
      activeBookings: activeBookings.count ?? 0,
      pendingTransfers: pendingTransfers.count ?? 0,
      overdueReturnsCount: overdue.data?.length ?? 0,
    },
    overdueReturns: overdue.data ?? [],
    recentActivity: recentActivity.data ?? [],
  });
}
