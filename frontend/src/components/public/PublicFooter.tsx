import Link from 'next/link';
import { EducBeninLogo } from '@/components/theme/EducBeninLogo';
import { listEcolesForGrid } from '@/lib/server/schools/queries';
import { ecoleSlug } from '@/lib/ecole-display';

// Shared footer for the multi-school public pages (/ecoles, /fss, /inmes,
// /accompagnement) — an async Server Component reading the live Ecole list
// directly from Prisma. Safe here specifically because every current
// consumer is already a force-dynamic page (its main content needs live
// Categorie/Filiere/tarif data anyway); reusing this on an otherwise-static
// page would reintroduce the staleness problem PublicNav's dropdown was
// deliberately built to avoid (see EcoleNavDropdown's doc comment) — fetch
// client-side instead if that ever comes up.
//
// Two variants, matching the 02/03/04/05 reference screenshots exactly:
//   - `{}` (all-schools): a dedicated "Établissements" column listing every
//     school — used by the "Toutes les écoles" and "Accompagnement" hub
//     pages, which aren't about one specific school.
//   - `{ currentEcoleNom }`: the individual École pages — "Plateforme"
//     absorbs "Tous les établissements" + a link to every OTHER school
//     (dynamic — never hardcoded to "the other one"), plus a Contact
//     column naming that school's WhatsApp.
export async function PublicFooter(
  props: { currentEcoleNom?: string; contactLabel?: string } = {},
) {
  const ecoles = await listEcolesForGrid();
  const { currentEcoleNom, contactLabel } = props;

  const brandBlurb = currentEcoleNom
    ? `Educ Bénin n’est ni ${currentEcoleNom === 'INMeS' ? 'l’' : 'la '}${currentEcoleNom}, ni l’UAC.`
    : 'Educ Bénin n’est affilié à aucun établissement de l’UAC.';

  const affiliationLine = currentEcoleNom
    ? `Aucune affiliation avec ${currentEcoleNom === 'INMeS' ? "l'" : 'la '}${currentEcoleNom} ou l'UAC.`
    : "Aucune affiliation avec la FSS, l'INMeS ou l'UAC.";

  return (
    <div className="footer-bleed">
      <div className="footer pw">
        <div className="footer-grid">
          <div>
            <div className="p-logo" style={{ marginBottom: 10 }}>
              <EducBeninLogo height={28} />
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--prod-ink-muted)', maxWidth: '34ch' }}>
              Service indépendant d&rsquo;accompagnement administratif. {brandBlurb}
            </p>
          </div>

          {currentEcoleNom ? (
            <div>
              <h6>Plateforme</h6>
              <Link href="/ecoles">Tous les établissements</Link>
              {ecoles
                .filter((e) => e.nom !== currentEcoleNom)
                .map((e) => (
                  <Link key={e.id} href={`/${ecoleSlug(e.nom)}`}>
                    École — {e.nom}
                  </Link>
                ))}
              <Link href="/accompagnement">Accompagnement</Link>
              <Link href="/suivre-mon-dossier">Suivre mon dossier</Link>
            </div>
          ) : (
            <div>
              <h6>Établissements</h6>
              {ecoles.map((e) => (
                <Link key={e.id} href={`/${ecoleSlug(e.nom)}`}>
                  École — {e.nom}
                </Link>
              ))}
            </div>
          )}

          {!currentEcoleNom && (
            <div>
              <h6>Plateforme</h6>
              <Link href="/">Accueil</Link>
              <Link href="/accompagnement">Accompagnement</Link>
              <Link href="/suivre-mon-dossier">Suivre mon dossier</Link>
            </div>
          )}

          <div>
            <h6>Légal</h6>
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/cgu-cgv">CGU / CGV</Link>
            <Link href="/confidentialite">Politique de confidentialité</Link>
          </div>

          {currentEcoleNom && contactLabel && (
            <div>
              <h6>Contact</h6>
              <span className="footer-text">{contactLabel}</span>
              <span className="footer-text">educbenininfo@gmail.com</span>
            </div>
          )}
        </div>
        <div className="legal-line">
          <span>© 2026 Educ Bénin — Cotonou, Bénin</span>
          <span>{affiliationLine}</span>
        </div>
      </div>
    </div>
  );
}
