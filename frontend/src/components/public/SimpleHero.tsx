// Single-column hero (no side visual, no action buttons) — École FSS/INMeS
// pages. Same typography as the home page hero.
export function SimpleHero({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
}) {
  return (
    <div className="hero-bleed">
      <div className="hero simple pw">
        <div className="hero-text">
          <span className="eyebrow-chip">
            <span className="dot" />
            {eyebrow}
          </span>
          <h1>{title}</h1>
          <p className="lead">{lead}</p>
        </div>
      </div>
    </div>
  );
}
