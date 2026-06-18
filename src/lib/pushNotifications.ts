import { isNative } from '@/lib/capacitor';
import { supabase } from '@/services/supabase';

export type NativePushPermission = 'granted' | 'denied' | 'prompt';

export async function getNativePushStatus(): Promise<NativePushPermission> {
  if (!isNative) return 'denied';
  const { PushNotifications } = await import('@capacitor/push-notifications');
  const status = await PushNotifications.checkPermissions();
  return status.receive as NativePushPermission;
}

export async function unregisterPush(userId: string) {
  if (!isNative) return;
  await supabase.from('device_tokens').delete().eq('user_id', userId);
}

// Dynamic imports so the web bundle never resolves @capacitor/push-notifications
// (the package only needs to exist in the native build environment).

export async function registerPush(userId: string) {
  if (!isNative) return;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  const permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    const result = await PushNotifications.requestPermissions();
    if (result.receive !== 'granted') return;
  } else if (permStatus.receive !== 'granted') {
    return;
  }

  await PushNotifications.register();

  PushNotifications.addListener('registration', async (token) => {
    await supabase.from('device_tokens').upsert(
      { user_id: userId, push_token: token.value, platform: 'android' },
      { onConflict: 'user_id,push_token' }
    );
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('Push registration failed:', err);
  });

  // Notification arrived while foregrounded — surface as an in-app event
  // so the dropdown can refresh without waiting for the next realtime tick.
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    window.dispatchEvent(
      new CustomEvent('native-notification-received', { detail: notification })
    );
  });

  // User tapped from system tray — navigate to the linked route.
  // Works from foreground, background, AND cold start (Capacitor buffers the action).
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const route = action.notification.data?.route;
    if (route) window.location.href = route;
  });
}
