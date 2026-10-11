'use client';

// Registers /sw.js for every visitor (production only — in `next dev` a
// caching worker would fight hot reload). The worker makes the installed
// app open instantly from the device; see public/sw.js.
import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* unsupported or blocked — the site simply works without it */
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
