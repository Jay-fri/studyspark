import { isNative } from '@/lib/capacitor';

// Dynamic imports so the web bundle never resolves @capacitor/local-notifications
// (the package only needs to exist in the native build environment).

export async function createNotificationChannels() {
  if (!isNative) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');

  await LocalNotifications.createChannel({
    id: 'studyai_default',
    name: 'StudyLM Updates',
    description: 'Payments, tokens, and account updates',
    importance: 4, // high — heads-up notification
    visibility: 1,
    lightColor: '#38E0C3',
    vibration: true,
  });

  await LocalNotifications.createChannel({
    id: 'studyai_reminders',
    name: 'Study Reminders',
    description: 'Streak and flashcard reminders',
    importance: 3, // default
    visibility: 1,
    lightColor: '#38E0C3',
    vibration: true,
  });
}

export async function requestLocalNotifPermission() {
  if (!isNative) return false;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const result = await LocalNotifications.requestPermissions();
  return result.display === 'granted';
}

// Schedules a recurring 7pm reminder. Safe to call every session —
// cancels any existing schedule before re-registering.
export async function scheduleStreakReminder() {
  if (!isNative) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');

  await LocalNotifications.cancel({ notifications: [{ id: 9001 }] });

  await LocalNotifications.schedule({
    notifications: [{
      id: 9001,
      title: "Don't lose your streak 🔥",
      body: "You haven't studied today — open StudyLM to keep it going",
      schedule: {
        on: { hour: 19, minute: 0 },
        every: 'day',
        allowWhileIdle: true,
      },
      smallIcon: 'ic_notification',
      iconColor: '#38E0C3',
      channelId: 'studyai_reminders',
    }],
  });
}

export async function scheduleFlashcardReminder(dueCount: number, hoursFromNow = 4) {
  if (!isNative || dueCount === 0) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');

  const fireDate = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);

  await LocalNotifications.schedule({
    notifications: [{
      id: 9002,
      title: `${dueCount} flashcards due`,
      body: 'Keep your memory sharp — review takes just a few minutes',
      schedule: { at: fireDate },
      smallIcon: 'ic_notification',
      iconColor: '#38E0C3',
      channelId: 'studyai_reminders',
    }],
  });
}

export async function cancelAllLocalReminders() {
  if (!isNative) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  await LocalNotifications.cancel({ notifications: [{ id: 9001 }, { id: 9002 }] });
}
