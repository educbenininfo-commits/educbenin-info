// Page Contact — WhatsApp, e-mail et formulaire. Les coordonnées viennent du
// back-office "Contact & messages" (force-dynamic : une mise à jour y est
// visible ici sans redéploiement).
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { PublicNav } from '@/components/public/PublicNav';
import { PublicBottomNav } from '@/components/public/PublicBottomNav';
import { PublicFooter } from '@/components/public/PublicFooter';
import { ContactForm } from '@/components/public/ContactForm';
import { MailIcon, WhatsappIcon } from '@/components/public/ContactIcons';
import { getContactSettings } from '@/lib/server/site-settings';
import { formatWhatsapp, whatsappLink } from '@/lib/contact-display';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    "Contactez l'équipe Educ Bénin par WhatsApp, par e-mail ou via le formulaire de contact.",
  alternates: { canonical: '/contact' },
};

export default async function ContactPage() {
  const contact = await getContactSettings();

  return (
    <div className="prod">
      <PublicNav active="contact" />
      <PublicBottomNav active="contact" />

      <div className="page-head pw">
        <div className="k">Contact</div>
        <h1>Une question ? Parlons-en.</h1>
        <p>
          Écrivez-nous sur WhatsApp pour une réponse rapide, par e-mail, ou via le formulaire
          ci-dessous.
        </p>
      </div>

      <div className="section pw">
        <div className="two-col" style={{ alignItems: 'start' }}>
          <div className="contact-channels">
            <a
              className="contact-channel wa"
              href={whatsappLink(contact.whatsapp, 'Bonjour Educ Bénin, ')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="ic">
                <WhatsappIcon />
              </span>
              <span className="txt">
                <span className="lbl">Écrire sur WhatsApp</span>
                <span className="val">{formatWhatsapp(contact.whatsapp)}</span>
              </span>
              <span className="go" aria-hidden="true">
                →
              </span>
            </a>
            <a className="contact-channel mail" href={`mailto:${contact.email}`}>
              <span className="ic">
                <MailIcon />
              </span>
              <span className="txt">
                <span className="lbl">Envoyer un e-mail</span>
                <span className="val">{contact.email}</span>
              </span>
              <span className="go" aria-hidden="true">
                →
              </span>
            </a>
            <p className="hint" style={{ marginTop: 4 }}>
              Educ Bénin est un service d&rsquo;accompagnement indépendant, sans affiliation avec la
              FSS, l&rsquo;INMeS ou l&rsquo;UAC.
            </p>
          </div>
          <ContactForm />
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
