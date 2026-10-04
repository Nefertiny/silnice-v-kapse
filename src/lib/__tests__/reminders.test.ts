import { cancelCarReminders, notificationsSupported, scheduleCarReminders, setupNotifications } from '../reminders';

// Expo Go na Androidu: import expo-notifications appku shodí, takže se nesmí vůbec načíst.
// jest.mock se vykoná před importem výše.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'storeClient' },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));
jest.mock('expo-notifications', () => {
  throw new Error('expo-notifications se v Expo Go na Androidu nesmí načíst');
});
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

describe('reminders in Expo Go on Android', () => {
  it('skips notifications without loading the module', async () => {
    expect(notificationsSupported).toBe(false);
    await expect(setupNotifications()).resolves.toBeUndefined();
    await expect(cancelCarReminders('car_1')).resolves.toBeUndefined();
    await expect(scheduleCarReminders({ id: 'car_1', spz: '4H7 2318', type: 'osobni', stkUntil: '2030-01-01' })).resolves.toBe(0);
  });
});
