// GET /api/admin/dossiers/[id]/export — SUPERADMIN only. Streams a ZIP
// archive containing every stored file for a dossier plus a plain-text
// summary of all its data fields — "toutes les informations et fichiers
// d'un candidat" in one download, for archival/investigation purposes. Not
// styled (unlike the candidate-facing PDF exports in DossierModal) — this is
// an internal export, exhaustiveness matters more than presentation.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { ZipArchive } from 'archiver';
import { requireSuperadmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { downloadObject } from '@/lib/server/upload/supabase-storage-client';
import { specialtyLabel } from '@/lib/dossiers-data';
import type { AuthForm } from '@/lib/dossiers-data';

type FileField =
  | 'pieceJointeUrl'
  | 'diplomaBacUrl'
  | 'diplomaBacTranslatedUrl'
  | 'diplomaDoctoratUrl'
  | 'diplomaDoctoratTranslatedUrl'
  | 'ficheUrl'
  | 'recepisseUrl';

const FILE_FIELDS: { field: FileField; name: string }[] = [
  { field: 'pieceJointeUrl', name: 'piece-jointe.pdf' },
  { field: 'diplomaBacUrl', name: 'diplome-bac.pdf' },
  { field: 'diplomaBacTranslatedUrl', name: 'diplome-bac-traduit.pdf' },
  { field: 'diplomaDoctoratUrl', name: 'diplome-doctorat.pdf' },
  { field: 'diplomaDoctoratTranslatedUrl', name: 'diplome-doctorat-traduit.pdf' },
  { field: 'ficheUrl', name: 'fiche-inscription.pdf' },
  { field: 'recepisseUrl', name: 'recepisse.pdf' },
];

function buildResume(d: NonNullable<Awaited<ReturnType<typeof fetchDossier>>>): string {
  const lines: string[] = [];
  lines.push(`Dossier ${d.reference}`);
  lines.push('='.repeat(`Dossier ${d.reference}`.length));
  lines.push('');
  lines.push('DEMANDE');
  lines.push('-'.repeat(7));
  lines.push(`Nom : ${d.nom}`);
  lines.push(`Prénom(s) : ${d.prenom}`);
  lines.push(`WhatsApp : ${d.whatsapp}`);
  lines.push(`Nationalité : ${d.nationalite ?? '—'}`);
  lines.push(`Spécialité(s) : ${specialtyLabel(d.specialtyCodes)}`);
  lines.push(`Étape actuelle : ${d.stage}`);
  if (d.motifRejet) lines.push(`Motif de rejet : ${d.motifRejet}`);
  lines.push('');

  const auth = d.authFormData as AuthForm | null;
  if (auth) {
    lines.push('AUTHENTIFICATION DE DIPLÔME');
    lines.push('-'.repeat(27));
    lines.push(`Nom : ${auth.nom}`);
    lines.push(`Prénom(s) : ${auth.prenom}`);
    lines.push(`Date de naissance : ${auth.naissance}`);
    lines.push(`Lieu de naissance : ${auth.lieuNaissance}`);
    lines.push(`Nationalité : ${auth.nationalite}`);
    lines.push(`Adresse actuelle : ${auth.adresse}`);
    lines.push(`Pièce d'identité : ${auth.piece} · ${auth.pieceRef}`);
    lines.push(`E-mail : ${auth.email}`);
    lines.push(`Téléphone : ${auth.tel}`);
    lines.push('');
    lines.push('Diplôme du Baccalauréat');
    lines.push(`  Institution : ${auth.bac.institution}`);
    lines.push(`  E-mail institution : ${auth.bac.email}`);
    lines.push(`  Année d'obtention : ${auth.bac.annee}`);
    lines.push(`  Pays d'obtention : ${auth.bac.pays}`);
    lines.push(`  Adresse institution : ${auth.bac.adresse}`);
    lines.push('');
    lines.push('Diplôme du Doctorat');
    lines.push(`  Institution : ${auth.doctorat.institution}`);
    lines.push(`  E-mail institution : ${auth.doctorat.email}`);
    lines.push(`  Année d'obtention : ${auth.doctorat.annee}`);
    lines.push(`  Pays d'obtention : ${auth.doctorat.pays}`);
    lines.push(`  Adresse institution : ${auth.doctorat.adresse}`);
    lines.push('');
  }

  lines.push('PAIEMENT (interne)');
  lines.push('-'.repeat(19));
  lines.push(`Montant : ${d.montant} FCFA`);
  if (d.montantSupplement) lines.push(`Supplément : ${d.montantSupplement} FCFA`);
  lines.push(`Payé : ${d.paye} FCFA`);
  lines.push(`Moyen de paiement : ${d.moyen}`);
  lines.push('');

  const publicComments = d.comments.filter((c) => c.type === 'public');
  if (publicComments.length > 0) {
    lines.push('COMMENTAIRES PUBLICS');
    lines.push('-'.repeat(20));
    for (const c of publicComments) {
      lines.push(`[${c.createdAt.toISOString()}] ${c.authorName}: ${c.text}`);
    }
    lines.push('');
  }

  lines.push(`Exporté le ${new Date().toLocaleString('fr-FR')}`);
  return lines.join('\n');
}

function fetchDossier(id: string) {
  return prisma.dossier.findUnique({
    where: { id },
    include: { comments: { orderBy: { createdAt: 'asc' } } },
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireSuperadmin();
  if (auth instanceof NextResponse) return auth;

  const limited = await enforceAdminRateLimit(auth.admin.id);
  if (limited) return limited;

  const { id } = await ctx.params;
  const dossier = await fetchDossier(id);
  if (!dossier) {
    return NextResponse.json({ error: 'DOSSIER_NOT_FOUND' }, { status: 404 });
  }

  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.append(buildResume(dossier), { name: `resume-${dossier.reference}.txt` });

  const presentFiles: string[] = [];
  for (const { field, name } of FILE_FIELDS) {
    const path = dossier[field];
    const buffer = await downloadObject(path);
    if (buffer) {
      archive.append(buffer, { name });
      presentFiles.push(name);
    }
  }
  void archive.finalize();

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'dossier.zip_export',
    targetType: 'Dossier',
    targetId: id,
    metadata: { reference: dossier.reference, files: presentFiles },
  });

  const chunks: Buffer[] = [];
  for await (const chunk of archive) {
    chunks.push(chunk as Buffer);
  }
  const body = Buffer.concat(chunks);

  return new Response(new Uint8Array(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="dossier-${dossier.reference}.zip"`,
    },
  });
}
