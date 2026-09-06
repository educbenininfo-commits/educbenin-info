'use client';

// Enables Web Push notifications for admins — but ONLY once they've
// actually installed the app (display-mode: standalone). A push prompt on
// a plain browser tab that gets closed the moment the tab does would be
// pointless; the whole point is a notification landing on a device where
// the app persists. Registers the service worker (required for the Push
// API to exist at all), requests permission once, and stores the
// resulting subscription server-side (api/admin/push/subscribe) so
// notifyAdmins() can reach this device the next time a dossier/auth-form
// comes in.
import { useEffect } from 'react';
import { api } from '@/lib/api';

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// Web Push wants the VAPID public key as a Uint8Array, but it's issued
// (and stored in env) as a URL-safe base64 string.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function PushSetup() {
  useEffect(() => {
    if (!isStandalone()) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) return;

    void (async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;
          }
          if (Notification.permission !== 'granted') return;
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });
        }

        const json = subscription.toJSON();
        if (!json.endpoint || !json.keys) return;
        await api('/api/admin/push/subscribe', {
          method: 'POST',
          body: { endpoint: json.endpoint, keys: json.keys },
        });
      } catch {
        // Best-effort — a failed subscribe just means this device won't get
        // push notifications; it must never break the back-office itself.
      }
    })();
  }, []);

  return null;
}
