// Device-side copy of the last back-office data seen (dashboard figures,
// dossier lists, the logged-in admin's identity…) so the installed app can
// paint instantly on launch — like WhatsApp showing its last messages —
// and then refresh from the network. Stored in localStorage under one
// prefix and wiped on logout (AuthContext) or when the session is refused
// (AdminLayoutClient), so nothing outlives the admin's session on the
// device. Every access is wrapped: private mode / blocked storage simply
// means no instant paint, never an error.

const PREFIX = 'eb-offline:';
/** Skip oversized payloads rather than fill the ~5 MB localStorage quota. */
const MAX_BYTES = 400_000;

export function readOffline<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeOffline(key: string, data: unknown): void {
  try {
    const raw = JSON.stringify(data);
    if (raw.length > MAX_BYTES) return;
    localStorage.setItem(PREFIX + key, raw);
  } catch {
    /* quota exceeded or storage blocked */
  }
}

export function clearOffline(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) localStorage.removeItem(k);
    }
  } catch {
    /* storage blocked */
  }
}

/** Only back-office API reads are kept on the device. */
export function isOfflineCacheable(path: string): boolean {
  return path.startsWith('/api/admin/') || path.startsWith('/api/notifications/');
}
