import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { BackHeader, Body, GlassCard, Pill, PrimaryButton, SecondaryButton, SectionLabel } from '@/components/ui';
import { useCars } from '@/lib/cars';
import { daysLabel, daysUntil, formatCz } from '@/lib/dates';
import { formatKc, sampleOffers, type OfferKind } from '@/lib/offers';
import { colors, fonts } from '@/theme';

// Dokud nemáme cenu od partnera, počítáme s typickou cenou pro osobní auto.
const SAMPLE_CURRENT_PRICE = 4860;

export default function Insurance() {
  const { carId } = useLocalSearchParams<{ carId?: string }>();
  const { cars, getCar } = useCars();
  const car = getCar(carId) ?? cars[0];
  const [selected, setSelected] = useState<OfferKind>('cena');
  const [sent, setSent] = useState(false);
  const offers = sampleOffers(SAMPLE_CURRENT_PRICE);
  const chosen = offers.find((o) => o.kind === selected)!;

  return (
    <Screen>
      <BackHeader title="Povinné ručení" subtitle={car ? [car.name, car.spz].filter(Boolean).join(' · ') : undefined} />

      <GlassCard style={styles.current}>
        <View style={{ gap: 4, flex: 1 }}>
          <SectionLabel>Teď platíte (odhad)</SectionLabel>
          <Text style={styles.price}>
            {formatKc(SAMPLE_CURRENT_PRICE)}
            <Text style={styles.perYear}> / rok</Text>
          </Text>
          <Text style={styles.small}>
            {[car?.insurer ?? 'Pojišťovnu zatím nevíme', car?.insuranceUntil ? `výročí ${formatCz(car.insuranceUntil)}` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        {car?.insuranceUntil && <Pill label={daysLabel(daysUntil(car.insuranceUntil))} tone="warn" />}
      </GlassCard>

      {car && !car.insuranceUntil && (
        <SecondaryButton
          label="Doplnit pojišťovnu a výročí"
          onPress={() => router.push({ pathname: '/overeni', params: { carId: car.id } })}
        />
      )}

      <SectionLabel>Vyberte si variantu</SectionLabel>
      <View style={{ gap: 10 }}>
        {offers.map((o) => {
          const on = o.kind === selected;
          const diff = o.pricePerYear - SAMPLE_CURRENT_PRICE;
          return (
            <Pressable
              key={o.kind}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setSelected(o.kind)}
              style={[styles.offer, on && styles.offerOn]}
            >
              <View style={styles.offerTop}>
                <Text style={styles.tag}>{o.tag}</Text>
                <View style={[styles.radio, on && styles.radioOn]} />
              </View>
              <View style={styles.offerTop}>
                <Text style={styles.offerPrice}>
                  {formatKc(o.pricePerYear)}
                  <Text style={styles.perYear}> / rok</Text>
                </Text>
                <Pill label={diff < -50 ? `−${formatKc(-diff)}` : '+ výhody'} tone="ok" />
              </View>
              <Text style={styles.small}>
                {o.insurer} · {o.features}
              </Text>
              {o.sponsored && <Text style={styles.sponsored}>Placená nabídka partnera</Text>}
            </Pressable>
          );
        })}
      </View>

      {sent ? (
        <GlassCard tone="ok">
          <Text style={styles.cardTitle}>Díky, máme to</Text>
          <Body muted>Sjednání přes partnera spustíme po podpisu partnerské smlouvy. Do té doby jsou ceny jen ukázkové.</Body>
        </GlassCard>
      ) : (
        <PrimaryButton label={`Sjednat za 3 kliknutí · ${formatKc(chosen.pricePerYear)}`} onPress={() => setSent(true)} />
      )}
      <Text style={styles.note}>Ceny jsou zatím ukázkové. Skutečné nabídky dodá partnerský srovnávač podle vašeho auta.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  current: { flexDirection: 'row', alignItems: 'flex-end' },
  price: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  perYear: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted },
  small: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, lineHeight: 18 },
  offer: {
    borderRadius: 18,
    padding: 16,
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  offerOn: { borderColor: colors.accent, borderWidth: 1.5, backgroundColor: 'rgba(56,225,255,0.10)' },
  offerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tag: { fontFamily: fonts.bodyHeavy, fontSize: 12, letterSpacing: 0.6, color: colors.accent, textTransform: 'uppercase' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: 'rgba(140,170,220,0.5)' },
  radioOn: { borderWidth: 5, borderColor: colors.accent, backgroundColor: colors.onAccent },
  offerPrice: { fontFamily: fonts.display, fontSize: 21, color: colors.text },
  sponsored: {
    alignSelf: 'flex-start',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.muted,
    borderWidth: 1,
    borderColor: 'rgba(140,170,220,0.3)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cardTitle: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.text },
  note: { textAlign: 'center', fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted },
});
