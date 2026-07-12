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
