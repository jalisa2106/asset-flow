import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email or password format' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Deliberately vague message — don't reveal whether the email exists (avoids user enumeration).
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

  // Cookies (JWT/session) are already set by the server client. Return only the
  // non-sensitive profile fields the frontend will cache in localStorage.
  return NextResponse.json({ profile });
}
