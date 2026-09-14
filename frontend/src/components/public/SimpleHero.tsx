// "Hero simplifié, sans les boutons d'action" — reuses the home page's
// hero typography (eyebrow/h1/lead) but single-column: no hero-art side
// visual, no hero-actions buttons. Used by the École — FSS/INMeS pages.
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
    <div className="hero pw" style={{ gridTemplateColumns: '1fr', gridTemplateAreas: "'text'" }}>
      <div className="hero-text" style={{ gridArea: 'text' }}>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
      </div>
    </div>
  );
}
