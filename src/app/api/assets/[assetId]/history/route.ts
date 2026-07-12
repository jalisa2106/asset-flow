import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { apiError } from '@/lib/api-response';

export async function GET(req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return apiError('Not authenticated', 401);

  // Fetch allocation logs
  const { data: allocations, error: allocError } = await supabase
    .from('allocations')
    .select('id, status, allocated_at, returned_at, expected_return_date, employee_profiles!employee_id(full_name)')
    .eq('asset_id', assetId);

  // Fetch maintenance logs
  const { data: maintenance, error: maintError } = await supabase
    .from('maintenance_requests')
    .select('id, status, created_at, issue_description, priority')
    .eq('asset_id', assetId);

  if (allocError) return apiError(allocError.message, 400);
  if (maintError) return apiError(maintError.message, 400);

  return NextResponse.json({
    allocations: allocations || [],
    maintenance: maintenance || [],
  });
}
