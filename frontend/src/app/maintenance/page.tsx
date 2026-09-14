// Site-wide maintenance interstitial — rewritten in front of every public
// page by middleware.ts when a SUPERADMIN has enabled "mode maintenance"
// from the Tableau de bord (GET/POST /api/admin/maintenance). Not linked
// from anywhere; the URL bar keeps showing the page the visitor requested.
import type { Metadata } from 'next';
import { EducBeninLogo } from '@/components/theme/EducBeninLogo';

export const metadata: Metadata = {
  title: 'Maintenance en cours',
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
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
          <a className="maint-contact-item" href="mailto:educbenininfo@gmail.com">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M2.25 6.75c0-1.036.84-1.875 1.875-1.875h15.75c1.035 0 1.875.84 1.875 1.875v10.5c0 1.035-.84 1.875-1.875 1.875H4.125A1.875 1.875 0 0 1 2.25 17.25V6.75Zm1.875-.375a.375.375 0 0 0-.375.375v.53l8.25 5.15 8.25-5.15v-.53a.375.375 0 0 0-.375-.375H4.125Zm16.125 2.247-7.777 4.86a.75.75 0 0 1-.796 0L3.75 8.622v8.628c0 .207.168.375.375.375h15.75a.375.375 0 0 0 .375-.375V8.622Z"
              />
            </svg>
            educbenininfo@gmail.com
          </a>
          <a
            className="maint-contact-item"
            href="https://wa.me/22967249837"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12.001 2c-5.514 0-9.998 4.484-9.998 9.998 0 1.762.464 3.484 1.345 4.997l-1.44 5.263 5.386-1.415a9.99 9.99 0 0 0 4.707 1.152h.004c5.514 0 9.997-4.484 9.997-9.997 0-2.67-1.04-5.181-2.929-7.07A9.938 9.938 0 0 0 12.001 2zm.001 18.28h-.003a8.28 8.28 0 0 1-4.223-1.156l-.303-.18-3.14.825.837-3.06-.198-.314a8.267 8.267 0 0 1-1.267-4.4c0-4.573 3.72-8.293 8.298-8.293a8.243 8.243 0 0 1 5.867 2.43 8.242 8.242 0 0 1 2.43 5.868c0 4.573-3.72 8.28-8.298 8.28z" />
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            </svg>
            +229 67 24 98 37
          </a>
        </div>
      </div>
    </main>
  );
}
