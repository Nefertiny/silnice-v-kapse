import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { MapyCredit } from '@/components/MapyCredit';
import { RouteMap } from '@/components/RouteMap';
import { Screen } from '@/components/Screen';
import { BackHeader, GlassCard, PrimaryButton, SecondaryButton, SectionLabel, Stepper } from '@/components/ui';
import { useCars } from '@/lib/cars';
import { googleMapsUrl, mapyNavigationUrl, wazeUrl } from '@/lib/route/links';
import { useRoutePlan } from '@/lib/route/useRoutePlan';
import { fmtDuration } from '@/lib/trips';
import { colors, fonts } from '@/theme';

// Rezerva dojezdu, se kterou ještě nechceme do cíle dojet „na doraz“.
const RANGE_RESERVE_KM = 15;

export default function Route() {
  const params = useLocalSearchParams<{ from?: string; to?: string; depart?: string; travel?: string }>();
  const { cars, updateCar } = useCars();
  const ev = cars.find((c) => c.type === 'elektro' || c.type === 'hybrid');
  const [range, setRange] = useState(ev?.rangeKm ?? 180);
  const to = params.to || 'Brno';
  const from = params.from || 'Praha';
  const plan = useRoutePlan(from, to);
  const route = plan.status === 'ready' ? plan.route : undefined;
  const travel = Number(params.travel) || route?.minutes;

  const changeRange = (by: number) => {
    const next = Math.min(700, Math.max(60, range + by));
    setRange(next);
    if (ev) updateCar(ev.id, { rangeKm: next }, { reschedule: false });
  };

  return (
    <Screen>
      <BackHeader title={`${from} → ${to}`} subtitle={params.depart ? `Odjezd ${params.depart}` : undefined} />

      {route ? (
        <RouteMap route={route} />
      ) : (
        <GlassCard style={styles.placeholder}>
          {plan.status === 'loading' ? <ActivityIndicator color={colors.accent} /> : <Icon name="route" size={22} color={colors.muted} strokeWidth={2} />}
          <Text style={styles.small}>
            {plan.status === 'loading' ? 'Hledám trasu…' : plan.status === 'error' ? plan.message : 'Mapa a skutečná trasa zatím nejsou zapnuté.'}
          </Text>
        </GlassCard>
      )}

      {(travel || route) && (
        <View style={styles.summary}>
          {travel ? <Text style={styles.duration}>{fmtDuration(travel)}</Text> : null}
          {route && <Text style={styles.small}>{route.lengthKm} km</Text>}
        </View>
      )}
      {route && <MapyCredit />}

      <GlassCard>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Icon name="alert" size={20} color={colors.muted} strokeWidth={2} />
          <Text style={[styles.text, { flex: 1 }]}>
            <Text style={{ fontFamily: fonts.bodyHeavy }}>Uzavírky na trase</Text> brzy ukážeme z dat ŘSD i s objížďkou. Do té doby vás kolem uzavírek a kolon provede navigace.
          </Text>
        </View>
      </GlassCard>

      <GlassCard>
        <View style={styles.evRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="bolt" size={18} color={colors.ok} strokeWidth={2} />
            <SectionLabel>Elektroauto · dojezd</SectionLabel>
          </View>
          <Stepper value={`${range} km`} label="dojezd" onMinus={() => changeRange(-20)} onPlus={() => changeRange(20)} />
        </View>
        {route ? (
          <Text style={[styles.text, { color: range < route.lengthKm + RANGE_RESERVE_KM ? colors.warn : colors.ok }]}>
            {range < route.lengthKm + RANGE_RESERVE_KM
              ? `Trasa má ${route.lengthKm} km, cestou budete nabíjet. Počítejte se zastávkou na rychlonabíječce zhruba na 20 minut.`
              : `Dojedete bez nabíjení, v cíli zbude asi ${range - route.lengthKm} km.`}
          </Text>
        ) : (
          <Text style={[styles.text, { color: colors.muted }]}>Až bude trasa, spočítáme, jestli dojedete bez nabíjení.</Text>
        )}
      </GlassCard>

      <SectionLabel>Spustit navigaci</SectionLabel>
      <PrimaryButton label="Google Mapy" icon="route" onPress={() => Linking.openURL(googleMapsUrl(from, to))} />
      {route && <SecondaryButton label="Mapy.com" onPress={() => Linking.openURL(mapyNavigationUrl(route))} />}
      <SecondaryButton label="Waze" onPress={() => Linking.openURL(wazeUrl(to, route))} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  placeholder: { height: 220, alignItems: 'center', justifyContent: 'center', gap: 10 },
  summary: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  duration: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  small: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center' },
  text: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text },
  evRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
});
