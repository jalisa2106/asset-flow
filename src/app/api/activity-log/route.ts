import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return apiError('Not authenticated', 401);

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('entityType');
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Math.min(50, Number(searchParams.get('pageSize') ?? '25'));

  let query = supabase
    .from('activity_log')
    .select('id, action, entity_type, entity_id, metadata, created_at, employee_profiles(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (entityType) query = query.eq('entity_type', entityType);
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, count, error } = await query;
  if (error) return apiError(error.message, 400);

  return NextResponse.json({ data, count, page, pageSize });
}
