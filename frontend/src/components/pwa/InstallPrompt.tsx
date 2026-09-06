'use client';

// Floating, dismissible "install this app" prompt — mounted once in the
// root layout so it's available across every screen. Matches the
// two-step instructional-card pattern the user referenced (Qatalink):
// icon, eyebrow, heading, two numbered device steps, one dismiss button.
//
// iOS Safari never fires `beforeinstallprompt` (no native install API), so
// it always gets the manual Share → Add to Home Screen instructions.
// Android/desktop Chromium fire `beforeinstallprompt`; we capture it and
// let the modal's primary button trigger the real native prompt instead of
// just closing. Everywhere else (desktop Safari/Firefox, no event fired)
// there is no install path at all, so the button stays hidden rather than
// promising something that can't work.

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'ios' | 'chromium' | 'none';

const DISMISS_KEY = 'eb-pwa-install-dismissed';

function detectIsIOS(): boolean {
  const ua = navigator.userAgent;
  const isClassic = /iPad|iPhone|iPod/.test(ua);
  const isModernIpad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return isClassic || isModernIpad;
}

function detectIsIPad(): boolean {
  const ua = navigator.userAgent;
  return /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function detectIsStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ready, setReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIPad, setIsIPad] = useState(false);

  useEffect(() => {
    setStandalone(detectIsStandalone());
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    setIsIOS(detectIsIOS());
    setIsIPad(detectIsIPad());
    setReady(true);

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onAppInstalled() {
      setStandalone(true);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const platform: Platform = isIOS ? 'ios' : deferredPrompt ? 'chromium' : 'none';
  const showButton = ready && !standalone && !dismissed && platform !== 'none';

  function dismissForGood() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
    setModalOpen(false);
  }

  async function handlePrimaryAction() {
    if (platform === 'chromium' && deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
    setModalOpen(false);
  }

  if (!showButton) return null;

  return (
    <>
      <div className="pwa-fab">
        <button type="button" className="pwa-fab-btn" onClick={() => setModalOpen(true)}>
          <img src="/logo/mark.svg" alt="" width={18} height={18} />
          Installer l&rsquo;app
        </button>
        <button
          type="button"
          className="pwa-fab-close"
          aria-label="Fermer cette suggestion"
          onClick={dismissForGood}
        >
          ×
        </button>
      </div>

      {modalOpen && (
        <div className="pwa-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="pwa-modal" onClick={(e) => e.stopPropagation()}>
            <img src="/logo/mark.svg" alt="" className="pwa-modal-icon" />
            <div className="pwa-modal-eyebrow">EDUC BÉNIN SUR VOTRE APPAREIL</div>
            <h3 className="pwa-modal-title">
              {platform === 'ios'
                ? `Ajouter Educ Bénin sur votre ${isIPad ? 'iPad' : 'iPhone'}`
                : 'Ajouter Educ Bénin sur votre appareil'}
            </h3>

            {platform === 'ios' ? (
              <ol className="pwa-modal-steps">
                <li>
                  <span className="pwa-step-icn">⬆️</span>
                  <span>
                    Ouvrez Educ Bénin dans Safari, touchez <strong>Partager</strong>.
                  </span>
                </li>
                <li>
                  <span className="pwa-step-icn">📲</span>
                  <span>
                    Choisissez <strong>Sur l&rsquo;écran d&rsquo;accueil</strong>, puis{' '}
                    <strong>Ajouter</strong>.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="pwa-modal-steps">
                <li>
                  <span className="pwa-step-icn">⬇️</span>
                  <span>
                    Touchez <strong>Installer</strong> ci-dessous.
                  </span>
                </li>
                <li>
                  <span className="pwa-step-icn">✅</span>
                  <span>Confirmez dans la fenêtre proposée par votre navigateur.</span>
                </li>
              </ol>
            )}

            <button
              type="button"
              className="btn btn-primary btn-block"
              style={{ marginTop: 4 }}
              onClick={() => void handlePrimaryAction()}
            >
              {platform === 'chromium' ? 'Installer' : 'J’ai compris'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
