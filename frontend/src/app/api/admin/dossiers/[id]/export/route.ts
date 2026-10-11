// GET /api/admin/dossiers/[id]/export — SUPERADMIN only. Builds a ZIP with
// everything about one candidate's dossier, ready to archive or forward:
//   01-formulaire-demande.pdf          the filled request form
//   02-formulaire-authentification.pdf the filled diploma-authentication form (if submitted)
//   03-recapitulatif.pdf               stage, payment, rejection reason, public comments
//   pieces-jointes/…                   every stored file (dossier PDF, diplomas,
//                                      translations, fiche d'inscription, preuve de dépôt)
// The two forms are rendered by the same builders as the modal's "PDF"
// buttons (lib/dossier-pdf.ts), so the archive matches what the team sees.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { ZipArchive } from 'archiver';
import { requireSuperadmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { downloadObject } from '@/lib/server/upload/supabase-storage-client';
import { STAGE_NAMES, type AuthForm } from '@/lib/dossiers-data';
import { authSections, buildKvPdf, demandeSections, type PdfSection } from '@/lib/dossier-pdf';

type FileField =
  | 'pieceJointeUrl'
  | 'diplomaBacUrl'
  | 'diplomaBacTranslatedUrl'
  | 'diplomaDoctoratUrl'
  | 'diplomaDoctoratTranslatedUrl'
  | 'ficheUrl'
  | 'recepisseUrl';

const FILE_FIELDS: { field: FileField; name: string }[] = [
  { field: 'pieceJointeUrl', name: 'piece-jointe' },
  { field: 'diplomaBacUrl', name: 'diplome-bac' },
  { field: 'diplomaBacTranslatedUrl', name: 'diplome-bac-traduit' },
  { field: 'diplomaDoctoratUrl', name: 'diplome-doctorat' },
  { field: 'diplomaDoctoratTranslatedUrl', name: 'diplome-doctorat-traduit' },
  { field: 'ficheUrl', name: 'fiche-inscription' },
  { field: 'recepisseUrl', name: 'preuve-de-depot' },
];

/** Storage paths carry no extension — pick one from the file's magic bytes. */
function extensionOf(buf: Buffer): string {
  if (buf.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf';
  if (buf[0] === 0x89 && buf.subarray(1, 4).toString('latin1') === 'PNG') return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return 'bin';
}

function fetchDossier(id: string) {
  return prisma.dossier.findUnique({
    where: { id },
    include: {
      comments: { orderBy: { createdAt: 'asc' } },
      ecole: { select: { nom: true } },
      categorie: { select: { libelle: true, libelleCourt: true } },
      filiere: { select: { nom: true } },
    },
  });
}

type FullDossier = NonNullable<Awaited<ReturnType<typeof fetchDossier>>>;

const fcfa = (n: number) => `${n.toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ')} FCFA`;
const dateFr = (d: Date) =>
  d.toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Africa/Porto-Novo',
  });

function recapSections(d: FullDossier): PdfSection[] {
  const sections: PdfSection[] = [
    {
      heading: 'Suivi du dossier',
      pairs: [
        ['Référence', d.reference],
        ['Candidat', `${d.prenom} ${d.nom}`],
        ['École', d.ecole?.nom],
        ['Catégorie', d.categorie?.libelleCourt ?? d.categorie?.libelle],
        ['Étape actuelle', STAGE_NAMES[d.stage] ?? String(d.stage)],
        ['Demande reçue le', dateFr(d.createdAt)],
        ["Dernier changement d'étape", dateFr(d.stageChangedAt)],
        ...(d.motifRejet ? ([['Motif de rejet', d.motifRejet]] as PdfSection['pairs']) : []),
      ],
    },
    {
      heading: 'Paiement (interne)',
      pairs: [
        ['Montant', fcfa(d.montant)],
        ...(d.montantSupplement
          ? ([['Supplément', fcfa(d.montantSupplement)]] as PdfSection['pairs'])
          : []),
        ['Payé', fcfa(d.paye)],
        ['Moyen de paiement', d.moyen],
      ],
    },
  ];
  const publicComments = d.comments.filter((c) => c.type === 'public');
  if (publicComments.length > 0) {
    sections.push({
      heading: 'Commentaires transmis au candidat',
      pairs: publicComments.map((c) => [`${dateFr(c.createdAt)}`, `${c.authorName} : ${c.text}`]),
    });
  }
  return sections;
}

function pdfBuffer(doc: ReturnType<typeof buildKvPdf>): Buffer {
  return Buffer.from(doc.output('arraybuffer'));
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
  const ref = dossier.reference;

  archive.append(
    pdfBuffer(
      buildKvPdf(
        'Informations de la demande',
        ref,
        demandeSections({
          nom: dossier.nom,
          prenom: dossier.prenom,
          whatsapp: dossier.whatsapp,
          nationalite: dossier.nationalite,
          specialtyCodes: dossier.specialtyCodes,
          ecoleNom: dossier.ecole?.nom ?? null,
          categorieLabel: dossier.categorie?.libelleCourt ?? dossier.categorie?.libelle ?? null,
          filiereLabel: dossier.filiere?.nom ?? null,
        }),
      ),
    ),
    { name: '01-formulaire-demande.pdf' },
  );

  const authForm = dossier.authFormData as AuthForm | null;
  if (authForm) {
    archive.append(
      pdfBuffer(
        buildKvPdf('Authentification de diplôme — réponses soumises', ref, authSections(authForm)),
      ),
      { name: '02-formulaire-authentification.pdf' },
    );
  }

  archive.append(pdfBuffer(buildKvPdf('Récapitulatif du dossier', ref, recapSections(dossier))), {
    name: '03-recapitulatif.pdf',
  });

  const buffers = await Promise.all(FILE_FIELDS.map(({ field }) => downloadObject(dossier[field])));
  const presentFiles: string[] = [];
  FILE_FIELDS.forEach(({ name }, i) => {
    const buffer = buffers[i];
    if (!buffer) return;
    const fileName = `${name}.${extensionOf(buffer)}`;
    archive.append(buffer, { name: `pieces-jointes/${fileName}` });
    presentFiles.push(fileName);
  });
  void archive.finalize();

  await logAdminAction(prisma, {
    actorId: auth.admin.id,
    action: 'dossier.zip_export',
    targetType: 'Dossier',
    targetId: id,
    metadata: { reference: ref, files: presentFiles, authForm: Boolean(authForm) },
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
      'Content-Disposition': `attachment; filename="dossier-${ref}.zip"`,
    },
  });
}
