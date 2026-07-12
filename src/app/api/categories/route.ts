import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { categorySchema } from '@/lib/validators/org-setup.schema';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('asset_categories').select('*').order('name');
  if (error) return apiError(error.message, 400);
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { supabase, profile } = await getCurrentProfile();
  if (!can.manageOrgMasterData(profile)) return unauthorized();

  const parsed = categorySchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);
  const v = parsed.data;

  const { data, error } = await supabase.from('asset_categories').insert({
    name: v.name,
    code: v.code,
    description: v.description,
    status: v.status,
  }).select().single();

  if (error) return fromPostgresError(error, {
    onUniqueViolation: () => apiError('Category code or name already exists', 409),
  });

  return NextResponse.json({ data }, { status: 201 });
}
