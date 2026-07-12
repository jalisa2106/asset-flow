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
