'use client';

// Enables Web Push notifications for admins — but ONLY once they've
// actually installed the app (display-mode: standalone). Registers the
// service worker (required for the Push API to exist at all) as soon as
// the app opens, then shows a floating "Activer les notifications" button
// whenever permission hasn't been decided yet.
//
// The permission request is deliberately NOT fired automatically on mount:
// iOS Safari (and, increasingly, other browsers) silently ignores
// Notification.requestPermission() calls that aren't the direct result of
// a user gesture — call it inside a useEffect and the native prompt simply
// never appears, permission stays 'default' forever, and this device never
// gets subscribed. Gating the call behind this button's onClick guarantees
// a real tap-driven gesture every time, on every platform.
import { useEffect, useState } from 'react';
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

async function subscribeAndSend(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<void> {
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
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
}

export function PushSetup() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isStandalone()) return;
    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      return;
    }
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) return;

    void (async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        setRegistration(reg);
        setVapidKey(key);

        if (Notification.permission === 'granted') {
          await subscribeAndSend(reg, key);
        } else if (Notification.permission === 'default') {
          setNeedsPermission(true);
        }
        // 'denied' — nothing left to do from JS; re-enabling requires the
        // user to change the site's notification permission in their
        // browser/OS settings directly.
      } catch {
        // Best-effort — a failed setup just means this device won't get
        // push notifications; it must never break the back-office itself.
      }
    })();
  }, []);

  async function handleEnable() {
    if (!registration || !vapidKey || busy) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await subscribeAndSend(registration, vapidKey);
      }
    } catch {
      // Best-effort, see above.
    } finally {
      setNeedsPermission(false);
      setBusy(false);
    }
  }

  if (!needsPermission) return null;

  return (
    <div className="pwa-fab">
      <button
        type="button"
        className="pwa-fab-btn"
        onClick={() => void handleEnable()}
        disabled={busy}
      >
        🔔 Activer les notifications
      </button>
    </div>
  );
}
