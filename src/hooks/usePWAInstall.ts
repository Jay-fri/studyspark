import { useState, useEffect, useRef } from "react";

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

    const show = () => setShowBanner(true);

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      deferredPromptRef.current = evt;
      setDeferredPrompt(evt);
      // Show banner immediately when browser signals app is installable
      show();
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);

    // For testing: show banner after short delay if not already installed
    const timer = setTimeout(show, 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      clearTimeout(timer);
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
