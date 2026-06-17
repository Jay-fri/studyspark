import { useState, useEffect } from 'react';

export type DeviceType = 'ios' | 'android' | 'desktop';

export function useDeviceDetect() {
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();

    if (/iphone|ipad|ipod/.test(ua)) {
      setDevice('ios');
    } else if (/android/.test(ua)) {
      setDevice('android');
    } else {
      setDevice('desktop');
    }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsPWAInstalled(standalone);
  }, []);

  return { device, isPWAInstalled };
}

export function useIsSafari() {
  const ua = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}
