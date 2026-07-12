import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiError } from '@/lib/api-response';
import { MAX_PAGE_SIZE } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get('departmentId');
  const role = searchParams.get('role');
  const q = searchParams.get('q');
  
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Math.min(Number(searchParams.get('pageSize') ?? '25'), MAX_PAGE_SIZE);

  let query = supabase.from('employee_profiles').select(`
    *,
    department:departments(name)
  `, { count: 'exact' });

  if (departmentId) query = query.eq('department_id', departmentId);
  if (role) query = query.eq('role', role);
  if (q) query = query.ilike('full_name', `%${q}%`); 

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1).order('full_name', { ascending: true });

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 400);
  return NextResponse.json({ data, count, page, pageSize });
}
