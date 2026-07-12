import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { apiError } from '@/lib/api-response';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return apiError('Not authenticated', 401);

  // Fetch the audit cycle
  const { data: cycle, error: cycleError } = await supabase
    .from('audit_cycles')
    .select('*, departments(name)')
    .eq('id', id)
    .single();

  if (cycleError || !cycle) return apiError('Audit cycle not found', 404);

  // Fetch all audit items in this cycle joined to assets
  const { data: items, error: itemsError } = await supabase
    .from('audit_items')
    .select('*, assets(name, asset_tag)')
    .eq('audit_cycle_id', id);

  if (itemsError) return apiError(itemsError.message, 400);

  // Calculate discrepancy count
  const discrepancyCount = (items || []).filter(i => ['Missing', 'Damaged'].includes(i.verification)).length;

  return NextResponse.json({
    cycle,
    items: items || [],
    discrepancyCount,
  });
}
