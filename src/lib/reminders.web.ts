import type { Commute } from './commute';
import type { Car } from './types';

// V prohlížeči upozornění neplánujeme, funguje to jen v telefonu.
export const notificationsSupported = false;

export async function setupNotifications(): Promise<void> {}

export async function cancelCarReminders(_carId: string): Promise<void> {}

export async function scheduleCarReminders(_car: Car): Promise<number> {
  return 0;
}

export async function scheduleCommuteReminders(_commute: Commute | null): Promise<number> {
  return 0;
}
