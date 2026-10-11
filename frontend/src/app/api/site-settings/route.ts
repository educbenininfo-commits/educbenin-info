// GET /api/site-settings — public, no auth. Display settings the statically
// prerendered public pages read client-side (currently the mobile menu
// placement). Short shared cache: a back-office change reaches visitors
// within a minute without hitting the database on every page view.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse } from 'next/server';
import { getDisplaySettings } from '@/lib/server/site-settings';

export async function GET(): Promise<NextResponse> {
  const settings = await getDisplaySettings();
  return NextResponse.json(settings, {
    headers: { 'cache-control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300' },
  });
}
