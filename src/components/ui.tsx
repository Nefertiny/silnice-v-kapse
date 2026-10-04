import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius, tint } from '@/theme';
import { Icon, type IconName } from './Icon';

function tap() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

export function GlassCard({ children, style, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'accent' | 'warn' | 'ok' | 'alert' }) {
  const borderColor =
    tone === 'accent' ? 'rgba(56,225,255,0.45)' : tone === 'warn' ? 'rgba(255,181,71,0.45)' : tone === 'ok' ? 'rgba(61,220,151,0.45)' : tone === 'alert' ? 'rgba(255,107,129,0.45)' : colors.border;
  return <View style={[styles.card, { borderColor }, style]}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<any> }) {
  return <Text style={[styles.body, muted && { color: colors.muted }, style]}>{children}</Text>;
}

type PillTone = 'ok' | 'warn' | 'alert' | 'accent' | 'solid' | 'neutral';

export function Pill({ label, tone }: { label: string; tone: PillTone }) {
  const map: Record<PillTone, { bg: string; fg: string }> = {
    ok: { bg: tint.ok, fg: colors.ok },
    warn: { bg: tint.warn, fg: colors.warn },
    alert: { bg: tint.alert, fg: colors.alert },
    accent: { bg: tint.accent, fg: colors.accent },
    solid: { bg: colors.accent, fg: colors.onAccent },
    neutral: { bg: 'rgba(140,170,220,0.14)', fg: colors.muted },
  };
  return (
    <View style={[styles.pill, { backgroundColor: map[tone].bg }]}>
      <Text style={[styles.pillText, { color: map[tone].fg }]}>{label}</Text>
    </View>
  );
}

type ButtonProps = { label: string; onPress: () => void; icon?: IconName; disabled?: boolean; sub?: string; style?: StyleProp<ViewStyle> };

export function PrimaryButton({ label, onPress, icon, disabled, sub, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.primary, (pressed || disabled) && { opacity: disabled ? 0.45 : 0.85 }, style]}
    >
      <View style={styles.row}>
        {icon && <Icon name={icon} size={20} color={colors.onAccent} strokeWidth={2} />}
        <Text style={styles.primaryText}>{label}</Text>
      </View>
      {sub && <Text style={styles.primarySub}>{sub}</Text>}
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, icon, disabled, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.secondary, (pressed || disabled) && { opacity: disabled ? 0.45 : 0.8 }, style]}
    >
      {icon && <Icon name={icon} size={20} color={colors.text} strokeWidth={2} />}
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, color = colors.text }: { icon: IconName; label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
    >
      <Icon name={icon} size={20} color={color} strokeWidth={2} />
    </Pressable>
  );
}

export function BackHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={[styles.row, { gap: 12, justifyContent: 'flex-start' }]}>
      <IconButton icon="back" label="Zpět" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.title, { fontSize: 20 }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && <Text style={styles.small}>{subtitle}</Text>}
      </View>
    </View>
  );
}

export type Choice<T extends string> = { value: T; label: string; sub?: string };

/** Výběr z tlačítek místo rozbalovacího seznamu. */
export function ChoiceGroup<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: number;
}) {
  return (
    <View style={styles.choiceWrap}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={[
              styles.choice,
              { width: `${100 / columns - 2.5}%` as const },
              on ? { borderColor: colors.accent, backgroundColor: o.sub ? 'rgba(56,225,255,0.12)' : colors.accent, borderWidth: 1.5 } : null,
            ]}
          >
            <Text style={[styles.choiceText, on && !o.sub && { color: colors.onAccent }]}>{o.label}</Text>
            {o.sub && <Text style={styles.small}>{o.sub}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({ value, label, onMinus, onPlus }: { value: string; label: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={[styles.row, { gap: 6 }]}>
      <IconButton icon="minus" label={`Snížit ${label}`} onPress={onMinus} />
      <Text style={styles.stepperValue}>{value}</Text>
      <IconButton icon="plus" label={`Zvýšit ${label}`} onPress={onPlus} />
    </View>
  );
}

export function Plate({ spz, size = 'm' }: { spz: string; size?: 's' | 'm' | 'l' }) {
  const h = size === 's' ? 26 : size === 'm' ? 40 : 64;
  const fs = size === 's' ? 13 : size === 'm' ? 22 : 32;
  return (
    <View style={[styles.plate, { height: h, borderWidth: size === 'l' ? 3 : 2 }]}>
      <View style={[styles.plateEu, { width: h * 0.5 }]}>
        {size !== 's' && <Text style={[styles.plateCz, { fontSize: size === 'l' ? 12 : 9 }]}>CZ</Text>}
      </View>
      <Text style={[styles.plateText, { fontSize: fs, letterSpacing: size === 's' ? 1 : 2.5 }]}>{spz || '— — —'}</Text>
    </View>
  );
}

export function StatusRow({
  icon,
  title,
  subtitle,
  pill,
  tone,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  pill?: { label: string; tone: PillTone };
  tone: 'ok' | 'warn' | 'alert' | 'accent' | 'neutral';
  onPress?: () => void;
}) {
  const fg = tone === 'neutral' ? colors.muted : colors[tone];
  const bg = tone === 'neutral' ? 'rgba(140,170,220,0.12)' : tint[tone];
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.statusRow,
        tone === 'warn' || tone === 'alert' ? { borderColor: tone === 'warn' ? 'rgba(255,181,71,0.45)' : 'rgba(255,107,129,0.45)' } : null,
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.statusIcon, { backgroundColor: bg }]}>
        <Icon name={icon} size={20} color={fg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.small}>{subtitle}</Text>
      </View>
      {pill && <Pill label={pill.label} tone={pill.tone} />}
    </Pressable>
  );
}

export function AdBanner({ onHide }: { onHide: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onHide} style={styles.ad}>
      <Text style={styles.small}>
        <Text style={{ color: colors.text, fontFamily: fonts.bodyBold }}>Reklama</Text> · místo pro banner
      </Text>
      <Text style={[styles.small, { color: colors.accent, fontFamily: fonts.bodyBold }]}>Skrýt</Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    gap: 12,
  },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
  section: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.4, color: colors.muted, textTransform: 'uppercase' },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.text },
  small: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, lineHeight: 18 },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  pillText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  primary: {
    minHeight: 58,
    borderRadius: radius.button,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryText: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.onAccent },
  primarySub: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.onAccent, opacity: 0.75 },
  secondary: {
    minHeight: 58,
    borderRadius: radius.button,
    backgroundColor: 'rgba(16,24,42,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(140,170,220,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  secondaryText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(140,170,220,0.22)',
    backgroundColor: 'rgba(11,18,32,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    minHeight: 48,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: 'rgba(140,170,220,0.2)',
    backgroundColor: colors.surface,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  choiceText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  stepperValue: { minWidth: 76, textAlign: 'center', fontFamily: fonts.display, fontSize: 16, color: colors.text },
  plate: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'stretch',
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: colors.plate,
    borderColor: colors.plateText,
  },
  plateEu: { backgroundColor: colors.plateEu, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
  plateCz: { fontFamily: fonts.bodyHeavy, color: '#FFFFFF' },
  plateText: { fontFamily: fonts.bodyHeavy, color: colors.plateText, paddingHorizontal: 12, alignSelf: 'center' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ad: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(140,170,220,0.35)',
    backgroundColor: 'rgba(5,8,15,0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
});
