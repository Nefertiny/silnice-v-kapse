import { daysUntil, findCzDates, parseIsoDate, toIsoDate } from '../dates';
import type { LookupSourceId } from '../types';

export type LookupOutcome =
  | { kind: 'wrong-code' }
  | { kind: 'not-found' }
  | { kind: 'vignette'; until?: string; exempt: boolean; valid: boolean }
  | { kind: 'insurance'; insurer?: string; until?: string }
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

/** Nejbližší výročí smlouvy ode dneška (včetně). */
export function nextAnniversary(fromIso: string, today: Date = new Date()): string {
  let candidate = fromIso;
  while (daysUntil(candidate, today) < 0) candidate = addYears(candidate, 1);
  return candidate;
}

function findInsurer(text: string): string | undefined {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const labelIdx = lines.findIndex((l) => /^pojistitel|^pojišťovna\s*:/i.test(l));
  if (labelIdx >= 0) {
    const sameLine = lines[labelIdx].split(':').slice(1).join(':').trim();
    if (sameLine) return sameLine;
    if (lines[labelIdx + 1]) return lines[labelIdx + 1];
  }
  return lines.find((l) => /pojišťovna/i.test(l) && l.length < 90 && !/ověř|vyhled/i.test(l));
}

export function parseLookup(source: LookupSourceId, text: string, today: Date = new Date()): LookupOutcome {
  if (WRONG_CODE.test(text)) return { kind: 'wrong-code' };
  const dates = findCzDates(text);

  if (source === 'edalnice') {
    if (/osvobozen/i.test(text)) return { kind: 'vignette', exempt: true, valid: true };
    const until = latest(dates);
    if (!until) return NOT_FOUND.test(text) || /nem[aá] platn|neplatn/i.test(text) ? { kind: 'vignette', exempt: false, valid: false } : { kind: 'unknown' };
    return { kind: 'vignette', until, exempt: false, valid: daysUntil(until, today) >= 0 };
  }

  if (source === 'ckp') {
    if (NOT_FOUND.test(text)) return { kind: 'not-found' };
    const insurer = findInsurer(text);
    const explicitEnd = /(?:do|konec)\s*:?\s*(\d{1,2}\.\s?\d{1,2}\.\s?\d{4})/i.exec(text);
    let until: string | undefined;
    if (explicitEnd) until = findCzDates(explicitEnd[1])[0];
    else {
      const start = /od\s*:?\s*(\d{1,2}\.\s?\d{1,2}\.\s?\d{4})/i.exec(text);
      if (start) until = nextAnniversary(findCzDates(start[1])[0], today);
    }
    if (!insurer && !until) return { kind: 'unknown' };
    return { kind: 'insurance', insurer, until };
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
