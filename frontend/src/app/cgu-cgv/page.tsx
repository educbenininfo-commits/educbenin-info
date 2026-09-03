// Écran CGU / CGV — docs/design-reference/DESIGN-SPEC.md, section "6. CGU /
// CGV". Contenu intégral reproduit à la lettre depuis
// docs/design-reference/educbenin-prototype.html. La numérotation lacunaire
// des articles (1,2,3,5,6,8,10 — pas de 4,7,9) est volontaire, pas une
// erreur de transcription — voir DESIGN-SPEC.md.

import { PublicNav } from '@/components/public/PublicNav';
import { PublicBottomNav } from '@/components/public/PublicBottomNav';

export default function CguCgvPage() {
  return (
    <div className="prod">
      <PublicNav active="cgv" />
      <PublicBottomNav active="cgv" />

      <div className="legal">
        <div className="k">Légal</div>
        <h1>Conditions Générales d&rsquo;Utilisation et de Vente</h1>
        <div className="updated">Version applicable à toute demande soumise depuis le site</div>

        <h2>Article 1 — Objet</h2>
        <p>
          Les présentes conditions régissent l&rsquo;utilisation du site Educ Bénin et la fourniture
          d&rsquo;un service payant d&rsquo;accompagnement administratif au médecin candidat pour la
          constitution et le suivi de son dossier de probatoire spécialité auprès de la FSS.
        </p>

        <h2>Article 2 — Obligation de moyens</h2>
        <p>
          Educ Bénin met en œuvre les moyens raisonnables pour accompagner l&rsquo;utilisateur. Educ
          Bénin ne garantit ni l&rsquo;acceptation du dossier par la FSS, ni le succès de
          l&rsquo;authentification des diplômes, ces décisions relevant exclusivement des autorités
          compétentes.
        </p>

        <h2>Article 3 — Non-affiliation</h2>
        <p>
          Educ Bénin n&rsquo;est ni la FSS, ni l&rsquo;UAC. Il appartient à l&rsquo;utilisateur de
          vérifier auprès des sources officielles l&rsquo;exactitude et l&rsquo;actualité des
          informations et procédures.
        </p>

        <h2>Article 5 — Obligations de l&rsquo;utilisateur</h2>
        <p>
          Fournir des informations exactes, garantir l&rsquo;authenticité des pièces transmises, et
          — en cas de demande multi-spécialités — produire une demande et une lettre distinctes pour
          chaque spécialité.
        </p>

        <h2>Article 6 — Tarifs et paiement</h2>
        <p>
          50 000 FCFA pour un dossier portant sur une seule spécialité (voir grille tarifaire en
          vigueur). Aucun paiement en ligne : règlement hors plateforme, modalités communiquées par
          WhatsApp.
        </p>

        <h2>Article 8 — Responsabilité</h2>
        <p>
          La responsabilité d&rsquo;Educ Bénin ne saurait être engagée en cas de décision
          défavorable d&rsquo;un tiers, de retard imputable à des tiers, ou d&rsquo;inexactitude
          d&rsquo;une information fournie par l&rsquo;utilisateur.
        </p>

        <h2>Article 10 — Droit applicable</h2>
        <p>
          Les présentes conditions sont soumises au droit béninois. Tout litige relève, à défaut de
          résolution amiable, des juridictions compétentes de la République du Bénin.
        </p>
      </div>
    </div>
  );
}
