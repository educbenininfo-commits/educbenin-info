import type { FiliereDetail } from '@/lib/server/schools/queries';

// Plain filière list — no accordion, no date/heure/salle (only meaningful
// for a "concours_ou_composition" Categorie, see schema.prisma's Ecole doc
// comment) — just name + a WhatsApp group link per row. Used by the École
// — FSS page's "15 filières du Master FSS" section
// (03-ecole-fss.md: "même esprit visuel [...] en plus simple").
export function FiliereSimpleList({
  filieres,
  ecoleWhatsappGeneral,
}: {
  filieres: FiliereDetail[];
  ecoleWhatsappGeneral: string | null;
}) {
  return (
    <div className="filiere-simple-grid">
      {filieres.map((f) => (
        <div key={f.id} className="filiere-simple-row">
          <span>{f.nom}</span>
          <a
            href={f.lienWhatsapp ?? ecoleWhatsappGeneral ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
          >
            <span className="ic">✆</span> Groupe WhatsApp
          </a>
        </div>
      ))}
    </div>
  );
}
