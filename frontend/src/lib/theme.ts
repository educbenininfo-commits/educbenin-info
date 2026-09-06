// Plain constant, deliberately NOT in a 'use client' file: a Server
// Component (layout.tsx) importing a named export from a 'use client'
// module gets `undefined` for anything but the component itself — RSC only
// forwards the client reference, not arbitrary constants. Shared here so
// both the server-rendered blocking theme script and ThemeToggle.tsx (the
// client component that reads/writes it) use the exact same key.
export const THEME_STORAGE_KEY = 'eb-theme';
