export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { uploadPublicFile } from '@/lib/server/upload/uploadPublicFile';

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const csrfFail = verifyCsrf(req);
  if (csrfFail) return csrfFail;

  const auth = await requireAdmin('ADMIN');
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const { id } = await ctx.params;
  const dossier = await prisma.dossier.findUnique({
    where: { id },
    select: { id: true, reference: true, stage: true, recepisseUploaded: true },
  });
  if (!dossier) {
    return NextResponse.json({ error: 'DOSSIER_NOT_FOUND' }, { status: 404 });
  }
  const allowed = dossier.stage === 4 || (dossier.stage === 5 && !dossier.recepisseUploaded);
  if (!allowed) {
    return NextResponse.json({ error: 'WRONG_STAGE' }, { status: 409 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'VALIDATION_FAILED', message: 'File is required' },
      { status: 400 },
    );
  }

  const upload = await uploadPublicFile(file, `dossiers/${dossier.reference}/recepisse`);
  if (!upload.ok) {
    return NextResponse.json(
      { error: upload.error.code, message: 'File upload failed' },
      { status: upload.error.status },
    );
  }

  // `include: comments` — see Task 11's identical note.
  const updated = await prisma.dossier.update({
    where: { id },
    data: { recepisseUploaded: true, recepisseUrl: upload.url },
    include: { comments: { orderBy: { createdAt: 'asc' } } },
  });

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'dossier.recepisse_upload',
    targetType: 'Dossier',
    targetId: id,
    metadata: { reference: dossier.reference },
  });

  return NextResponse.json({ dossier: updated });
}
