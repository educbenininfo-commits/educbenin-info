// Site-wide maintenance interstitial — rewritten in front of every public
// page by middleware.ts when a SUPERADMIN has enabled "mode maintenance"
// from the Tableau de bord (GET/POST /api/admin/maintenance). Not linked
// from anywhere; the URL bar keeps showing the page the visitor requested.
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { EducBeninLogo } from '@/components/theme/EducBeninLogo';
import { MailIcon, WhatsappIcon } from '@/components/public/ContactIcons';
import { getContactSettings } from '@/lib/server/site-settings';
import { formatWhatsapp, whatsappLink } from '@/lib/contact-display';

export const metadata: Metadata = {
  title: 'Maintenance en cours',
  robots: { index: false, follow: false },
};

export default async function MaintenancePage() {
  const contact = await getContactSettings();
  return (
    <main className="maint-page">
      <div className="maint-card">
        <EducBeninLogo height={30} />
        <div className="maint-badge">Maintenance en cours</div>
        <h1>Nous améliorons Educ Bénin.</h1>
        <p>
          Le site est momentanément indisponible le temps d&rsquo;une mise à jour. Nous serons de
          retour très bientôt — merci de votre patience.
        </p>
        <p className="maint-sub">
          Un dossier en cours de traitement n&rsquo;est pas affecté : votre demande continue
          d&rsquo;être suivie par notre équipe.
        </p>

        <div className="maint-contact">
          <a className="maint-contact-item" href={`mailto:${contact.email}`}>
            <MailIcon />
            {contact.email}
          </a>
          <a
            className="maint-contact-item"
            href={whatsappLink(contact.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsappIcon />
            {formatWhatsapp(contact.whatsapp)}
          </a>
        </div>
      </div>
    </main>
  );
}
