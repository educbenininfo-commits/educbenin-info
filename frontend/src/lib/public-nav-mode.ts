// Public site mobile menu placement — chosen site-wide in the back-office
// (Paramètres › Menu du site public, SiteSettings.publicNavMode) and applied
// to every visitor under 760px:
//   'bottom'    floating bottom bar with a "Menu" sheet (default)
//   'top-left'  ☰ button at the left of the header, drawer from the left
//   'top-right' ☰ button at the right of the header, drawer from the right
// Public pages are statically prerendered, so the mode is fetched client-
// side (GET /api/site-settings) and mirrored to localStorage; an inline
// script in the root layout applies the last known value as
// <html data-pnav="…"> before first paint, so returning visitors never see
// the wrong menu flash.

export type PublicNavMode = 'bottom' | 'top-left' | 'top-right';

export const PUBLIC_NAV_MODES: PublicNavMode[] = ['bottom', 'top-left', 'top-right'];
export const PUBLIC_NAV_STORAGE_KEY = 'eb-pnav';
/** Fired on window to open the public menu (bottom sheet or side drawer). */
export const OPEN_PUBLIC_MENU_EVENT = 'eb-open-public-menu';

export function isPublicNavMode(v: unknown): v is PublicNavMode {
  return typeof v === 'string' && (PUBLIC_NAV_MODES as string[]).includes(v);
}

export function applyPublicNavMode(mode: PublicNavMode): void {
  document.documentElement.dataset.pnav = mode;
  try {
    localStorage.setItem(PUBLIC_NAV_STORAGE_KEY, mode);
  } catch {
    /* storage blocked — the attribute still applies for this page view */
  }
}

/** Inline, pre-hydration: re-applies the last known mode (see root layout). */
export const PUBLIC_NAV_INIT_SCRIPT = `try{var m=localStorage.getItem('${PUBLIC_NAV_STORAGE_KEY}');if(m==='top-left'||m==='top-right')document.documentElement.dataset.pnav=m;}catch(e){}`;
