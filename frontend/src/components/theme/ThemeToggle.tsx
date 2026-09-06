'use client';

// Light/Dark/System theme switch. "Système" (default — nothing stored) has
// no [data-theme] attribute at all, so globals.css's
// `@media (prefers-color-scheme: dark)` block alone decides the look and
// reacts live to an OS-level change with no JS involved. An explicit
// Clair/Sombre choice sets [data-theme] on <html> and is persisted so it
// survives reloads; layout.tsx's inline script applies it before first
// paint to avoid a flash of the wrong theme.
import { useEffect, useState } from 'react';
import { THEME_STORAGE_KEY } from '@/lib/theme';

type ThemeChoice = 'system' | 'light' | 'dark';

function applyTheme(choice: ThemeChoice): void {
  if (choice === 'system') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem(THEME_STORAGE_KEY);
  } else {
    document.documentElement.setAttribute('data-theme', choice);
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  }
}

export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    setChoice(stored === 'light' || stored === 'dark' ? stored : 'system');
    setReady(true);
  }, []);

  if (!ready) return null;

  function choose(next: ThemeChoice) {
    setChoice(next);
    applyTheme(next);
  }

  return (
    <div className="theme-toggle" role="group" aria-label="Thème d'affichage">
      <button
        type="button"
        className={choice === 'system' ? 'on' : ''}
        title="Système"
        aria-label="Système"
        onClick={() => choose('system')}
      >
        🖥
      </button>
      <button
        type="button"
        className={choice === 'light' ? 'on' : ''}
        title="Clair"
        aria-label="Clair"
        onClick={() => choose('light')}
      >
        ☀
      </button>
      <button
        type="button"
        className={choice === 'dark' ? 'on' : ''}
        title="Sombre"
        aria-label="Sombre"
        onClick={() => choose('dark')}
      >
        ☾
      </button>
    </div>
  );
}
