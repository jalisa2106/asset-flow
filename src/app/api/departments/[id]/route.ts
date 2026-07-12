import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { departmentSchema } from '@/lib/validators/org-setup.schema';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('departments')
    .select(`
      *,
      head:employee_profiles!head_employee_id(full_name),
      parent:departments!parent_dept_id(name)
    `)
    .eq('id', id)
    .single();

  if (error) return apiError(error.message, 400);
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getCurrentProfile();
  
  if (!can.manageOrgMasterData(profile)) return unauthorized();

  const body = await req.json();
  const parsed = departmentSchema.partial().safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);
  const v = parsed.data;

  // Check for circular dependency if parentDeptId is being updated
  if (v.parentDeptId) {
    if (v.parentDeptId === id) {
      return apiError('A department cannot be its own parent', 400);
    }
    
    // Walk up the parent chain to check for cycles
    let currentParentId = v.parentDeptId;
    const maxDepth = 100; // prevent infinite loops
    let depth = 0;
    
    while (currentParentId && depth < maxDepth) {
      if (currentParentId === id) {
         return apiError('Circular dependency detected in department hierarchy', 400);
      }
      
      const { data: parentData, error: parentError } = await supabase
        .from('departments')
        .select('parent_dept_id')
        .eq('id', currentParentId)
        .single();
        
      if (parentError || !parentData) break;
      
      currentParentId = parentData.parent_dept_id;
      depth++;
    }
  }

  const { data, error } = await supabase
    .from('departments')
    .update({
      ...(v.name !== undefined && { name: v.name }),
      ...(v.headEmployeeId !== undefined && { head_employee_id: v.headEmployeeId }),
      ...(v.parentDeptId !== undefined && { parent_dept_id: v.parentDeptId }),
      ...(v.status !== undefined && { status: v.status }),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return fromPostgresError(error, {
    onUniqueViolation: () => apiError('Department name already exists', 409),
  });

  return NextResponse.json({ data });
}
