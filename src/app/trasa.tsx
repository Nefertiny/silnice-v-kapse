import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { BackHeader, ChoiceGroup, GlassCard, PrimaryButton, SecondaryButton, SectionLabel, Stepper } from '@/components/ui';
import { useCars } from '@/lib/cars';
import { fmtDuration } from '@/lib/trips';
import { colors, fonts } from '@/theme';

// Ukázková uzavírka a objížďka. Skutečné události dodá NDIC (ŘSD) a trasu mapové API.
const DETOUR_EXTRA = 6;
const JAM_EXTRA = 29;
const SAMPLE_DISTANCE_KM = 205;

function MapSketch() {
  return (
    <View style={styles.map} accessibilityLabel="Náčrt trasy s uzavírkou a objížďkou">
      <Svg width="100%" height="100%" viewBox="0 0 350 220">
        <Path d="M30 30 L100 50 L150 105 L210 125 L270 170 L325 200" stroke="rgba(140,170,220,0.22)" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M30 30 L100 50 L150 105" stroke={colors.accent} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M150 105 L188 72 L214 128" stroke={colors.warn} strokeWidth={5} strokeDasharray="10 8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M214 128 L270 170 L325 200" stroke={colors.accent} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M150 105 L210 125" stroke={colors.alert} strokeWidth={5} strokeDasharray="4 6" strokeLinecap="round" fill="none" />
        <Circle cx={180} cy={115} r={9} fill={colors.alert} />
        <Path d="M176 115h8" stroke={colors.groundDeep} strokeWidth={2.5} strokeLinecap="round" />
        <Circle cx={30} cy={30} r={7} fill={colors.groundDeep} stroke={colors.accent} strokeWidth={3} />
        <Circle cx={325} cy={200} r={8} fill={colors.warn} />
        <Circle cx={214} cy={128} r={12} fill={colors.surfaceSolid} stroke={colors.ok} strokeWidth={2} />
        <Path d="M216 120l-6 9h5l-1 7 6-9h-5z" fill={colors.ok} />
        <SvgText x={196} y={66} fill={colors.warn} fontSize={11} fontFamily={fonts.bodyBold}>
          objížďka
        </SvgText>
      </Svg>
    </View>
  );
}

export default function Route() {
  const params = useLocalSearchParams<{ from?: string; to?: string; depart?: string; travel?: string }>();
  const { cars, updateCar } = useCars();
  const ev = cars.find((c) => c.type === 'elektro' || c.type === 'hybrid');
  const [choice, setChoice] = useState<'objizdka' | 'd1'>('objizdka');
  const [range, setRange] = useState(ev?.rangeKm ?? 180);
  const base = Number(params.travel) || 112;
  const total = base + (choice === 'objizdka' ? DETOUR_EXTRA : JAM_EXTRA);
  const needCharge = range < SAMPLE_DISTANCE_KM + 15;
  const to = params.to || 'Brno';
  const from = params.from || 'Praha';

  const changeRange = (by: number) => {
    const next = Math.min(700, Math.max(60, range + by));
    setRange(next);
    if (ev) updateCar(ev.id, { rangeKm: next }, { reschedule: false });
  };

  return (
    <Screen>
      <BackHeader title={`${from} → ${to}`} subtitle={params.depart ? `Odjezd ${params.depart}` : undefined} />
      <MapSketch />

      <View style={styles.summary}>
        <Text style={styles.duration}>{fmtDuration(total)}</Text>
        <Text style={styles.small}>{choice === 'objizdka' ? 'objížďkou' : 'po dálnici s kolonou'}</Text>
      </View>

      <GlassCard tone="alert">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Icon name="alert" size={20} color={colors.alert} strokeWidth={2} />
          <Text style={[styles.text, { flex: 1 }]}>
            <Text style={{ fontFamily: fonts.bodyHeavy }}>Uzavírka na trase:</Text> oprava, jeden pruh. Kolona asi +{JAM_EXTRA} min. (ukázka)
          </Text>
        </View>
        <ChoiceGroup
          options={[
            { value: 'objizdka', label: `Objížďka +${DETOUR_EXTRA} min` },
            { value: 'd1', label: 'Zůstat na trase' },
          ]}
          value={choice}
          onChange={setChoice}
        />
      </GlassCard>

      <GlassCard>
        <View style={styles.evRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="bolt" size={18} color={colors.ok} strokeWidth={2} />
            <SectionLabel>Elektroauto · dojezd</SectionLabel>
          </View>
          <Stepper value={`${range} km`} label="dojezd" onMinus={() => changeRange(-20)} onPlus={() => changeRange(20)} />
        </View>
        <Text style={[styles.text, { color: needCharge ? colors.warn : colors.ok }]}>
          {needCharge
            ? 'Doporučíme zastávku na rychlonabíječce zhruba v polovině cesty, asi na 20 minut.'
            : `Dojedete bez nabíjení, v cíli zbude asi ${range - SAMPLE_DISTANCE_KM} km.`}
        </Text>
      </GlassCard>

      <SectionLabel>Spustit navigaci</SectionLabel>
      <PrimaryButton
        label="Google Mapy"
        icon="route"
        onPress={() =>
          Linking.openURL(
            `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=driving`,
          )
        }
      />
      <SecondaryButton label="Waze" onPress={() => Linking.openURL(`https://waze.com/ul?q=${encodeURIComponent(to)}&navigate=yes`)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(14,36,64,0.6)',
    borderWidth: 1,
    borderColor: colors.border,
    transform: [{ perspective: 700 }, { rotateX: '18deg' }],
  },
  summary: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  duration: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  small: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  text: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text },
  evRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
});
