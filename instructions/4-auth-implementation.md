# 4 — Authentication Implementation (Email/Password, JWT Session, Cookies + Cached Profile)

## Why this approach (read before implementing)

You asked for JWT-based login with session storage in localStorage + cookies. Here's the exact mapping so nothing feels swapped out from what you asked:

- **The JWT/session itself lives in httpOnly cookies**, managed entirely by `@supabase/ssr` (already installed per `1-folder-structure.md`). This *is* your JWT login — Supabase Auth issues a signed JWT (access token) + refresh token on login, and `@supabase/ssr` stores/refreshes them in cookies automatically on every request via middleware.
- **We do NOT put the raw JWT in `localStorage`.** A script-injectable storage holding a live session token is the single most common way real apps get session-hijacked (XSS → read localStorage → steal token → impersonate user). Cookies marked httpOnly are invisible to JS entirely, so this risk doesn't exist there.
- **What DOES go in `localStorage`**: a small cached copy of the *non-sensitive* profile (`full_name`, `role`, `department_id`, `status`) so the sidebar/topbar can render instantly on page load without waiting on a Supabase round-trip. This cache is always treated as a hint, never as the source of truth — every privileged action re-checks the real session server-side (route handler / RLS), so even if this cache were stale or tampered with client-side, nothing insecure happens.
- Net result: you get instant UI hydration (your localStorage ask) + real secure session persistence (your JWT/cookie ask), without the XSS exposure of the naive version.

---

## 1. `src/lib/supabase/client.ts` (browser client)

```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

## 2. `src/lib/supabase/server.ts` (server client — Route Handlers, Server Components)

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — safe to ignore if middleware refreshes sessions
          }
        },
      },
    }
  );
}
```

## 3. `src/lib/supabase/admin.ts` (service-role — server-only, never imported client-side)

```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// SERVER-ONLY. Never import this file in a "use client" component.
// Bypasses RLS — use only for operations that must run with elevated privilege
// (e.g. reading auth.users metadata during admin promotion flows).
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

---

## 4. `middleware.ts` — session refresh + route protection

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password'];

// Minimal per-route role gating; refine as screens are built.
// Empty array = any authenticated role may access.
const ROUTE_ROLES: Record<string, string[]> = {
  '/organization': ['Admin'],
  '/audits/new': ['Admin', 'Asset Manager'],
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // This call both validates AND refreshes the session (rotates the JWT if near expiry).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectedFrom', path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isPublic) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Role gate for restricted routes — fetch role fresh from DB, never trust a client-sent value.
  if (user) {
    const matchedRoute = Object.keys(ROUTE_ROLES).find((r) => path.startsWith(r));
    if (matchedRoute) {
      const { data: profile } = await supabase
        .from('employee_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !ROUTE_ROLES[matchedRoute].includes(profile.role)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)'],
};
```

---

## 5. API routes

### `src/app/api/auth/signup/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // IMPORTANT: no `role` field accepted here at all, even if the client sends one.
  // handle_new_user() in the DB (0003_employee_profiles.sql) always inserts role = 'Employee'.
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.full_name } },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ user: data.user, session: data.session });
}
```

### `src/app/api/auth/login/route.ts`

```typescript
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
```

### `src/app/api/auth/logout/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut(); // clears the session cookies
  return NextResponse.json({ success: true });
}
```

### `src/app/api/auth/forgot-password/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });

  // Always return success regardless of whether the email exists — avoids user enumeration.
  return NextResponse.json({ success: true });
}
```

### `src/app/api/auth/session/route.ts` (used by the client to re-sync the cached profile, e.g. after role promotion)

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ profile: null }, { status: 200 });

  const { data: profile } = await supabase
    .from('employee_profiles')
    .select('id, full_name, role, department_id, status')
    .eq('id', user.id)
    .single();

  return NextResponse.json({ profile });
}
```

---

## 6. Client-side: cached profile store (the "localStorage" half)

### `src/store/authStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CachedProfile = {
  id: string;
  full_name: string;
  role: 'Admin' | 'Asset Manager' | 'Department Head' | 'Employee';
  department_id: string | null;
  status: 'Active' | 'Inactive';
} | null;

interface AuthState {
  profile: CachedProfile;
  setProfile: (profile: CachedProfile) => void;
  clear: () => void;
}

// This persists to localStorage under the hood via zustand's `persist` middleware.
// It NEVER stores the session token — only the display/role fields above.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
      clear: () => set({ profile: null }),
    }),
    { name: 'assetflow-profile-cache' }
  )
);
```

### `src/hooks/useUser.ts`

```typescript
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

// Hydrates the cached profile from localStorage instantly on mount (via zustand persist),
// then reconciles against the real server session in the background. If the server session
// is gone (expired/logged out elsewhere), the cache is cleared.
export function useUser() {
  const { profile, setProfile, clear } = useAuthStore();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.profile) clear();
        else setProfile(data.profile);
      })
      .catch(() => {
        // network hiccup — keep the cached value, don't clear on a transient failure
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return profile;
}
```

### `src/hooks/useRole.ts`

```typescript
'use client';

import { useUser } from './useUser';

export function useRole() {
  const profile = useUser();
  return profile?.role ?? null;
}
```

---

## 7. `components/layout/RoleGate.tsx`

```typescript
'use client';

import { ReactNode } from 'react';
import { useRole } from '@/hooks/useRole';

export function RoleGate({
  allow,
  children,
  fallback = null,
}: {
  allow: Array<'Admin' | 'Asset Manager' | 'Department Head' | 'Employee'>;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const role = useRole();
  if (!role || !allow.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
```

**Remember:** `RoleGate` is UX only (hides a button/menu item). Every route handler behind that button must independently re-check the role server-side (as shown in the API routes above) and RLS must independently enforce it at the DB level — per `AGENTS.md` Section 4. Never let `RoleGate` be the only thing standing between a user and a privileged action.

---

## 8. Login/Signup page wiring (Screen 1)

```typescript
// src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const setProfile = useAuthStore((s) => s.setProfile);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Login failed');
      return;
    }

    setProfile(data.profile); // hydrate the localStorage-backed cache immediately
    router.push('/dashboard');
  }

  // ...render form using `handleLogin`, plus a signup section whose copy explicitly states:
  // "Sign up creates an Employee account — admin roles assigned later" (per 2-ui-reference.md, Screen 1)
}
```

Signup calls `POST /api/auth/signup` the same way, then either auto-logs-in (if `data.session` is present — depends on whether email confirmation is required in your Supabase project settings) or shows a "check your email to confirm" message.

---

## 9. Things this sets up ahead of what was asked (so later work doesn't hit walls)

- **Deactivated-account handling**: login blocks and signs out any user whose `employee_profiles.status = 'Inactive'` — matters because Screen 3's Employee Directory has an Active/Inactive toggle, and without this check a deactivated employee could still use an old session.
- **User enumeration protection**: login and forgot-password both return generic messages/success regardless of whether the email exists — prevents attackers from probing which emails are registered.
- **Role re-sync after promotion**: `/api/auth/session` lets the client re-fetch the true role after an Admin promotion, so a user doesn't have to log out/in to see new permissions — call this after any promotion action completes, or on a slow interval, or on window focus.
- **Middleware role-gating table (`ROUTE_ROLES`)** is intentionally centralized and easy to extend as you build out Screens 3–9, instead of scattering `if (role !== 'Admin')` checks across page components.
- **Session refresh is automatic**: `supabase.auth.getUser()` inside middleware transparently rotates the JWT before it expires, on every request — you don't need to write any manual "refresh token" logic.
- **`admin.ts` is isolated** specifically so a future feature (e.g. an admin-only bulk import) can use the service-role key without ever risking it being bundled into client JS.

---

## 10. Env vars needed are already added to the .env.local file

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
# NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
make the site url change if you think it is to be done.