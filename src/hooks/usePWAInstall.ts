import { useState, useEffect, useRef } from "react";

const DISMISS_KEY = "studylm-pwa-dismissed-at";
const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000;

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
  // Ref so timer callbacks always see the latest deferred prompt value
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (platform.isStandalone) return;

    const dismissedAt = parseInt(localStorage.getItem(DISMISS_KEY) ?? "0", 10);
    if (Date.now() - dismissedAt < DISMISS_TTL) return;

    const show = () => setShowBanner(true);

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      deferredPromptRef.current = evt;
      setDeferredPrompt(evt);
      // Show banner as soon as the browser signals the app is installable
      setTimeout(show, 1500);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);

    // iOS never fires beforeinstallprompt — show the manual instructions after a delay
    const iosTimer = platform.isIOS ? setTimeout(show, 8_000) : null;

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      if (iosTimer) clearTimeout(iosTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const install = async () => {
    const prompt = deferredPromptRef.current ?? deferredPrompt;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setShowBanner(false);
    deferredPromptRef.current = null;
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
