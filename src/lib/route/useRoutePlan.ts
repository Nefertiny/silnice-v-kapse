import { useEffect, useState } from 'react';

import { planRoute, routeErrorText, routingConfigured, type PlannedRoute } from './mapy';

export type RoutePlan =
  | { status: 'off' }
  | { status: 'loading' }
  | { status: 'ready'; route: PlannedRoute }
  | { status: 'error'; message: string };

type Result = { key: string; route?: PlannedRoute; message?: string };

/** Trasa pro zadaná místa. Při psaní počká `delayMs`, aby se neptala na každé písmeno. */
export function useRoutePlan(from: string, to: string, delayMs = 0): RoutePlan {
  const a = from.trim();
  const b = to.trim();
  const key = `${a}|${b}`;
  const ready = routingConfigured() && a.length >= 2 && b.length >= 2;
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const t = setTimeout(() => {
      planRoute(a, b).then(
        (route) => !cancelled && setResult({ key, route }),
        (e) => !cancelled && setResult({ key, message: routeErrorText(e) }),
      );
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [ready, a, b, key, delayMs]);

  if (!routingConfigured()) return { status: 'off' };
  if (!ready) return { status: 'error', message: 'Zadejte, odkud a kam pojedete.' };
  if (result?.key !== key) return { status: 'loading' };
  return result.route ? { status: 'ready', route: result.route } : { status: 'error', message: result.message ?? routeErrorText(null) };
}
