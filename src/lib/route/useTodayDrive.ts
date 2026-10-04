import { useEffect, useState } from 'react';

import type { Commute, Direction } from '../commute';
import { drive, routeErrorText, routingConfigured, type Drive } from './mapy';

export type TodayDrive = { status: 'off' } | { status: 'loading' } | { status: 'ready'; drive: Drive } | { status: 'error'; message: string };

/** Provoz se mění, po této době se ptáme znovu. Kratší by zbytečně čerpalo kredity Mapy.com. */
const REFRESH_MS = 5 * 60 * 1000;

const cache = new Map<string, { at: number; drive: Promise<Drive> }>();

function trafficDrive(commute: Commute, direction: Direction): Promise<Drive> {
  const [from, to] = direction === 'work' ? [commute.home, commute.work] : [commute.work, commute.home];
  const key = `${from.position.join()}|${to.position.join()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < REFRESH_MS) return hit.drive;
  const p = drive(from.position, to.position, true);
  cache.set(key, { at: Date.now(), drive: p });
  p.catch(() => cache.delete(key));
  return p;
}

type Result = { key: string; drive?: Drive; message?: string };

/** Dnešní doba jízdy s aktuálním provozem. Dokud je obrazovka otevřená, každých 5 minut ji obnoví. */
export function useTodayDrive(commute: Commute | null, direction: Direction): TodayDrive {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const on = !!commute && routingConfigured();
  const base = commute ? `${direction}|${commute.home.position.join()}|${commute.work.position.join()}` : '';
  const key = `${base}|${tick}`;

  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
    return () => clearInterval(t);
  }, [on]);

  useEffect(() => {
    if (!on || !commute) return;
    let cancelled = false;
    trafficDrive(commute, direction).then(
      (d) => !cancelled && setResult({ key, drive: d }),
      (e) => !cancelled && setResult({ key, message: routeErrorText(e) }),
    );
    return () => {
      cancelled = true;
    };
  }, [on, commute, direction, key]);

  if (!on) return { status: 'off' };
  // Při obnovení necháme na kartě poslední známé číslo, ať neproblikává.
  const shown = result?.key.startsWith(`${base}|`) ? result : null;
  if (!shown) return { status: 'loading' };
  return shown.drive ? { status: 'ready', drive: shown.drive } : { status: 'error', message: shown.message ?? routeErrorText(null) };
}
