'use client';

import { Menu } from 'lucide-react';
import { OPEN_PUBLIC_MENU_EVENT } from '@/lib/public-nav-mode';

// ☰ button in the public header — rendered on both sides of the nav row;
// CSS shows only the one matching <html data-pnav="top-left|top-right">
// under 760px. Opens the menu owned by PublicBottomNav.
export function PublicMenuButton({ side }: { side: 'left' | 'right' }) {
  return (
    <button
      type="button"
      className={`p-menu-btn ${side}`}
      aria-label="Ouvrir le menu"
      onClick={() => window.dispatchEvent(new Event(OPEN_PUBLIC_MENU_EVENT))}
    >
      <Menu size={20} />
    </button>
  );
}
