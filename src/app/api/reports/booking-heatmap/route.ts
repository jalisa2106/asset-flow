import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { apiError, fromPostgresError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return apiError('Not authenticated', 401);

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return apiError('Missing from or to parameters', 400);
  }

  const { data, error } = await supabase.rpc('report_booking_heatmap', {
    p_from: from,
    p_to: to
  });

  if (error) return fromPostgresError(error);

  return NextResponse.json({ data });
}
