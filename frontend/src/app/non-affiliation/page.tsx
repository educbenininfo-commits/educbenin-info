// Écran "Non-affiliation" — page dédiée, demandée pour que le lien "En
// savoir plus" du bandeau d'avertissement (DisclaimerBar) pointe vers une
// explication détaillée plutôt que vers les Mentions légales (dont
// certains champs restent "[À COMPLÉTER]" le temps de l'immatriculation).
// Reprend et développe des faits déjà établis ailleurs sur le site
// (DisclaimerBar, pied de page, Mentions légales § Non-affiliation, CGU/CGV
// art. 2 et 3) — n'invente aucune nouvelle affirmation juridique.
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicNav } from '@/components/public/PublicNav';
import { PublicBottomNav } from '@/components/public/PublicBottomNav';

export const metadata: Metadata = {
  title: 'Non-affiliation',
  description:
    "Educ Bénin est un service d'accompagnement indépendant : il n'est ni la FSS, ni l'INMeS, ni l'UAC, et n'agit sous aucun mandat officiel de ces institutions.",
  alternates: { canonical: '/non-affiliation' },
};

export default function NonAffiliationPage() {
  return (
    <div className="prod">
      <PublicNav active="non-affiliation" />
      <PublicBottomNav active="non-affiliation" />

      <div className="legal">
        <div className="k">Légal</div>
        <h1>Non-affiliation</h1>
        <div className="updated">
          À lire avant toute démarche — complète les Mentions légales et les CGU / CGV
        </div>

        <h2>Un service indépendant</h2>
        <p>
          Educ Bénin est un service privé et indépendant d&rsquo;accompagnement administratif. Il
          aide le candidat à rassembler ses pièces, à faire authentifier ses diplômes le cas
          échéant, à s&rsquo;inscrire en ligne et à déposer son dossier de candidature — en
          contrepartie d&rsquo;un tarif communiqué avant toute confirmation. Educ Bénin n&rsquo;est
          ni un service public, ni un démembrement d&rsquo;une université ou d&rsquo;un institut.
        </p>

        <h2>Aucune affiliation, aucun mandat officiel</h2>
        <p>
          Educ Bénin n&rsquo;est ni la Faculté des Sciences de la Santé (FSS), ni l&rsquo;Institut
          National Médico-Sanitaire (INMeS), ni l&rsquo;Université d&rsquo;Abomey-Calavi (UAC). Il
          n&rsquo;existe entre Educ Bénin et ces institutions aucun lien capitalistique, aucun
          mandat officiel, aucune délégation de service public, et aucun accord de partenariat. Educ
          Bénin n&rsquo;agit au nom d&rsquo;aucune d&rsquo;entre elles et ne parle pas en leur nom.
        </p>

        <h2>Pourquoi ces noms apparaissent sur le site</h2>
        <p>
          Les noms « FSS », « INMeS », « UAC » et « Ministère », ainsi que le portail officiel
          d&rsquo;inscription cuo.sigan-uac.bj, sont mentionnés sur ce site uniquement à titre
          informatif : pour situer les démarches accompagnées et orienter le candidat vers les
          bonnes procédures officielles. Cette mention ne constitue ni un partenariat, ni un
          parrainage, ni une reconnaissance de la part de ces institutions, et Educ Bénin
          n&rsquo;utilise aucun de leurs logos ni de leur identité visuelle officielle.
        </p>

        <h2>Ce qu&rsquo;Educ Bénin ne peut pas garantir</h2>
        <p>
          Educ Bénin met en œuvre une obligation de moyens : vérifier la complétude du dossier,
          respecter les délais annoncés et transmettre les pièces dans les règles. En revanche,
          l&rsquo;acceptation d&rsquo;un dossier, le résultat d&rsquo;une authentification de
          diplôme, l&rsquo;issue d&rsquo;un concours ou d&rsquo;une composition, et toute autre
          décision relevant d&rsquo;une procédure administrative ou académique, appartiennent
          exclusivement à la FSS, à l&rsquo;INMeS, à l&rsquo;UAC ou au Ministère compétent — jamais
          à Educ Bénin.
        </p>

        <h2>Vérifiez toujours auprès des sources officielles</h2>
        <p>
          Les informations, dates et procédures présentées sur ce site sont fournies à titre
          indicatif et peuvent évoluer d&rsquo;une année à l&rsquo;autre. Il appartient à chaque
          candidat de confirmer, auprès de la FSS, de l&rsquo;INMeS, de l&rsquo;UAC ou des
          communiqués officiels du Ministère, l&rsquo;exactitude et l&rsquo;actualité de toute
          information avant d&rsquo;en tirer une décision définitive.
        </p>

        <h2>Pour aller plus loin</h2>
        <p>
          Cette page complète, sans les remplacer, les{' '}
          <Link href="/mentions-legales">Mentions légales</Link> (dont certaines informations
          d&rsquo;immatriculation restent en cours de finalisation) et les{' '}
          <Link href="/cgu-cgv">CGU / CGV</Link>. Pour toute question sur ce point, contactez{' '}
          <a href="mailto:educbenininfo@gmail.com">educbenininfo@gmail.com</a>.
        </p>
      </div>
    </div>
  );
}
