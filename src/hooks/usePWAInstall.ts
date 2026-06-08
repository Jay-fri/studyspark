import { useState, useEffect } from "react";

const DISMISS_KEY  = "studylm-pwa-dismissed-at";
const VISIT_KEY    = "studylm-pwa-visits";
const DISMISS_TTL  = 7 * 24 * 60 * 60 * 1000;
const PROMPT_DELAY = 30_000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform() {
  const ua = navigator.userAgent;
  const isIOS     = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isSafari  = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS/i.test(ua);
  const isChrome  = /CriOS|Chrome/i.test(ua) && !/Edge|Edg\//i.test(ua);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Record<string, unknown>).standalone === true);
  return { isIOS, isAndroid, isSafari, isChrome, isStandalone };
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner]         = useState(false);
  const [platform]                          = useState(() => detectPlatform());

  useEffect(() => {
    if (platform.isStandalone) return;

    const visits      = parseInt(localStorage.getItem(VISIT_KEY) ?? "0", 10) + 1;
    localStorage.setItem(VISIT_KEY, String(visits));

    const dismissedAt = parseInt(localStorage.getItem(DISMISS_KEY) ?? "0", 10);
    if (Date.now() - dismissedAt < DISMISS_TTL) return;

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);

    const show = () => setShowBanner(true);
    const delay = visits >= 2 ? 2_000 : PROMPT_DELAY;
    // On iOS we show even without deferredPrompt (no native event fires)
    const timer = setTimeout(() => {
      if (platform.isIOS || deferredPrompt) show();
      else window.addEventListener("beforeinstallprompt", () => show(), { once: true });
    }, delay);

    // Fallback: show on iOS after delay regardless
    const iosTimer = platform.isIOS ? setTimeout(show, delay) : null;

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      clearTimeout(timer);
      if (iosTimer) clearTimeout(iosTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowBanner(false);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShowBanner(false);
  };

  return {
    showBanner: showBanner && !platform.isStandalone,
    install,
    dismiss,
    canInstall: !!deferredPrompt,
    isIOS:      platform.isIOS,
    isAndroid:  platform.isAndroid,
    isSafari:   platform.isSafari,
  };
}
