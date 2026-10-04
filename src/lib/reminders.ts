import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { carDeadlines, parseIsoDate } from './dates';
import type { Car } from './types';

const CHANNEL = 'terminy';
/** Kolik dní předem upozornit. */
const OFFSETS = [30, 7, 1];
const HOUR = 9;

export async function setupNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Termíny auta',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function cancelCarReminders(carId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(`${carId}:`))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

function bodyFor(title: string, spz: string, offset: number): string {
  const when = offset === 1 ? 'zítra' : `za ${offset} dní`;
  return `${title} u ${spz} končí ${when}.`;
}

/** Naplánuje upozornění 30, 7 a 1 den před každým známým termínem. Vrací počet naplánovaných. */
export async function scheduleCarReminders(car: Car): Promise<number> {
  await cancelCarReminders(car.id);
  if (!(await ensurePermission())) return 0;

  const now = Date.now();
  let count = 0;
  for (const deadline of carDeadlines(car)) {
    if (!deadline.date) continue;
    for (const offset of OFFSETS) {
      const at = parseIsoDate(deadline.date);
      at.setDate(at.getDate() - offset);
      at.setHours(HOUR, 0, 0, 0);
      if (at.getTime() <= now) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${car.id}:${deadline.kind}:${offset}`,
        content: { title: 'Silnice v kapse', body: bodyFor(deadline.title, car.spz, offset) },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: at,
          channelId: CHANNEL,
        },
      });
      count++;
    }
  }
  return count;
}
