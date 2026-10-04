import { fmtTime } from './trips';
import type { Place } from './route/mapy';

/** Cesta do práce. Adresy jsou jen v telefonu, trasu počítá Mapy.com. */
export type Commute = {
  home: Place;
  work: Place;
  /** Kdy chce být klient v práci, v minutách od půlnoci. */
  arriveBy: number;
  /** Ráno ve všední dny připomenout, ať se podívá, kdy vyrazit. */
  remind: boolean;
  /** Doba jízdy po volných silnicích, v minutách. Podle ní poznáme, o kolik je dnes hůř. */
  usualToWork: number;
  usualToHome: number;
};

export type Direction = 'work' | 'home';

/** Rezerva na zaparkování a cestu od auta. */
export const BUFFER_MIN = 5;
/** O kolik dřív než obvyklý odjezd poslat ranní připomínku. */
export const REMIND_BEFORE_MIN = 20;

/** Dopoledne ukazujeme cestu do práce, odpoledne domů. */
export function directionAt(now: Date): Direction {
  return now.getHours() < 12 ? 'work' : 'home';
}

function minutesOfDay(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

export type Advice = {
  /** Kdy nejpozději vyrazit (jen cesta do práce). */
  leaveAt?: string;
  /** Kdy dorazí, když vyrazí teď. */
  arriveNow: string;
  /** Už měl vyrazit a do práce přijede pozdě. */
  late: boolean;
  /** O kolik minut je dnes cesta delší než po volných silnicích. */
  extra: number;
};

export function adviceFor(commute: Commute, direction: Direction, trafficMinutes: number, now: Date = new Date()): Advice {
  const nowMin = minutesOfDay(now);
  const usual = direction === 'work' ? commute.usualToWork : commute.usualToHome;
  const arriveNow = fmtTime(nowMin + trafficMinutes);
  const extra = Math.max(0, trafficMinutes - usual);
  if (direction === 'home') return { arriveNow, late: false, extra };
  const leave = commute.arriveBy - trafficMinutes - BUFFER_MIN;
  // Po příjezdovém čase už radit nemá smysl, ukážeme jen dobu jízdy.
  if (nowMin > commute.arriveBy) return { arriveNow, late: false, extra };
  return { leaveAt: fmtTime(leave), arriveNow, late: nowMin > leave, extra };
}

/** Čas ranní připomínky: obvyklý odjezd minus rezerva na kontrolu provozu. */
export function reminderMinute(commute: Commute): number {
  return Math.max(0, commute.arriveBy - commute.usualToWork - BUFFER_MIN - REMIND_BEFORE_MIN);
}

export function arriveByLabel(minutes: number): string {
  return fmtTime(minutes);
}
