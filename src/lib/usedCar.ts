import { daysUntil, findCzDates, parseIsoDate } from './dates';

/** Prověření ojetiny z veřejných zdrojů: pátrání policie a kontrola tachometru. */

export type StolenCheck = 'stolen' | 'clear' | 'unknown';

/**
 * Výsledek pátrání policie (stav 4. 10. 2026): bez nálezu „Nebyly nalezeny žádné výsledky.“,
 * s nálezem tabulka s odkazem „Otevřít detail“ a stránka „Detail odcizeného vozidla“.
 */
export function parseStolen(text: string): StolenCheck {
  if (/otevřít detail|detail odcizeného/i.test(text)) return 'stolen';
  if (/nebyly nalezeny|nenalezen/i.test(text)) return 'clear';
  return 'unknown';
}

export type MileageRecord = { date: string; km: number };

const KM = /\d{1,3}(?:[ \u00a0\u202f.]\d{3})+|\d+/g;

function numbersIn(text: string): number[] {
  return (text.match(KM) ?? []).map((n) => Number(n.replace(/[ \u00a0\u202f.]/g, ''))).filter((n) => n > 0 && n < 2_000_000);
}

/**
 * Stav km při každé prohlídce. Tabulka má řádek na prohlídku (datum a km v jednom řádku), detail
 * prohlídky má „Datum prohlídky“ a „Stav km“ pod sebou. Umíme obojí. Jako km bereme největší
 * číslo v řádku bez data, ať nevadí pořadí sloupců ani mezery v tisících.
 */
export function parseMileage(text: string): MileageRecord[] {
  const seen = new Set<string>();
  const records: MileageRecord[] = [];
  const add = (date: string, km: number) => {
    const key = `${date}|${km}`;
    if (seen.has(key)) return;
    seen.add(key);
    records.push({ date, km });
  };
  let pending: string | undefined;
  let kmLabel = false;
  for (const line of text.split('\n')) {
    if (/registrac/i.test(line)) continue;
    const [date] = findCzDates(line);
    const numbers = numbersIn(line.replace(/\d{1,2}\.\s?(?:\d{1,2}\.|[a-zá-ž]+)\s?\d{4}/gi, ' '));
    if (date && numbers.length) {
      add(date, Math.max(...numbers));
      pending = undefined;
    } else if (date) {
      pending = date;
    } else if (pending && numbers.length && (/km/i.test(line) || kmLabel)) {
      add(pending, Math.max(...numbers));
      pending = undefined;
    }
    // Popisek „Stav km“ bez čísla: hodnota je na dalším řádku.
    kmLabel = /km/i.test(line) && !numbers.length;
  }
  return records.sort((a, b) => a.date.localeCompare(b.date) || a.km - b.km);
}

export type MileageSummary = {
  records: MileageRecord[];
  /** Největší pokles stavu km mezi dvěma prohlídkami po sobě. */
  rollback?: { from: MileageRecord; to: MileageRecord };
  /** Kolik auto průměrně najezdí za rok, když jsou aspoň dva záznamy. */
  perYear?: number;
  last?: MileageRecord;
};

export function summarizeMileage(records: MileageRecord[]): MileageSummary {
  let rollback: MileageSummary['rollback'];
  for (let i = 1; i < records.length; i++) {
    const drop = records[i - 1].km - records[i].km;
    if (drop > 0 && (!rollback || drop > rollback.from.km - rollback.to.km)) rollback = { from: records[i - 1], to: records[i] };
  }
  const first = records[0];
  const last = records.at(-1);
  let perYear: number | undefined;
  if (first && last && first !== last) {
    const years = (parseIsoDate(last.date).getTime() - parseIsoDate(first.date).getTime()) / (365.25 * 24 * 3600 * 1000);
    if (years >= 0.5) perYear = Math.round((Math.max(...records.map((r) => r.km)) - first.km) / years / 100) * 100;
  }
  return { records, rollback, perYear, last };
}

export function fmtKm(km: number): string {
  return `${String(km).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} km`;
}

/** Poslední prohlídka v minulosti, ať nespleteme budoucí datum z textu stránky. */
export function lastInspection(records: MileageRecord[], today: Date = new Date()): MileageRecord | undefined {
  return records.filter((r) => daysUntil(r.date, today) <= 0).at(-1);
}
