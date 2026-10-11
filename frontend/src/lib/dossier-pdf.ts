// Shared PDF builders for a dossier's filled forms — used both by the
// back-office DossierModal (browser: "Télécharger en PDF" buttons) and by
// GET /api/admin/dossiers/[id]/export (Node: the same PDFs inside the ZIP),
// so the archive always contains exactly what the team sees on screen.
// jsPDF resolves to its Node build on the server and its ES build in the
// browser; nothing here touches the DOM. The brand mark is drawn with vector
// primitives (no SVG/canvas rasterisation needed, crisp at any zoom).
import jsPDF from 'jspdf';
import { findCountry } from '@/lib/countries';
import { specialtyLabel, type AuthForm } from '@/lib/dossiers-data';

export interface PdfSection {
  heading: string;
  pairs: [string, string | undefined | null][];
}

// Brand tokens (light-mode --prod-* values from globals.css — a PDF is a
// print artifact, independent of the viewer's theme) as plain RGB.
type Rgb = [number, number, number];
const PDF_PRIMARY: Rgb = [29, 78, 216]; // #1d4ed8
const PDF_PRIMARY_DARK: Rgb = [30, 58, 138]; // #1e3a8a
const PDF_INK: Rgb = [15, 23, 42]; // #0f172a
const PDF_INK_FAINT: Rgb = [100, 116, 139]; // #64748b
const PDF_BORDER: Rgb = [226, 232, 240]; // #e2e8f0
const PDF_GOLD: Rgb = [244, 217, 138]; // mark accent

const PDF_MARGIN_X = 16;
const PDF_PAGE_BOTTOM = 282;
const PDF_LABEL_WIDTH = 52;

/** Mixes white over the primary colour — stands in for the mark's translucent dots. */
function whiteOver(base: Rgb, alpha: number): Rgb {
  return base.map((c) => Math.round(c + (255 - c) * alpha)) as Rgb;
}

/** The square brand mark (public/logo/mark.svg), drawn on a 64-unit grid scaled to `size` mm. */
function drawMark(doc: jsPDF, x: number, y: number, size: number) {
  const k = size / 64;
  doc.setFillColor(...PDF_PRIMARY_DARK);
  doc.roundedRect(x, y, size, size, 16 * k, 16 * k, 'F');
  doc.setDrawColor(...whiteOver(PDF_PRIMARY_DARK, 0.55));
  doc.setLineWidth(3 * k);
  doc.lines(
    [
      [12 * k, -8 * k],
      [12 * k, -10 * k],
      [10 * k, -10 * k],
    ],
    x + 14 * k,
    y + 46 * k,
  );
  const dots: Array<[number, number, number, Rgb]> = [
    [14, 46, 3.4, whiteOver(PDF_PRIMARY_DARK, 0.55)],
    [26, 38, 4.4, whiteOver(PDF_PRIMARY_DARK, 0.8)],
    [38, 28, 5.6, [255, 255, 255]],
    [48, 18, 7.4, PDF_GOLD],
  ];
  for (const [cx, cy, r, color] of dots) {
    doc.setFillColor(...color);
    doc.circle(x + cx * k, y + cy * k, r * k, 'F');
  }
  doc.setLineWidth(0.2);
}

/** Plain country name — jsPDF's WinAnsi fonts can't encode flag emoji. */
export function countryLabelPlain(iso2: string | undefined | null): string {
  if (!iso2) return '—';
  const c = findCountry(iso2);
  return c ? c.nameFr : iso2;
}

/** Builds a branded key/value PDF; call `.save(name)` (browser) or `.output('arraybuffer')` (server). */
export function buildKvPdf(
  docTitle: string,
  reference: string,
  sections: PdfSection[],
  now: Date = new Date(),
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PDF_MARGIN_X * 2;

  function drawHeader() {
    doc.setFillColor(...PDF_PRIMARY);
    doc.rect(0, 0, pageWidth, 26, 'F');
    drawMark(doc, PDF_MARGIN_X, 6, 14);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('EDUC BÉNIN', PDF_MARGIN_X + 18, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Accompagnement des dossiers d’inscription — FSS · INMeS', PDF_MARGIN_X + 18, 19);
  }

  function drawFooter(pageNum: number, pageCount: number) {
    doc.setDrawColor(...PDF_BORDER);
    doc.line(PDF_MARGIN_X, 288, pageWidth - PDF_MARGIN_X, 288);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_INK_FAINT);
    const generated = `Généré depuis le back-office Educ Bénin · ${now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`;
    doc.text(generated, PDF_MARGIN_X, 293);
    doc.text(`Page ${pageNum} / ${pageCount}`, pageWidth - PDF_MARGIN_X, 293, { align: 'right' });
  }

  drawHeader();
  let y = 38;
  doc.setTextColor(...PDF_INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(docTitle, PDF_MARGIN_X, y);
  y += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_PRIMARY_DARK);
  doc.text(`Réf. ${reference}`, PDF_MARGIN_X, y);
  y += 9;

  function ensureSpace(nextLineHeight: number) {
    if (y + nextLineHeight > PDF_PAGE_BOTTOM) {
      doc.addPage();
      drawHeader();
      y = 38;
    }
  }

  for (const section of sections) {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...PDF_PRIMARY_DARK);
    doc.text(section.heading.toUpperCase(), PDF_MARGIN_X, y);
    y += 2.5;
    doc.setDrawColor(...PDF_PRIMARY);
    doc.line(PDF_MARGIN_X, y, PDF_MARGIN_X + contentWidth, y);
    y += 6.5;

    for (const [label, rawValue] of section.pairs) {
      const value = rawValue || '—';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const valueLines = doc.splitTextToSize(value, contentWidth - PDF_LABEL_WIDTH) as string[];
      const lineHeight = 5;
      const blockHeight = Math.max(1, valueLines.length) * lineHeight;
      ensureSpace(blockHeight);

      doc.setTextColor(...PDF_INK_FAINT);
      doc.text(label, PDF_MARGIN_X, y);
      doc.setTextColor(...PDF_INK);
      doc.setFont('helvetica', 'bold');
      doc.text(valueLines, PDF_MARGIN_X + PDF_LABEL_WIDTH, y);
      y += blockHeight + 2;
    }
    y += 3;
  }

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    drawFooter(p, pageCount);
  }
  return doc;
}

// ── Section builders (same content on screen, in the modal PDFs and in the ZIP) ──

export interface DemandePdfInput {
  nom: string;
  prenom: string;
  whatsapp: string;
  nationalite: string | null;
  specialtyCodes: string[];
  ecoleNom?: string | null;
  categorieLabel?: string | null;
  filiereLabel?: string | null;
}

export function demandeSections(d: DemandePdfInput): PdfSection[] {
  const pairs: PdfSection['pairs'] = [
    ['Nom', d.nom],
    ['Prénom(s)', d.prenom],
    ['WhatsApp', d.whatsapp],
    ['Nationalité', countryLabelPlain(d.nationalite)],
  ];
  if (d.ecoleNom) pairs.push(['École', d.ecoleNom]);
  if (d.categorieLabel) pairs.push(['Catégorie', d.categorieLabel]);
  if (d.specialtyCodes.length > 0) {
    pairs.push(['Spécialité(s)', specialtyLabel(d.specialtyCodes)]);
  } else if (d.filiereLabel) {
    pairs.push(['Filière', d.filiereLabel]);
  }
  return [{ heading: 'Informations de la demande', pairs }];
}

export function authSections(d: AuthForm): PdfSection[] {
  return [
    {
      heading: 'Informations personnelles',
      pairs: [
        ['Nom', d.nom],
        ['Prénom(s)', d.prenom],
        ['Date de naissance', d.naissance],
        ['Lieu de naissance', d.lieuNaissance],
        ['Nationalité', countryLabelPlain(d.nationalite)],
        ['Adresse actuelle', d.adresse],
        ["Pièce d'identité", `${d.piece} · ${d.pieceRef}`],
        ['E-mail', d.email],
        ['Téléphone', d.tel],
      ],
    },
    {
      heading: 'Diplôme du Baccalauréat',
      pairs: [
        ['Institution', d.bac.institution],
        ['E-mail institution', d.bac.email],
        ["Année d'obtention", d.bac.annee],
        ["Pays d'obtention", countryLabelPlain(d.bac.pays)],
        ['Adresse institution', d.bac.adresse],
      ],
    },
    {
      heading: 'Diplôme du Doctorat',
      pairs: [
        ['Institution', d.doctorat.institution],
        ['E-mail institution', d.doctorat.email],
        ["Année d'obtention", d.doctorat.annee],
        ["Pays d'obtention", countryLabelPlain(d.doctorat.pays)],
        ['Adresse institution', d.doctorat.adresse],
      ],
    },
  ];
}
