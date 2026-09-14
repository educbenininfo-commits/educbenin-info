// GET /api/ecoles — public, no auth. Backs the "École / Faculté" public-nav
// dropdown (see components/public/EcoleNavDropdown.tsx) with the live list
// of schools — never a hardcoded FSS/INMeS pair, so a school added later
// via the back-office appears here immediately with no redeploy.
//
// Deliberately a client-fetched API route rather than a server-rendered
// list baked into the page: the public pages that render the nav
// (Accueil, Accompagnement, …) are otherwise fully static (prerendered at
// build time) — reading Prisma directly from inside the nav would silently
// freeze the school list to whatever existed at the last build/deploy.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const ecoles = await prisma.ecole.findMany({
      select: { id: true, nom: true, description: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(
      { items: ecoles },
      {
        headers: {
          'x-request-id': ctx.requestId,
          // Short, shared cache — this is public reference data that
          // changes rarely; avoids one DB round trip per nav render across
          // the whole site while still staying fresh within ~30s.
          'Cache-Control': 'public, max-age=30, stale-while-revalidate=300',
        },
      },
    );
  });
}
