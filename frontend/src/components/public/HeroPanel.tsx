// Side illustration for public page heroes (École pages, Établissements,
// Accompagnement, Contact, Suivi): a stylised card with a header and a list
// of rows (optionally as a step tracker or a chat), plus up to two small
// floating cards. Pure markup + CSS (no images), themed by the --prod-*
// tokens so it follows light/dark mode. Decorative: hidden from assistive
// tech, since the same information is in the page body.
import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';

export interface HeroPanelRow {
  label: string;
  sub?: string;
  icon?: LucideIcon;
  /** Step-tracker state (variant "steps"). */
  state?: 'done' | 'now' | 'next';
  /** Chat bubble side (variant "chat"). */
  from?: 'them' | 'us';
}

export interface HeroPanelFloat {
  icon: LucideIcon;
  title: string;
  sub: string;
  tone?: 'primary' | 'success' | 'gold';
}

export function HeroPanel({
  icon: Icon,
  title,
  subtitle,
  rows,
  variant = 'list',
  floats = [],
  hideOnMobile = true,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  rows: HeroPanelRow[];
  variant?: 'list' | 'steps' | 'chat';
  floats?: HeroPanelFloat[];
  /**
   * Hidden under 760px by default: on a phone the illustration stacks under
   * the hero text and reads as real content (confusing). The homepage has
   * its own hero visual and doesn't use this component.
   */
  hideOnMobile?: boolean;
}) {
  return (
    <div className={`hp${hideOnMobile ? ' hide-mobile' : ''}`} aria-hidden="true">
      <div className="hp-card">
        <div className="hp-head">
          <span className="hp-icon">
            <Icon size={20} />
          </span>
          <span>
            <strong>{title}</strong>
            <small>{subtitle}</small>
          </span>
        </div>
        <div className={`hp-rows ${variant}`}>
          {rows.map((r, i) => {
            if (variant === 'chat') {
              return (
                <div key={i} className={`hp-bubble ${r.from ?? 'them'}`}>
                  {r.label}
                  {r.sub && <small>{r.sub}</small>}
                </div>
              );
            }
            const RowIcon = r.icon;
            return (
              <div key={i} className={`hp-row${r.state ? ` ${r.state}` : ''}`}>
                <span className="hp-dot">
                  {variant === 'steps' ? (
                    r.state === 'done' ? (
                      <Check size={13} strokeWidth={3} />
                    ) : (
                      i + 1
                    )
                  ) : RowIcon ? (
                    <RowIcon size={16} />
                  ) : (
                    <Check size={14} strokeWidth={2.6} />
                  )}
                </span>
                <span className="hp-txt">
                  <strong>{r.label}</strong>
                  {r.sub && <small>{r.sub}</small>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {floats.slice(0, 2).map((f, i) => {
        const FIcon = f.icon;
        return (
          <div key={i} className={`hp-float f${i + 1}`}>
            <span className={`hp-float-ic ${f.tone ?? 'primary'}`}>
              <FIcon size={16} />
            </span>
            <span>
              <strong>{f.title}</strong>
              <small>{f.sub}</small>
            </span>
          </div>
        );
      })}
    </div>
  );
}
