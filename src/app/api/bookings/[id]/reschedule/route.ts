import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { rescheduleBookingSchema } from '@/lib/validators/booking.schema';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getCurrentProfile();

  const parsed = rescheduleBookingSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);
  const v = parsed.data;

  // First fetch the booking to check permissions
  const { data: booking, error: fetchError } = await supabase
    .from('resource_bookings')
    .select('booked_by, status')
    .eq('id', id)
    .single();

  if (fetchError || !booking) return apiError('Booking not found', 404);
  if (!can.cancelBooking(profile, booking)) return unauthorized(); // use same rule for reschedule
  if (booking.status !== 'Active') return apiError('Only active bookings can be rescheduled', 400);

  const { data, error } = await supabase
    .from('resource_bookings')
    .update({ 
      starts_at: v.startsAt,
      ends_at: v.endsAt,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return fromPostgresError(error, {
      onExclusionViolation: () => apiError('This resource is already booked for the selected time period', 409),
    });
  }

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'booking.rescheduled', p_entity_type: 'booking', p_entity_id: id,
    p_metadata: { new_starts_at: v.startsAt, new_ends_at: v.endsAt },
  });

  return NextResponse.json({ data });
}
