// Site-wide "mode maintenance" flag — toggled by a SUPERADMIN from the
// Tableau de bord, read on every public-page request by middleware.ts.
//
// Stored in Upstash Redis (already wired, HTTP-based so it's readable from
// Edge middleware) rather than Postgres, since this is a hot flag read on
// every request and Edge middleware deliberately avoids Prisma (see
// middleware.ts's own comment). Falls back to an in-memory value when Redis
// isn't configured (e.g. local dev without Upstash creds) — fine for local
// testing since middleware.ts never enforces maintenance mode outside
// NODE_ENV=production anyway.
import 'server-only';
import { redis } from './redis';

const REDIS_KEY = 'site:maintenance:enabled';

let memoryState = false;

export async function getMaintenanceEnabled(): Promise<boolean> {
  if (!redis) return memoryState;
  const value = await redis.get<boolean>(REDIS_KEY);
  return value === true;
}

export async function setMaintenanceEnabled(enabled: boolean): Promise<void> {
  if (!redis) {
    memoryState = enabled;
    return;
  }
  if (enabled) {
    await redis.set(REDIS_KEY, true);
  } else {
    await redis.del(REDIS_KEY);
  }
}
