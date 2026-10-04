import { daysUntil, findCzDates, parseIsoDate, toIsoDate } from '../dates';
import type { LookupSourceId } from '../types';

export type LookupOutcome =
  | { kind: 'wrong-code' }
  | { kind: 'not-found' }
  | { kind: 'vignette'; until?: string; exempt: boolean; valid: boolean }
  | { kind: 'stk'; lastInspection: string; estimatedUntil: string }
  | { kind: 'vehicle'; vin?: string; stkUntil?: string }
  | { kind: 'unknown' };

const WRONG_CODE = /nesprávn[ýě] kód|chybn[ýě] kód|kód (z obrázku )?(je )?(chybn|nesprávn|neplatn)|opište (kód )?znovu/i;
const NOT_FOUND = /nebyl[ao]? nalezen|nenalezen|neexistuje|není pojištěn|žádn[ýáé] záznam/i;

function latest(dates: string[]): string | undefined {
  return dates.length ? [...dates].sort().at(-1) : undefined;
}

function addYears(iso: string, years: number): string {
  const d = parseIsoDate(iso);
  d.setFullYear(d.getFullYear() + years);
  return toIsoDate(d);
}

export function parseLookup(source: LookupSourceId, text: string, today: Date = new Date()): LookupOutcome {
  if (WRONG_CODE.test(text)) return { kind: 'wrong-code' };
  const dates = findCzDates(text);

  if (source === 'edalnice') {
    if (/osvobozen/i.test(text)) return { kind: 'vignette', exempt: true, valid: true };
    const until = latest(dates);
    if (!until) return NOT_FOUND.test(text) || /nem[aá] platn|neplatn|nejsou platn/i.test(text) ? { kind: 'vignette', exempt: false, valid: false } : { kind: 'unknown' };
    return { kind: 'vignette', until, exempt: false, valid: daysUntil(until, today) >= 0 };
  }

  if (source === 'overeniauta') {
    if (NOT_FOUND.test(text)) return { kind: 'not-found' };
    const vin = /\b([A-HJ-NPR-Z0-9]{17})\b/.exec(text)?.[1];
    const stk = /(?:STK|technick[áé] prohlídk[ay])[^\n]{0,40}?(?:do|platnost[^\d\n]{0,15})\s*:?\s*(\d{1,2}\.\s?\d{1,2}\.\s?\d{4})/i.exec(text);
    const stkUntil = stk ? findCzDates(stk[1])[0] : undefined;
    if (!vin && !stkUntil) return { kind: 'unknown' };
    return { kind: 'vehicle', vin, stkUntil };
  }

  // Kontrola tachometru: data technických prohlídek, nová STK = poslední + 2 roky.
  if (NOT_FOUND.test(text)) return { kind: 'not-found' };
  const lastInspection = latest(dates.filter((d) => daysUntil(d, today) <= 0));
  if (!lastInspection) return { kind: 'unknown' };
  return { kind: 'stk', lastInspection, estimatedUntil: addYears(lastInspection, 2) };
}
