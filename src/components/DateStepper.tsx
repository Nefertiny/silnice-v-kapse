import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { parseIsoDate, toIsoDate } from '@/lib/dates';
import { colors, fonts } from '@/theme';
import { GlassCard, IconButton, PrimaryButton, SecondaryButton } from './ui';

const MONTHS = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'];

function Part({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.part}>
      <IconButton icon="plus" label={`Další ${label}`} onPress={onPlus} />
      <Text style={styles.value}>{value}</Text>
      <IconButton icon="minus" label={`Předchozí ${label}`} onPress={onMinus} />
    </View>
  );
}

/** Zadání data jen tlačítky, bez kalendáře a rozbalovacích seznamů. */
export function DateStepper({
  title,
  initial,
  onSave,
  onCancel,
  children,
}: {
  title: string;
  initial?: string;
  onSave: (iso: string) => void;
  onCancel: () => void;
  /** Co ukázat mezi nadpisem a datem (např. výběr pojišťovny). */
  children?: ReactNode;
}) {
  const [date, setDate] = useState(() => (initial ? parseIsoDate(initial) : new Date()));
  const shift = (unit: 'd' | 'm' | 'y', by: number) => {
    const next = new Date(date);
    if (unit === 'd') next.setDate(next.getDate() + by);
    if (unit === 'm') next.setMonth(next.getMonth() + by);
    if (unit === 'y') next.setFullYear(next.getFullYear() + by);
    setDate(next);
  };
  return (
    <GlassCard tone="accent">
      <Text style={styles.title}>{title}</Text>
      {children}
      <View style={styles.row}>
        <Part label="den" value={String(date.getDate())} onMinus={() => shift('d', -1)} onPlus={() => shift('d', 1)} />
        <Part label="měsíc" value={MONTHS[date.getMonth()]} onMinus={() => shift('m', -1)} onPlus={() => shift('m', 1)} />
        <Part label="rok" value={String(date.getFullYear())} onMinus={() => shift('y', -1)} onPlus={() => shift('y', 1)} />
      </View>
      <View style={styles.row}>
        <SecondaryButton style={{ flex: 1 }} label="Zrušit" onPress={onCancel} />
        <PrimaryButton style={{ flex: 1 }} label="Uložit" onPress={() => onSave(toIsoDate(date))} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.text },
  row: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  part: { flex: 1, alignItems: 'center', gap: 8 },
  value: { fontFamily: fonts.display, fontSize: 18, color: colors.text, minHeight: 26 },
});
