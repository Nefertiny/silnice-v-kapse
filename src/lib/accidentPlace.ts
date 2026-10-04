import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { AccidentPlace } from './accident';

export class PlaceError extends Error {
  constructor(public code: 'denied' | 'unavailable') {
    super(code);
  }
}

/** Z adresy od systému poskládá „Ulice 12, Město“. */
export function addressText(a: Partial<Location.LocationGeocodedAddress>): string | undefined {
  const street = [a.street, a.streetNumber].filter(Boolean).join(' ') || a.name || undefined;
  const city = a.city || a.district || a.subregion || undefined;
  const parts = [street, city].filter((p, i, all): p is string => !!p && all.indexOf(p) === i);
  return parts.length ? parts.join(', ') : a.formattedAddress || undefined;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

/** Zjistí, kde klient stojí, a když to jde, i adresu. */
export async function locateHere(): Promise<AccidentPlace> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new PlaceError('denied');
  let position: Location.LocationObject | null = null;
  try {
    position = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), 20000);
  } catch {
    if (Platform.OS !== 'web') position = await Location.getLastKnownPositionAsync().catch(() => null);
  }
  if (!position) throw new PlaceError('unavailable');
  const { latitude: lat, longitude: lon } = position.coords;
  let address: string | undefined;
  if (Platform.OS !== 'web') {
    try {
      const [found] = await withTimeout(Location.reverseGeocodeAsync({ latitude: lat, longitude: lon }), 10000);
      address = found ? addressText(found) : undefined;
    } catch {
      // Bez adresy stačí souřadnice.
    }
  }
  return { lat, lon, address };
}

export function placeErrorText(e: unknown): string {
  return e instanceof PlaceError && e.code === 'denied'
    ? 'Appka nemá povolenou polohu. Povolte ji v nastavení telefonu, nebo místo napište.'
    : 'Polohu se nepodařilo zjistit. Napište místo ručně.';
}
