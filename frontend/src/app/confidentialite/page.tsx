// Écran Politique de confidentialité — docs/design-reference/DESIGN-SPEC.md,
// section "7. Politique de confidentialité". Contenu intégral reproduit à la
// lettre depuis docs/design-reference/educbenin-prototype.html. Les champs
// "[À COMPLÉTER]" et la mention "(proposition à valider)" sont des points
// réels non tranchés côté client — à ne pas combler par extrapolation.

import { PublicNav } from '@/components/public/PublicNav';
import { PublicBottomNav } from '@/components/public/PublicBottomNav';

export default function ConfidentialitePage() {
  return (
    <div className="prod">
      <PublicNav active="confidentialite" />
      <PublicBottomNav active="confidentialite" />

      <div className="legal">
        <div className="k">Légal</div>
        <h1>Politique de confidentialité</h1>
        <div className="updated">
          Conforme à la loi n° 2017-20 portant Code du numérique du Bénin (Livre V)
        </div>

        <h2>Responsable de traitement</h2>
        <p>
          <span className="fill">[À COMPLÉTER]</span>, joignable à{' '}
          <span className="fill">[À COMPLÉTER]</span>.
        </p>

        <h2>Données collectées</h2>
        <p>
          Identité, contact (WhatsApp, e-mail), parcours académique, pièces d&rsquo;identité et
          diplômes, fiche d&rsquo;inscription, récépissé de dépôt.
        </p>

        <h2>Finalités</h2>
        <p>
          Constitution et suivi du dossier de probatoire, accompagnement à l&rsquo;authentification
          des diplômes, communication sur l&rsquo;avancement du dossier.
        </p>

        <h2>Destinataires</h2>
        <p>
          FSS, UAC (portail CUO-SIGAN), institutions compétentes pour l&rsquo;authentification des
          diplômes. Aucune donnée vendue, louée ou communiquée à des fins commerciales.
        </p>

        <h2>Durée de conservation</h2>
        <p>
          Durée du traitement du dossier, puis 24 mois après clôture (proposition à valider), avant
          suppression ou anonymisation.
        </p>

        <h2>Vos droits</h2>
        <p>
          Accès, rectification, opposition, effacement, portabilité et réparation, exercés auprès de{' '}
          <span className="fill">[À COMPLÉTER]</span>. Réclamation possible auprès de
          l&rsquo;Autorité de Protection des Données Personnelles (APDP) du Bénin.
        </p>
      </div>
    </div>
  );
}
