import type { Car, DeadlineKind } from './types';

const DAY = 24 * 60 * 60 * 1000;

export type DeadlineState = 'ok' | 'soon' | 'expired' | 'unknown' | 'exempt';

export type Deadline = {
  kind: DeadlineKind;
  title: string;
  date?: string;
  daysLeft?: number;
  state: DeadlineState;
};

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toIsoDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function formatCz(iso: string): string {
  const d = parseIsoDate(iso);
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

export function daysUntil(iso: string, today: Date = new Date()): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((parseIsoDate(iso).getTime() - start.getTime()) / DAY);
}

/** Vrátí všechna data ve tvaru „31. 1. 2027“ nebo „31.01.2027“ z textu, jako RRRR-MM-DD. */
export function findCzDates(text: string): string[] {
  const out: string[] = [];
  const re = /(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const [, d, mo, y] = m;
    out.push(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`);
  }
  return out;
}

export function daysLabel(days: number): string {
  if (days < 0) return 'Propadlo';
  if (days === 0) return 'Dnes';
  if (days === 1) return 'Zítra';
  if (days < 5) return `Za ${days} dny`;
  return `Za ${days} dní`;
}

const SOON_DAYS = 30;

function build(kind: DeadlineKind, title: string, date?: string, exempt?: boolean): Deadline {
  if (exempt) return { kind, title, state: 'exempt' };
  if (!date) return { kind, title, state: 'unknown' };
  const daysLeft = daysUntil(date);
  const state: DeadlineState = daysLeft < 0 ? 'expired' : daysLeft <= SOON_DAYS ? 'soon' : 'ok';
  return { kind, title, date, daysLeft, state };
}

export function carDeadlines(car: Car): Deadline[] {
  return [
    build('vignette', 'Dálniční známka', car.vignetteUntil, car.vignetteExempt || car.type === 'motorka'),
    build('stk', 'Technická (STK)', car.stkUntil),
    build('insurance', 'Povinné ručení', car.insuranceUntil),
  ];
}

export function okCount(car: Car): number {
  return carDeadlines(car).filter((d) => d.state === 'ok' || d.state === 'exempt').length;
}
