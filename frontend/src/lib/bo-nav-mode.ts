'use client';

// Back-office mobile navigation style, chosen in Paramètres > Affichage and
// remembered per device (a phone and a laptop can legitimately differ):
//   - 'bottom': floating bottom bar + "Menu" sheet (default)
//   - 'side':   hamburger in the top bar opening the sidebar as a drawer
// Only affects narrow screens — on desktop the sidebar is always shown.
import { useEffect, useState } from 'react';

export type BoNavMode = 'bottom' | 'side';

const STORAGE_KEY = 'bo-mobile-nav';
const EVENT = 'bo-nav-mode-change';

function read(): BoNavMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'side' ? 'side' : 'bottom';
  } catch {
    return 'bottom';
  }
}

export function setBoNavMode(mode: BoNavMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Private mode / storage disabled — the choice just won't persist.
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useBoNavMode(): BoNavMode {
  const [mode, setMode] = useState<BoNavMode>('bottom');
  useEffect(() => {
    setMode(read());
    const sync = () => setMode(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return mode;
}
