// Per-device session tracking — extends the stateless JWT auth model with
// just enough server-side state to answer "which devices am I logged in
// on, and let me kick one out" (Paramètres → Sessions actives). auth.ts's
// own refresh route documents the tradeoff this closes: refresh tokens
// were previously valid for their full 7-day JWT lifetime with no way to
// revoke a single one short of bumping tokenVersion (which logs out every
// device at once). One Session row = one login, identified by the stable
// `sid` claim embedded in both the access and refresh JWTs — the SAME sid
// survives every refresh-token rotation for that login.
//
// Every place that mints a FIRST token pair (login, verify-email, Google
// OAuth callback) must call `issueSessionTokens` instead of
// createAccessToken/createRefreshToken directly, or that login won't have
// a session row — and once refresh.ts enforces touchOrRejectSession, a
// missing session means refresh always fails for that login.
import 'server-only';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { createAccessToken, createRefreshToken } from '@/lib/server/auth';

/**
 * Best-effort User-Agent → "OS · Browser" label — enough for a human to
 * recognize a device in a list, not a full UA-parsing library.
 */
export function parseDeviceLabel(userAgent: string | null | undefined): string {
  if (!userAgent) return 'Appareil inconnu';

  let os = 'Appareil inconnu';
  if (/iPhone/.test(userAgent)) os = 'iPhone';
  else if (/iPad/.test(userAgent)) os = 'iPad';
  else if (/Android/.test(userAgent)) os = 'Android';
  else if (/Windows/.test(userAgent)) os = 'Windows';
  else if (/Macintosh|Mac OS X/.test(userAgent)) os = 'Mac';
  else if (/Linux/.test(userAgent)) os = 'Linux';

  let browser = 'Navigateur inconnu';
  if (/Edg\//.test(userAgent)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(userAgent)) browser = 'Opera';
  else if (/CriOS\//.test(userAgent)) browser = 'Chrome';
  else if (/Chrome\//.test(userAgent) && !/Chromium/.test(userAgent)) browser = 'Chrome';
  else if (/Firefox\//.test(userAgent)) browser = 'Firefox';
  else if (/Safari\//.test(userAgent) && !/Chrome/.test(userAgent)) browser = 'Safari';

  return `${os} · ${browser}`;
}

function extractClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get('x-real-ip');
  return real ? real.trim() : null;
}

// Loopback/private ranges — always true in local dev, where a geo lookup
// would be meaningless noise (or fail outright with no internet route).
const PRIVATE_IP_RE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc00:|fe80:)/;

/**
 * Best-effort "City, Country" from IP via a free, keyless lookup — resolved
 * once at session creation, never repeated. Failures (offline, rate limit,
 * private IP) resolve to `null`; this must never block or fail a login.
 */
async function resolveLocation(ip: string | null): Promise<string | null> {
  if (!ip || PRIVATE_IP_RE.test(ip)) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,country`,
      { signal: controller.signal },
    ).finally(() => clearTimeout(timeout));
    if (!res.ok) return null;
    const data = (await res.json()) as { status: string; city?: string; country?: string };
    if (data.status !== 'success') return null;
    return [data.city, data.country].filter(Boolean).join(', ') || null;
  } catch {
    return null;
  }
}

/**
 * Creates the Session row for a fresh login and mints the access+refresh
 * tokens carrying its id as `sid`. Call this instead of
 * createAccessToken/createRefreshToken from any route that authenticates a
 * user for the first time in a flow (login, verify-email, OAuth callback).
 */
export async function issueSessionTokens(
  user: { id: string; email: string; tokenVersion: number },
  req: NextRequest,
): Promise<{ accessToken: string; refreshToken: string }> {
  const userAgent = req.headers.get('user-agent');
  const ip = extractClientIp(req);
  const location = await resolveLocation(ip);

  const session = await prisma.session.create({
    data: { userId: user.id, userAgent, device: parseDeviceLabel(userAgent), ip, location },
    select: { id: true },
  });

  const accessToken = await createAccessToken({
    sub: user.id,
    email: user.email,
    tokenVersion: user.tokenVersion,
    sid: session.id,
  });
  const refreshToken = await createRefreshToken(user.id, user.tokenVersion, session.id);
  return { accessToken, refreshToken };
}

/**
 * Enforcement point for revocation: called on every refresh. Returns false
 * (reject the refresh with 401) when the session is missing, doesn't
 * belong to this user, or was already revoked. Otherwise bumps
 * `lastSeenAt` for the "dernière activité" column and returns true.
 */
export async function touchOrRejectSession(
  sid: string | undefined,
  userId: string,
): Promise<boolean> {
  if (!sid) return false;
  const updated = await prisma.session.updateMany({
    where: { id: sid, userId, revokedAt: null },
    data: { lastSeenAt: new Date() },
  });
  return updated.count > 0;
}

/**
 * Revokes one session, scoped to `userId` so a caller can never revoke
 * someone else's session by guessing an id. Returns false if nothing
 * matched (already revoked, wrong owner, or unknown id) — callers that
 * must not fail (logout) should wrap this in try/catch themselves rather
 * than rely on a swallowed error here.
 */
export async function revokeSession(sid: string | undefined, userId: string): Promise<boolean> {
  if (!sid) return false;
  const updated = await prisma.session.updateMany({
    where: { id: sid, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return updated.count > 0;
}

export interface SessionSummary {
  id: string;
  device: string;
  location: string | null;
  lastSeenAt: string;
  createdAt: string;
  current: boolean;
}

/** Active (non-revoked) sessions for a user, most recently active first. */
export async function listActiveSessions(
  userId: string,
  currentSid: string | null,
): Promise<SessionSummary[]> {
  const rows = await prisma.session.findMany({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: 'desc' },
    select: { id: true, device: true, location: true, lastSeenAt: true, createdAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    device: r.device ?? 'Appareil inconnu',
    location: r.location,
    lastSeenAt: r.lastSeenAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    current: r.id === currentSid,
  }));
}
