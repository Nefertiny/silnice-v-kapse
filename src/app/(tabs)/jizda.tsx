import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { MapyCredit } from '@/components/MapyCredit';
import { Screen } from '@/components/Screen';
import { ChoiceGroup, GlassCard, IconButton, PrimaryButton, SectionLabel, Title } from '@/components/ui';
import { useRoutePlan } from '@/lib/route/useRoutePlan';
import { bestSlot, departureSlots, fmtDuration, worstSlot, WHEN_OPTIONS, type When } from '@/lib/trips';
import { colors, fonts } from '@/theme';

// Ukázková doba jízdy bez provozu, když se trasa z Mapy.com nenačte.
const SAMPLE_BASE_MINUTES = 112;

export default function Trip() {
  const [from, setFrom] = useState('Praha');
  const [to, setTo] = useState('Brno');
  const [when, setWhen] = useState<When>('sobota');

  const plan = useRoutePlan(from, to, 900);
  const route = plan.status === 'ready' ? plan.route : undefined;
  const base = route?.minutes ?? SAMPLE_BASE_MINUTES;
  const slots = useMemo(() => departureSlots(when, base), [when, base]);
  const best = bestSlot(slots);
  const worst = worstSlot(slots);
  const max = worst.travel;
  const min = best.travel;

  return (
    <Screen tab>
      <Title>Kdy vyrazit?</Title>

      <GlassCard style={{ gap: 0, paddingVertical: 4 }}>
        <View style={styles.place}>
          <View style={[styles.dot, { borderWidth: 2, borderColor: colors.accent }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>ODKUD</Text>
            <TextInput accessibilityLabel="Odkud" value={from} onChangeText={setFrom} style={styles.input} placeholder="Město nebo adresa" placeholderTextColor={colors.faint} />
          </View>
          <IconButton
            icon="swap"
            label="Prohodit start a cíl"
            onPress={() => {
              setFrom(to);
              setTo(from);
            }}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.place}>
          <View style={[styles.dot, { backgroundColor: colors.warn }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>KAM</Text>
            <TextInput accessibilityLabel="Kam" value={to} onChangeText={setTo} style={styles.input} placeholder="Město nebo adresa" placeholderTextColor={colors.faint} />
          </View>
        </View>
      </GlassCard>
      {route ? (
        <View style={styles.routeInfo}>
          <Text style={styles.small}>
            {route.lengthKm} km · bez provozu {fmtDuration(route.minutes)}
          </Text>
          <MapyCredit />
        </View>
      ) : (
        <Text style={styles.small}>{plan.status === 'loading' ? 'Hledám trasu…' : plan.status === 'error' ? plan.message : 'Ukázková trasa, mapy zatím nejsou zapnuté.'}</Text>
      )}

      <SectionLabel>Kdy pojedete?</SectionLabel>
      <ChoiceGroup columns={3} options={WHEN_OPTIONS} value={when} onChange={setWhen} />

      <GlassCard tone="accent">
        <View style={styles.resultTop}>
          <View>
            <SectionLabel>Nejlepší odjezd</SectionLabel>
            <Text style={styles.bigTime}>{best.label}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.duration}>{fmtDuration(best.travel)}</Text>
            <Text style={styles.small}>
              v {worst.label} až {fmtDuration(worst.travel)}
            </Text>
          </View>
        </View>
        <View style={styles.bars} accessibilityLabel={`Doba jízdy podle odjezdu, nejkratší v ${best.label}`}>
          {slots.map((s) => {
            const h = 18 + ((s.travel - min) / Math.max(1, max - min)) * 72;
            const isBest = s === best;
            return (
              <View key={s.minutes} style={styles.barCol}>
                <View
                  style={[
                    styles.bar,
                    { height: h, backgroundColor: isBest ? colors.accent : s.travel > min + (max - min) * 0.6 ? 'rgba(255,181,71,0.55)' : 'rgba(140,170,220,0.28)' },
                  ]}
                />
                <Text style={styles.barLabel}>{s.label}</Text>
              </View>
            );
          })}
        </View>
        <PrimaryButton
          label="Zobrazit trasu"
          onPress={() => router.push({ pathname: '/trasa', params: { from, to, depart: best.label, travel: String(best.travel) } })}
        />
      </GlassCard>

      <GlassCard style={{ flexDirection: 'row', gap: 12 }}>
        <View style={styles.aiIcon}>
          <Icon name="spark" size={18} color={colors.accent} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.aiTitle}>AI rádce</Text>
          <Text style={styles.aiText}>
            Vyražte v {best.label}, ušetříte proti nejhoršímu času asi {worst.travel - best.travel} minut.{' '}
            {route ? 'Délku trasy známe z Mapy.com, zdržení ve špičkách zatím odhadujeme.' : 'Ukázkový výpočet, trasa se zatím nenačetla.'}
          </Text>
        </View>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  place: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.muted },
  input: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, paddingVertical: 2 },
  divider: { height: 1, backgroundColor: 'rgba(140,170,220,0.14)', marginLeft: 22 },
  routeInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  resultTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  bigTime: { fontFamily: fonts.display, fontSize: 38, color: colors.accent },
  duration: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.text },
  small: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 112 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  bar: { width: '100%', borderRadius: 6 },
  barLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.muted },
  aiIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(56,225,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  aiTitle: { fontFamily: fonts.bodyHeavy, fontSize: 12, color: colors.accent },
  aiText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: '#D5DEEC' },
});
