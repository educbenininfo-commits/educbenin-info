// Hero for the École pages (FSS, INMeS): text column plus, when given, a
// side illustration (HeroPanel). Same typography as the home page hero.
export function SimpleHero({
  eyebrow,
  title,
  lead,
  visual,
}: {
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  visual?: React.ReactNode;
}) {
  return (
    <div className="hero-bleed">
      <div className={`hero simple pw${visual ? ' has-visual' : ''}`}>
        <div className="hero-text">
          <span className="eyebrow-chip">
            <span className="dot" />
            {eyebrow}
          </span>
          <h1>{title}</h1>
          <p className="lead">{lead}</p>
        </div>
        {visual}
      </div>
    </div>
  );
}
