import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';
import { Platform } from 'react-native';

import { reminderMinute, type Commute } from './commute';
import { carDeadlines, parseIsoDate } from './dates';
import type { Car } from './types';

const CHANNEL = 'terminy';
/** Kolik dní předem upozornit. */
const OFFSETS = [30, 7, 1];
const HOUR = 9;

/**
 * Expo Go na Androidu upozornění nepodporuje a už samotný import expo-notifications tam appku shodí.
 * Proto modul načítáme až při použití a v Expo Go na Androidu upozornění vynecháme.
 * Ve skutečné appce (development build i verze z obchodu) fungují normálně.
 */
export const notificationsSupported = !(
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient
);

let loaded: typeof NotificationsModule | undefined;
function notifications(): typeof NotificationsModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  loaded ??= require('expo-notifications') as typeof NotificationsModule;
  return loaded;
}

export async function setupNotifications(): Promise<void> {
  if (!notificationsSupported) return;
  const Notifications = notifications();
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
  const Notifications = notifications();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function cancelCarReminders(carId: string): Promise<void> {
  if (!notificationsSupported) return;
  const Notifications = notifications();
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
  if (!notificationsSupported) return 0;
  const Notifications = notifications();
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

const COMMUTE_PREFIX = 'commute:';
/** Pondělí až pátek; expo-notifications čísluje dny od neděle = 1. */
const WORKDAYS = [2, 3, 4, 5, 6];

/** Ve všední dny ráno připomene, ať se podívá, kolik dnes pojede do práce. Null připomínky zruší. */
export async function scheduleCommuteReminders(commute: Commute | null): Promise<number> {
  if (!notificationsSupported) return 0;
  const Notifications = notifications();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((n) => n.identifier.startsWith(COMMUTE_PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!commute?.remind || !(await ensurePermission())) return 0;
  const at = reminderMinute(commute);
  for (const weekday of WORKDAYS) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${COMMUTE_PREFIX}${weekday}`,
      content: { title: 'Cesta do práce', body: 'Za chvíli vyrážíte. Podívejte se, kolik dnes pojedete a kdy vyrazit.' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour: Math.floor(at / 60),
        minute: at % 60,
        channelId: CHANNEL,
      },
    });
  }
  return WORKDAYS.length;
}
