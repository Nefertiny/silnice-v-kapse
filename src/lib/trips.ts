// Odhad doby jízdy podle času odjezdu. Zatím jednoduchý model špiček;
// další verze ho nahradí historií provozu z dopravních dat ŘSD a AI rádcem.
export type When = 'ted' | 'vecer' | 'zitra' | 'sobota' | 'nedele';

export const WHEN_OPTIONS: { value: When; label: string }[] = [
  { value: 'ted', label: 'Teď' },
  { value: 'vecer', label: 'Dnes večer' },
  { value: 'zitra', label: 'Zítra ráno' },
  { value: 'sobota', label: 'V sobotu' },
  { value: 'nedele', label: 'V neděli' },
];

export type Slot = { minutes: number; label: string; travel: number };

function bump(at: number, center: number, width: number, height: number): number {
  const d = (at - center) / width;
  return height * Math.exp(-d * d);
}

/** Přirážka k době jízdy v minutách podle hodiny dne a typu dne. */
function trafficPenalty(minuteOfDay: number, weekend: boolean, sunday: boolean, base: number): number {
  const h = minuteOfDay / 60;
  if (sunday) return bump(h, 16.5, 1.8, base * 0.35);
  if (weekend) return bump(h, 9.5, 1.4, base * 0.3) + bump(h, 13, 2, base * 0.1);
  return bump(h, 7.6, 1.0, base * 0.35) + bump(h, 16.3, 1.3, base * 0.3);
}

function windowFor(when: When, now: Date): { start: number; weekend: boolean; sunday: boolean } {
  const nowMin = now.getHours() * 60 + Math.ceil(now.getMinutes() / 20) * 20;
  const day = now.getDay();
  switch (when) {
    case 'ted':
      return { start: nowMin, weekend: day === 6 || day === 0, sunday: day === 0 };
    case 'vecer':
      return { start: Math.max(nowMin, 17 * 60), weekend: day === 6 || day === 0, sunday: day === 0 };
    case 'zitra': {
      const t = (day + 1) % 7;
      return { start: 6 * 60, weekend: t === 6 || t === 0, sunday: t === 0 };
    }
    case 'sobota':
      return { start: 6 * 60, weekend: true, sunday: false };
    case 'nedele':
      return { start: 13 * 60, weekend: true, sunday: true };
  }
}

export function fmtTime(minuteOfDay: number): string {
  const m = ((minuteOfDay % 1440) + 1440) % 1440;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}

/** Devět odjezdů po 20 minutách s odhadem doby jízdy. */
export function departureSlots(when: When, baseMinutes: number, now: Date = new Date()): Slot[] {
  const { start, weekend, sunday } = windowFor(when, now);
  return Array.from({ length: 9 }, (_, i) => {
    const minutes = start + i * 20;
    const travel = Math.round(baseMinutes + trafficPenalty(minutes + baseMinutes / 2, weekend, sunday, baseMinutes));
    return { minutes, label: fmtTime(minutes), travel };
  });
}

export function bestSlot(slots: Slot[]): Slot {
  return slots.reduce((a, b) => (b.travel < a.travel ? b : a));
}

export function worstSlot(slots: Slot[]): Slot {
  return slots.reduce((a, b) => (b.travel > a.travel ? b : a));
}
