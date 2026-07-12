import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { apiError, unauthorized } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const { supabase, profile } = await getCurrentProfile();
  if (!can.manageOrgMasterData(profile)) return unauthorized();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  if (type === 'assets') {
    const { data, error } = await supabase.from('assets').select(`
      *,
      category:asset_categories(name),
      department:departments(name)
    `).order('created_at', { ascending: false });
    
    if (error) return apiError(error.message, 400);
    return NextResponse.json({ data });
  } 

  if (type === 'allocations') {
    const { data, error } = await supabase.from('allocations').select(`
      *,
      asset:assets(name, asset_tag),
      employee:employee_profiles!employee_id(full_name),
      department:departments(name)
    `).order('allocated_at', { ascending: false });
    
    if (error) return apiError(error.message, 400);
    return NextResponse.json({ data });
  }

  const [
    { count: totalAssets },
    { count: activeAllocations },
    { count: pendingMaintenance },
    { count: activeAudits },
  ] = await Promise.all([
    supabase.from('assets').select('*', { count: 'exact', head: true }),
    supabase.from('allocations').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
    supabase.from('maintenance_requests').select('*', { count: 'exact', head: true }).in('status', ['Pending', 'In Progress', 'Approved']),
    supabase.from('audit_cycles').select('*', { count: 'exact', head: true }).eq('status', 'In Progress'),
  ]);

  return NextResponse.json({
    data: {
      totalAssets: totalAssets || 0,
      activeAllocations: activeAllocations || 0,
      pendingMaintenance: pendingMaintenance || 0,
      activeAudits: activeAudits || 0,
    }
  });
}
