'use client';

// Powers the small unread-count badge on the "Dossiers" nav item
// (BackofficeSidebar, BackofficeBottomNav) — counts Notification rows of
// type DOSSIER_CREATED/DOSSIER_AUTH_SUBMITTED that notifyAdmins() creates
// for every admin (lib/server/push/send.ts), regardless of whether that
// admin has push notifications set up.
//
// The sidebar/bottom-nav mount once per admin session and never remount on
// client-side navigation between /admin/* pages, so useApi's mount-only
// revalidation alone wouldn't catch a dossier that arrives while the admin
// is already in the back-office. This adds a light refresh on tab
// focus/visibility (covers "got a push notification, tapped it") plus a
// 60s fallback poll for long unattended sessions — cheap, since it's just
// a single indexed COUNT query.
import { useEffect } from 'react';
import { useApi, invalidateCache } from '@/lib/useApi';
import { api } from '@/lib/api';
import { DOSSIER_NOTIFICATION_TYPES } from '@/lib/notification-types';

const COUNT_PATH = `/api/notifications/count?types=${DOSSIER_NOTIFICATION_TYPES.join(',')}`;
const POLL_INTERVAL_MS = 60_000;

export function useDossiersUnreadCount(): number {
  const { data, refresh } = useApi<{ count: number }>(COUNT_PATH);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') void refresh();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const interval = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return data?.count ?? 0;
}

/** Call once when the admin actually opens Dossiers, to clear the badge. */
export function markDossiersNotificationsRead(): void {
  void api('/api/notifications', {
    method: 'PATCH',
    body: { ids: 'all', types: DOSSIER_NOTIFICATION_TYPES },
  })
    .then(() => invalidateCache(COUNT_PATH))
    .catch(() => {
      // Best-effort — worst case the badge stays visible a bit longer.
    });
}
