import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  icon: Icon,
  chip = '',
  caption,
  featured = false,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  /** icon-chip colour modifier: '', 'gold', 'success', 'danger', 'warning', 'violet' */
  chip?: string;
  caption?: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div className={`stat-card${featured ? ' featured' : ''}`}>
      <div className="top">
        <span className="lbl">{label}</span>
        <span className={`icon-chip ${chip}`}>
          <Icon />
        </span>
      </div>
      <div className="val">{value}</div>
      {caption && <div className="cap">{caption}</div>}
    </div>
  );
}
