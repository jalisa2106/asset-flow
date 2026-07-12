import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { apiError, fromPostgresError } from '@/lib/api-response';

export async function GET(_req: NextRequest) {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return apiError('Not authenticated', 401);

  const { data, error } = await supabase.rpc('report_due_for_attention');

  if (error) return fromPostgresError(error);

  return NextResponse.json({ data });
}
