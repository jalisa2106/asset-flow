import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = loginSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email or password format' }, { status: 400 });

  const supabase = await createClient();
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';

  const { data: lockedOut } = await supabase.rpc('is_login_locked_out', { p_email: parsed.data.email });
  if (lockedOut) {
    return NextResponse.json(
      { error: 'Too many failed attempts. Try again in 15 minutes.' },
      { status: 429 }
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  await supabase.from('login_attempts').insert({
    email: parsed.data.email,
    ip_address: ip,
    success: !error,
  });

  if (error) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('employee_profiles')
    .select('id, full_name, role, department_id, status')
    .eq('id', data.user.id)
    .single();

  if (profile?.status === 'Inactive') {
    await supabase.auth.signOut();
    return NextResponse.json({ error: 'This account has been deactivated' }, { status: 403 });
  }

  return NextResponse.json({ profile });
}
