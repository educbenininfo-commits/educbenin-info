'use client';

// Polls GET /api/admin/analytics/live every 20 s while the tab is visible
// (and once more when it becomes visible again). Shared by the Statistiques
// screen and the dashboard's live-visitors pill.
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { LiveVisitorsResponse } from '@/lib/analytics';

const LIVE_POLL_MS = 20_000;

export function useLiveVisitors(): LiveVisitorsResponse | null {
  const [live, setLive] = useState<LiveVisitorsResponse | null>(null);
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (document.visibilityState === 'hidden') return;
      api<LiveVisitorsResponse>('/api/admin/analytics/live')
        .then((r) => {
          if (!cancelled) setLive(r);
        })
        .catch(() => {});
    };
    tick();
    const id = window.setInterval(tick, LIVE_POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return live;
}
