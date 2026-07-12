import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getCurrentProfile();

  // First fetch the booking to check permissions
  const { data: booking, error: fetchError } = await supabase
    .from('resource_bookings')
    .select('booked_by, status')
    .eq('id', id)
    .single();

  if (fetchError || !booking) return apiError('Booking not found', 404);
  if (!can.cancelBooking(profile, booking)) return unauthorized();
  if (booking.status === 'Cancelled' || booking.status === 'Completed') return apiError('Booking cannot be cancelled', 400);

  const { data, error } = await supabase
    .from('resource_bookings')
    .update({ status: 'Cancelled' })
    .eq('id', id)
    .select()
    .single();

  if (error) return fromPostgresError(error);

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'booking.cancelled', p_entity_type: 'booking', p_entity_id: id,
    p_metadata: {},
  });

  return NextResponse.json({ data });
}
