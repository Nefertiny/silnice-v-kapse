import { daysLabel, formatCz, type Deadline } from '@/lib/dates';
import type { DeadlineKind } from '@/lib/types';
import type { IconName } from './Icon';

export const DEADLINE_ICON: Record<DeadlineKind, IconName> = { vignette: 'ticket', stk: 'wrench', insurance: 'shield' };

type Look = {
  tone: 'ok' | 'warn' | 'alert' | 'accent' | 'neutral';
  pill: { label: string; tone: 'ok' | 'warn' | 'alert' | 'accent' | 'solid' | 'neutral' };
  subtitle: string;
};

/** Jak termín vypadá na kartě: barva, štítek a popisek. */
export function deadlineLook(d: Deadline, extra?: string): Look {
  const suffix = extra ? ` · ${extra}` : '';
  switch (d.state) {
    case 'ok':
      return { tone: 'ok', pill: { label: 'Platí', tone: 'ok' }, subtitle: `Platí do ${formatCz(d.date!)}${suffix}` };
    case 'soon':
      return { tone: 'warn', pill: { label: daysLabel(d.daysLeft!), tone: 'warn' }, subtitle: `Končí ${formatCz(d.date!)}${suffix}` };
    case 'expired':
      return { tone: 'alert', pill: { label: 'Propadlo', tone: 'alert' }, subtitle: `Skončilo ${formatCz(d.date!)}${suffix}` };
    case 'exempt':
      return { tone: 'ok', pill: { label: 'Nepotřeba', tone: 'ok' }, subtitle: 'Vozidlo je od poplatku osvobozené' };
    case 'unknown':
      return { tone: 'neutral', pill: { label: 'Doplnit', tone: 'accent' }, subtitle: 'Datum zatím nevíme' };
  }
}
