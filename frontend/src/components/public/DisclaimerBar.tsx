import Link from 'next/link';
import { ecoleElidedArticle } from '@/lib/ecole-display';

// Top disclaimer strip — same markup as the original home page, now
// parameterized: a school-specific page names that school ("ni à la FSS ni
// à l'UAC"), other pages stay generic ("aucun établissement de l'UAC").
export function DisclaimerBar({ ecoleNom }: { ecoleNom?: string }) {
  return (
    <div className="disclaimer-bar-bleed">
      <div className="disclaimer-bar pw">
        ⓘ&nbsp; Educ Bénin est un service d&rsquo;accompagnement indépendant — il ne se substitue{' '}
        {ecoleNom ? (
          <>ni à {ecoleElidedArticle(ecoleNom)} ni à l&rsquo;UAC.</>
        ) : (
          <>à aucun établissement de l&rsquo;UAC.</>
        )}
        <Link href="/non-affiliation">En savoir plus</Link>
      </div>
    </div>
  );
}
