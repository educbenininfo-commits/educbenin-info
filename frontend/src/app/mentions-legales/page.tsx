// Écran Mentions légales — docs/design-reference/DESIGN-SPEC.md, section
// "5. Mentions légales". Contenu intégral reproduit à la lettre depuis
// docs/design-reference/educbenin-prototype.html. Les champs "[À COMPLÉTER]"
// sont des informations juridiques réelles non finalisées — à ne pas
// inventer, ils restent tels quels jusqu'à ce que le client les fournisse.

import { PublicNav } from '@/components/public/PublicNav';
import { PublicBottomNav } from '@/components/public/PublicBottomNav';

export default function MentionsLegalesPage() {
  return (
    <div className="prod">
      <PublicNav active="mentions" />
      <PublicBottomNav active="mentions" />

      <div className="legal">
        <div className="k">Légal</div>
        <h1>Mentions légales</h1>
        <div className="updated">Dernière mise à jour : à définir à l&rsquo;immatriculation</div>

        <h2>Éditeur du site</h2>
        <p>
          Raison sociale : <span className="fill">[À COMPLÉTER]</span> · Forme juridique :{' '}
          <span className="fill">[À COMPLÉTER]</span> · RCCM :{' '}
          <span className="fill">[À COMPLÉTER]</span> · IFU :{' '}
          <span className="fill">[À COMPLÉTER]</span> · Siège :{' '}
          <span className="fill">[À COMPLÉTER]</span> · Contact :{' '}
          <span className="fill">[À COMPLÉTER]</span>
        </p>

        <h2>Hébergeur</h2>
        <p>
          Raison sociale, adresse et contact de l&rsquo;hébergeur :{' '}
          <span className="fill">[À COMPLÉTER selon le prestataire retenu]</span>
        </p>

        <h2>Propriété intellectuelle</h2>
        <p>
          L&rsquo;ensemble des éléments du site Educ Bénin (textes, graphismes, logo, structure) est
          protégé au titre de la propriété intellectuelle. Toute reproduction non autorisée est
          interdite, sous réserve des exceptions légales.
        </p>

        <h2>Non-affiliation</h2>
        <p>
          Educ Bénin est un site indépendant, sans lien capitalistique ni mandat officiel avec la
          Faculté des Sciences de la Santé (FSS) ni avec l&rsquo;Université d&rsquo;Abomey-Calavi
          (UAC). Les noms « FSS » et « UAC » ainsi que le portail cuo.sigan-uac.bj sont mentionnés à
          seule fin d&rsquo;information et d&rsquo;orientation du candidat vers les démarches
          officielles.
        </p>
      </div>
    </div>
  );
}
