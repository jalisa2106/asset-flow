# 7 — Secure Routing & Complete Authentication

## 0. Where this picks up, and one naming reconciliation to fix first

File 4 built the initial auth pass (signup/login/logout, cookie-based Supabase session, a `useUser`/localStorage profile cache). File 6 then wrote all module routes assuming a helper called `getCurrentProfile()` returning `{ supabase, profile }`, used like:

```typescript
const { supabase, profile } = await getCurrentProfile();
if (!can.registerOrEditAsset(profile)) return unauthorized();
```

**That helper doesn't exist yet as a real file** — file 6 used it in code sketches without defining it, and file 4 instead had routes calling `supabase.auth.getUser()` inline each time. This task closes that gap: `getCurrentProfile()` becomes the one real, canonical way every route (existing and future) gets the current user + profile. Once this file is applied, **every route from file 6 that referenced `getCurrentProfile()` will actually work** — nothing else needs to change in those files.

This task also does the three things you specifically asked for: (1) hardens routing/auth end to end, not just "it works," (2) finishes the backend session/cookie implementation properly, and (3) finishes the localStorage caching layer's edge cases (stale cache after logout-elsewhere, 401 handling, etc.).

---

## 1. `src/lib/supabase/server-auth.ts` (new file) — the canonical `getCurrentProfile()`

```typescript
import { createClient } from '@/lib/supabase/server';
import type { EmployeeProfile } from '@/lib/permissions';

export async function getCurrentProfile(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email?: string } | null;
  profile: EmployeeProfile | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from('employee_profiles')
    .select('id, role, department_id, status, full_name')
    .eq('id', user.id)
    .single();

  return { supabase, user, profile: (profile as EmployeeProfile) ?? null };
}
```

Every route should now follow this exact shape at the top:

```typescript
const { supabase, profile } = await getCurrentProfile();
if (!profile || profile.status === 'Inactive') return apiError('Not authenticated', 401);
if (!can.someCapability(profile)) return unauthorized();
```

This makes `supabase.auth.getUser()` (which re-validates the JWT against Supabase's servers, not just decoding it locally — important, since a locally-decoded-but-unverified JWT is a classic auth bug) the single choke point for every protected route. Don't call `supabase.auth.getSession()` in route handlers for authorization decisions — `getSession()` reads the cookie without revalidating it, which is fine for fast UI reads but not for a security decision.

---

## 2. Hardened `middleware.ts` — full route/role table + security headers + CSRF origin check

Replace the version from file 4 with this. It keeps the same session-refresh mechanism but adds: a complete role table covering every screen (file 4 only had two example entries), an Origin-check for state-changing requests, and baseline security headers.

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password'];

// Full mapping, one entry per screen from 2-ui-reference.md / AGENTS.md Section 4.
// Empty/absent path = any authenticated, active-status role may access.
const ROUTE_ROLES: Record<string, string[]> = {
  '/organization': ['Admin'],                                   // Screen 3, all tabs
  '/assets/new': ['Admin', 'Asset Manager'],                    // Screen 4 register
  '/allocations/new': ['Admin', 'Asset Manager'],               // Screen 5 allocate
  '/allocations/transfers': ['Admin', 'Asset Manager', 'Department Head'], // approvals
  '/audits/new': ['Admin', 'Asset Manager'],                    // Screen 8 create cycle
  '/audits': [],                                                // read/verify gated per-item in-route, not here
  '/reports': ['Admin', 'Asset Manager', 'Department Head'],    // Screen 9
};

// State-changing HTTP methods must originate from our own site — basic CSRF defense
// on top of SameSite=Lax cookies (which already block most cross-site form posts).
const UNSAFE_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // --- CSRF: reject cross-origin state-changing requests to /api/** ---
  if (request.nextUrl.pathname.startsWith('/api/') && UNSAFE_METHODS.includes(request.method)) {
    const origin = request.headers.get('origin');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (origin && siteUrl && origin !== siteUrl) {
      return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
    }
  }

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

  // Validates AND transparently rotates the JWT if it's near expiry.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));
  const isApiAuthRoute = path.startsWith('/api/auth/');

  if (!user && !isPublic && !isApiAuthRoute) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectedFrom', path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isPublic) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (user) {
    const { data: profile } = await supabase
      .from('employee_profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    // Deactivated employees are cut off immediately, not just at their next login.
    if (profile?.status === 'Inactive') {
      await supabase.auth.signOut();
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('deactivated', '1');
      return NextResponse.redirect(redirectUrl);
    }

    const matchedRoute = Object.keys(ROUTE_ROLES).find((r) => path.startsWith(r));
    if (matchedRoute && ROUTE_ROLES[matchedRoute].length > 0) {
      if (!profile || !ROUTE_ROLES[matchedRoute].includes(profile.role)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  // --- Baseline security headers on every response ---
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)'],
};
```

Note on the CSRF check: it only fires when the request carries an `Origin` header that doesn't match your site — same-origin browser requests (the normal case) either omit `Origin` on same-site navigations or send a matching one, so this doesn't break normal usage; it blocks a malicious third-party page's script/form from POSTing to your API using the victim's cookies.

---

## 3. Login rate limiting / account lockout — new migration `0011_auth_security.sql`

Prevents brute-force password guessing against `/api/auth/login`. Additive migration, per `AGENTS.md` Section 5 — don't edit earlier files.

```sql
create table login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip_address text,
  success boolean not null,
  created_at timestamptz not null default now()
);

create index idx_login_attempts_email_time on login_attempts(email, created_at desc);

-- Returns true if this email has 5+ failed attempts in the last 15 minutes (lockout window).
create or replace function is_login_locked_out(p_email text)
returns boolean language sql stable as $$
  select count(*) >= 5
  from login_attempts
  where email = p_email
    and success = false
    and created_at > now() - interval '15 minutes';
$$;
```

Update `src/app/api/auth/login/route.ts` to use it:

```typescript
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
```

This table will also grow unbounded over time — fine for a hackathon, but worth a one-line note in `AGENTS.md` if this ever goes past demo stage: add a cron job (same `pg_cron` pattern as the overdue-allocation job) to prune rows older than 24 hours.

---

## 4. Cookie configuration — confirming what's already correct, making it explicit

`@supabase/ssr` sets the session cookies with sane defaults, but make these explicit in `src/lib/supabase/server.ts` and `client.ts` rather than leaving them implicit, so nobody "fixes" them into something less secure later:

- `HttpOnly`: set automatically by `@supabase/ssr` for the server-side cookie writes — JS cannot read the actual session token. This is the whole reason we don't hand-roll JWT storage.
- `SameSite=Lax`: the library default. This blocks the token from being sent on cross-site POST requests (most CSRF vectors) while still allowing normal top-level navigation (e.g. clicking a link from an email works).
- `Secure`: automatically applied in production (HTTPS) — on `localhost` during dev it's correctly omitted since dev is HTTP. Don't force `Secure: true` in a way that breaks local dev.

No code change needed here — this section exists so it's documented and nobody "helpfully" starts manually managing cookies and drops one of these flags.

---

## 5. Finishing the localStorage cache: stale-session and logout-everywhere handling

Two gaps in file 4's version to close:

### 5.1 A shared `apiFetch` wrapper that clears the cache on any 401

Right now, if a session expires or is revoked (e.g. deactivated by an Admin mid-session), the localStorage-cached profile would keep showing stale data until the next manual refresh. Fix with one shared fetch wrapper used by all client components instead of raw `fetch`:

```typescript
// src/lib/apiFetch.ts
'use client';

import { useAuthStore } from '@/store/authStore';

export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, init);

  if (res.status === 401) {
    useAuthStore.getState().clear(); // wipe the stale cached profile immediately
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login?sessionExpired=1';
    }
  }

  return res;
}
```

Use `apiFetch` in place of `fetch` for all authenticated client-side calls going forward (route handlers themselves keep using the server Supabase client directly, this wrapper is client-side only).

### 5.2 Logout must clear both halves — cookie session AND localStorage cache

File 4's logout route only handled the server side (`supabase.auth.signOut()`). Wire the actual logout button/action client-side to clear both:

```typescript
// src/components/layout/LogoutButton.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export function LogoutButton() {
  const router = useRouter();
  const clear = useAuthStore((s) => s.clear);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' }); // clears the httpOnly session cookies
    clear();                                              // clears the localStorage-cached profile
    router.push('/login');
  }

  return <button onClick={handleLogout}>Log out</button>;
}
```

Without the explicit `clear()` call, a user logging out on a shared machine would still have their name/role sitting in `localStorage` even though the actual session is gone — not a live security hole (the cache is inert display data, not a token, per file 4's design), but sloppy and worth closing.

---

## 6. Quick verification checklist

Run through these once implemented:

1. **Login lockout**: submit 5 wrong passwords for one email within 15 minutes → 6th attempt (even with the correct password) should return 429, not proceed to a real auth check.
2. **CSRF block**: `curl -X POST https://yoursite/api/bookings -H "Origin: https://evil.com" ...` → expect `403 Cross-origin request blocked`. A same-origin request (no `Origin` header, or matching one) should proceed to normal auth/validation.
3. **Deactivation cutoff**: set a seeded test user's `employee_profiles.status = 'Inactive'` directly in the DB while they're logged in, then have them navigate anywhere → middleware should sign them out and redirect to `/login?deactivated=1` on their very next request, not just their next login attempt.
4. **Role gate**: log in as `employee@assetflow.test` and try navigating directly to `/organization` → should redirect to `/dashboard`, not render the Admin screen.
5. **Stale cache clears**: log in, then revoke the session from the Supabase dashboard (Authentication → Users → sign out this user), then trigger any `apiFetch`-based call from the still-open tab → should clear the cached profile and bounce to `/login?sessionExpired=1`.
6. **Logout clears both**: log in, open devtools → Application → Local Storage, confirm `assetflow-profile-cache` has data; log out; confirm that key is now empty/cleared and the Supabase session cookies are gone too (Application → Cookies).

---

## 7. What NOT to do in this task

- Don't move authorization logic into `RoleGate` or any client component as the real check — it stays UI-only, per `AGENTS.md` Section 4; every enforcement point above is server-side (middleware, route handler, or RLS).
- Don't switch the session/JWT storage to `localStorage` — the reasoning from file 4 (XSS exposure) still holds; this task hardens the cookie-based approach further, it doesn't reverse that decision.
- Don't remove `SameSite=Lax` or set `SameSite=None` "to make cross-origin easier" — that would reopen the CSRF surface this file just closed.
- Don't add a "remember me forever" long-lived token — Supabase's existing refresh-token rotation is the right lifetime model here; extending it manually weakens session hygiene for no real hackathon benefit.
