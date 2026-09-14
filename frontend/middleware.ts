import { NextResponse, type NextRequest } from 'next/server';
import { getMaintenanceEnabled } from '@/lib/server/maintenance';

// Two responsibilities, both Edge-safe:
//
// 1) Site-wide "mode maintenance" gate — a SUPERADMIN toggles this from the
//    Tableau de bord (GET/POST /api/admin/maintenance), which flips a Redis
//    flag (lib/server/maintenance.ts). When enabled in production, every
//    public page is rewritten to app/maintenance/page.tsx (URL bar unchanged)
//    EXCEPT /admin, /connexion, and /maintenance itself, so a SUPERADMIN can
//    always log in and switch it back off. Never enforced outside
//    NODE_ENV=production, so local `pnpm dev` is never affected even though
//    the Redis instance may be shared with prod.
//
// 2) Silent-refresh gate for protected pages.
//
// The (15-min) access cookie can expire while a (7-day) refresh cookie is
// still valid — typically when a tab sat unfocused or the laptop slept. The
// (authed) layout calling /api/auth/me would 401 and the user would be kicked
// to /login. This middleware catches that case BEFORE the page renders and
// bounces the request through /api/auth/refresh-and-return, which mints fresh
// cookies and 302s back to the original URL — invisible to the user.
//
// Protected paths are configured via AUTH_PROTECTED_PREFIXES (comma-separated,
// e.g. "/dashboard,/account"). Empty by default — the API surface is the only
// thing shipped, so out-of-the-box this middleware is a no-op.
//
// Edge runtime: no DB, no bcrypt, no Prisma. We only inspect cookies, read the
// Redis maintenance flag (HTTP-based, Edge-compatible), and build redirects —
// the heavy lifting happens in /api/auth/refresh-and-return (runtime=nodejs).

const MAINTENANCE_EXEMPT_PREFIXES = ['/admin', '/connexion', '/maintenance'];

function isMaintenanceExempt(pathname: string): boolean {
  return MAINTENANCE_EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const COOKIE_PREFIX = process.env.COOKIE_PREFIX || 'app';
const ACCESS_COOKIE = `${COOKIE_PREFIX}-token`;
const REFRESH_COOKIE = `${COOKIE_PREFIX}-refresh`;
const LOGIN_PATH = process.env.AUTH_LOGIN_PATH || '/login';

const AUTHED_PREFIXES = (process.env.AUTH_PROTECTED_PREFIXES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function isAuthedPath(pathname: string): boolean {
  return AUTHED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname, search } = req.nextUrl;

  if (process.env.NODE_ENV === 'production' && !isMaintenanceExempt(pathname)) {
    if (await getMaintenanceEnabled()) {
      const url = req.nextUrl.clone();
      url.pathname = '/maintenance';
      return NextResponse.rewrite(url);
    }
  }

  if (AUTHED_PREFIXES.length === 0) return NextResponse.next();

  if (!isAuthedPath(pathname)) return NextResponse.next();

  if (req.cookies.get(ACCESS_COOKIE)?.value) return NextResponse.next();

  const target = pathname + search;

  if (!req.cookies.get(REFRESH_COOKIE)?.value) {
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = `?next=${encodeURIComponent(target)}`;
    return NextResponse.redirect(url, 303);
  }

  const url = req.nextUrl.clone();
  url.pathname = '/api/auth/refresh-and-return';
  url.search = `?next=${encodeURIComponent(target)}`;
  return NextResponse.redirect(url, 303);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)'],
};
