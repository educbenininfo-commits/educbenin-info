// "Comment ça marche" 5-step section — extracted from the original home
// page so it can be reused verbatim (03-ecole-fss.md: "les 5 étapes déjà
// existantes pour le D.E.S., inchangées, réutilisées telles quelles") on
// the École — FSS page instead of copy-pasted.

const STEPS: { n: string; title: string; desc: string }[] = [
  { n: '01', title: 'Dossier reçu', desc: 'Vous déposez votre demande et vos pièces en un clic.' },
  {
    n: '02',
    title: 'Authentification',
    desc: "Vous recevez et remplissez le formulaire d'authentification de diplôme.",
  },
  {
    n: '03',
    title: 'Inscription en ligne',
    desc: 'Vous vous inscrivez sur le portail CUO-SIGAN de l’UAC.',
  },
  {
    n: '04',
    title: 'Dépôt en cours',
    desc: 'Nous déposons votre dossier complet auprès de la FSS.',
  },
  {
    n: '05',
    title: 'Déposé avec succès',
    desc: 'Votre récépissé officiel est disponible au téléchargement.',
  },
];

export function HowItWorksSection({
  title = 'Comment ça marche',
  subtitle = 'Cinq étapes, du dépôt de votre demande jusqu’au récépissé officiel de la FSS.',
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="section-bleed">
      <div className="section pw">
        <h2>{title}</h2>
        <p className="sub">{subtitle}</p>
        <div className="steps-grid">
          {STEPS.map((step) => (
            <div key={step.n} className="step-card">
              <div className="n">{step.n}</div>
              <h5>{step.title}</h5>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
