import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { isNative } from '@/lib/capacitor';
import { APP_VERSION } from '@/lib/constants';

interface UpdateInfo {
  available: boolean;
  version: string;
  apkUrl: string;
  releaseNotes: string;
  isMandatory: boolean;
}

export function useAppUpdate() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const checkForUpdate = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('app_releases')
        .select('*')
        .eq('platform', 'android')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!data) return;
      if (compareVersions(data.version, APP_VERSION) <= 0) return;

      const dismissed = localStorage.getItem('studylm_update_dismissed');
      if (!data.is_mandatory && dismissed === data.version) return;

      setUpdateInfo({
        available:    true,
        version:      data.version,
        apkUrl:       data.apk_url,
        releaseNotes: data.release_notes ?? '',
        isMandatory:  data.is_mandatory,
      });
    } catch {
      // Non-critical — update check failures are silent
    }
  }, []);

  useEffect(() => {
    if (!isNative) return;

    // Check on mount
    checkForUpdate();

    // Re-check every time the app comes back from background.
    // The Capacitor listener in capacitor.ts dispatches 'app-resumed'.
    window.addEventListener('app-resumed', checkForUpdate);
    return () => window.removeEventListener('app-resumed', checkForUpdate);
  }, [checkForUpdate]);

  const dismissUpdate = () => {
    if (updateInfo && !updateInfo.isMandatory) {
      localStorage.setItem('studylm_update_dismissed', updateInfo.version);
    }
    setUpdateInfo(null);
  };

  return { updateInfo, dismissUpdate };
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}
