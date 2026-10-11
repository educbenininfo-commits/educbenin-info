'use client';

// Sends one first-party page-view beacon per public route change to
// POST /api/track. Back-office and auth routes are skipped. The visitor id
// lives in localStorage (returning visitor), the session id in
// sessionStorage (one tab session = one visit); the external referrer and
// utm_source are sent only on the first view of a session, so internal
// navigation never re-attributes a visit. Silently does nothing when storage
// is unavailable (private mode) or the request fails.
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isTrackablePath } from '@/lib/analytics';

function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function stored(storage: Storage, key: string): { id: string; fresh: boolean } {
  const existing = storage.getItem(key);
  if (existing) return { id: existing, fresh: false };
  const id = randomId();
  storage.setItem(key, id);
  return { id, fresh: true };
}

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !isTrackablePath(pathname)) return;
    try {
      const visitor = stored(window.localStorage, 'eb-vid');
      const session = stored(window.sessionStorage, 'eb-sid');
      const body: Record<string, string> = {
        visitorId: visitor.id,
        sessionId: session.id,
        path: pathname,
      };
      if (session.fresh) {
        if (document.referrer) body.referrer = document.referrer;
        const utm = new URLSearchParams(window.location.search).get('utm_source');
        if (utm) body.utmSource = utm;
      }
      const payload = JSON.stringify(body);
      if (!navigator.sendBeacon?.('/api/track', payload)) {
        void fetch('/api/track', { method: 'POST', body: payload, keepalive: true }).catch(
          () => {},
        );
      }
    } catch {
      /* storage blocked or beacon failed — statistics are best-effort */
    }
  }, [pathname]);

  return null;
}
