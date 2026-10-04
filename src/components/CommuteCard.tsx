import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { adviceFor, directionAt, type Commute, type Direction } from '@/lib/commute';
import { useCommute } from '@/lib/commuteStore';
import { googleMapsUrl } from '@/lib/route/links';
import { useTodayDrive } from '@/lib/route/useTodayDrive';
import { fmtDuration } from '@/lib/trips';
import { colors, fonts } from '@/theme';
import { Icon } from './Icon';
import { MapyCredit } from './MapyCredit';
import { Body, GlassCard, PrimaryButton, SecondaryButton, SectionLabel } from './ui';

const latLon = (p: Commute['home']) => `${p.position[1]},${p.position[0]}`;

/** Na domovské stránce: kolik dnes pojedete do práce (odpoledne domů) a kdy vyrazit. */
export function CommuteCard() {
  const { ready, commute } = useCommute();
  const [direction, setDirection] = useState<Direction>(() => directionAt(new Date()));
  const today = useTodayDrive(commute, direction);
  if (!ready) return null;

  if (!commute) {
    return (
      <GlassCard>
        <View style={styles.head}>
          <Icon name="route" size={18} color={colors.accent} strokeWidth={2} />
          <SectionLabel>Cesta do práce</SectionLabel>
        </View>
        <Body muted>Zadejte domov a práci. Každé ráno uvidíte, kolik dnes pojedete a kdy vyrazit, abyste nepřijeli pozdě.</Body>
        <SecondaryButton label="Nastavit domov a práci" icon="plus" onPress={() => router.push('/prace')} />
      </GlassCard>
    );
  }

  const toWork = direction === 'work';
  const advice = today.status === 'ready' ? adviceFor(commute, direction, today.drive.minutes) : null;
  const tone = advice?.late ? 'alert' : advice && advice.extra >= 10 ? 'warn' : 'accent';
  const [from, to] = toWork ? [commute.home, commute.work] : [commute.work, commute.home];

  return (
    <GlassCard tone={tone}>
      <View style={styles.headRow}>
        <View style={styles.head}>
          <Icon name="route" size={18} color={colors.accent} strokeWidth={2} />
          <SectionLabel>{toWork ? 'Dnes do práce' : 'Dnes domů'}</SectionLabel>
        </View>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setDirection(toWork ? 'home' : 'work')}>
          <Text style={styles.link}>{toWork ? 'Cesta domů' : 'Cesta do práce'}</Text>
        </Pressable>
      </View>

      {today.status === 'loading' && <ActivityIndicator color={colors.accent} style={{ alignSelf: 'flex-start' }} />}
      {today.status === 'error' && <Body muted>{today.message}</Body>}
      {today.status === 'off' && <Body muted>Mapa a provoz zatím nejsou zapnuté.</Body>}
      {today.status === 'ready' && advice && (
        <>
          <View style={styles.numbers}>
            <Text style={styles.duration}>{fmtDuration(today.drive.minutes)}</Text>
            <Text style={[styles.extra, { color: advice.extra >= 10 ? colors.warn : advice.extra >= 3 ? colors.text : colors.ok }]}>
              {advice.extra >= 3 ? `o ${advice.extra} min víc než obvykle` : 'bez zdržení'}
            </Text>
          </View>
          <Text style={[styles.advice, advice.late && { color: colors.alert }]}>
            {advice.leaveAt
              ? advice.late
                ? `Měli jste vyrazit v ${advice.leaveAt}. Když vyrazíte hned, budete v práci v ${advice.arriveNow}.`
                : `Vyrazte nejpozději v ${advice.leaveAt}, budete tam včas.`
              : `Když vyrazíte hned, budete ${toWork ? 'v práci' : 'doma'} v ${advice.arriveNow}.`}
          </Text>
          <MapyCredit />
        </>
      )}

      <View style={styles.actions}>
        <PrimaryButton style={{ flex: 1 }} label="Navigovat" icon="route" onPress={() => Linking.openURL(googleMapsUrl(latLon(from), latLon(to)))} />
        <SecondaryButton style={{ flex: 1 }} label="Upravit" onPress={() => router.push('/prace')} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accent },
  numbers: { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
  duration: { fontFamily: fonts.display, fontSize: 28, color: colors.text },
  extra: { fontFamily: fonts.bodyBold, fontSize: 14 },
  advice: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.text },
  actions: { flexDirection: 'row', gap: 10 },
});
