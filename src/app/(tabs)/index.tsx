import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { DEADLINE_ICON, deadlineLook } from '@/components/deadlineUi';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { AdBanner, Body, ChoiceGroup, GlassCard, IconButton, Plate, PrimaryButton, SecondaryButton, SectionLabel, StatusRow, Title } from '@/components/ui';
import { useCars } from '@/lib/cars';
import { carDeadlines, okCount } from '@/lib/dates';
import { colors, fonts } from '@/theme';

function Logo() {
  return (
    <View style={styles.logoRow}>
      <View style={styles.logo}>
        <Icon name="route" size={18} color={colors.accent} strokeWidth={2} />
      </View>
      <Text style={styles.brand}>Silnice v kapse</Text>
    </View>
  );
}

function Ring({ value, total }: { value: number; total: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <View style={styles.ring}>
      <Svg width={78} height={78} style={StyleSheet.absoluteFill}>
        <Circle cx={39} cy={39} r={r} stroke="rgba(140,170,220,0.18)" strokeWidth={7} fill="none" />
        <Circle
          cx={39}
          cy={39}
          r={r}
          stroke={colors.accent}
          strokeWidth={7}
          fill="none"
          strokeDasharray={`${(c * value) / total} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 39 39)"
        />
      </Svg>
      <Text style={styles.ringValue}>
        {value}/{total}
      </Text>
      <Text style={styles.ringLabel}>v pořádku</Text>
    </View>
  );
}

export default function Home() {
  const { ready, cars, premium } = useCars();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!ready) return <Screen tab>{null}</Screen>;

  if (cars.length === 0) {
    return (
      <Screen tab>
        <Logo />
        <View style={{ height: 40 }} />
        <Title>Hlídáme vaše auto i cestu</Title>
        <Body muted>
          Zadejte SPZ a my pohlídáme dálniční známku, STK a povinné ručení. Před cestou poradíme, kdy vyrazit, abyste nestáli v koloně.
        </Body>
        <PrimaryButton label="Přidat auto" icon="plus" onPress={() => router.push('/pridat')} />
        <SecondaryButton label="Kdy vyrazit?" icon="route" onPress={() => router.push('/jizda')} />
      </Screen>
    );
  }

  const car = cars.find((c) => c.id === selectedId) ?? cars[0];
  const deadlines = carDeadlines(car);
  const goVerify = () => router.push({ pathname: '/overeni', params: { carId: car.id } });

  return (
    <Screen tab>
      <View style={styles.header}>
        <Logo />
        <IconButton icon="bell" label="Upozornění" onPress={() => router.push('/auta')} />
      </View>

      {cars.length > 1 && (
        <ChoiceGroup
          columns={3}
          options={cars.map((c) => ({ value: c.id, label: c.spz }))}
          value={car.id}
          onChange={setSelectedId}
        />
      )}

      <GlassCard style={styles.carCard}>
        <View style={{ gap: 10, flex: 1 }}>
          <Plate spz={car.spz} />
          {car.name ? <Text style={styles.carName}>{car.name}</Text> : null}
          <Text style={styles.small}>{okCount(car)} ze 3 věcí v pořádku</Text>
        </View>
        <Ring value={okCount(car)} total={3} />
      </GlassCard>

      <View style={{ gap: 10 }}>
        <SectionLabel>Hlídáme za vás</SectionLabel>
        {deadlines.map((d) => {
          const look = deadlineLook(d, d.kind === 'insurance' ? car.insurer : undefined);
          const isInsurance = d.kind === 'insurance';
          const pill = isInsurance && d.state === 'ok' ? { label: 'Ušetřit', tone: 'solid' as const } : look.pill;
          return (
            <StatusRow
              key={d.kind}
              icon={DEADLINE_ICON[d.kind]}
              title={d.title}
              subtitle={look.subtitle}
              tone={look.tone}
              pill={pill}
              onPress={isInsurance ? () => router.push({ pathname: '/ruceni', params: { carId: car.id } }) : goVerify}
            />
          );
        })}
      </View>

      <View style={styles.actions}>
        <PrimaryButton style={{ flex: 1 }} label="Kdy vyrazit?" icon="route" onPress={() => router.push('/jizda')} />
        <SecondaryButton style={{ flex: 1 }} label="Přidat auto" icon="plus" onPress={() => router.push('/pridat')} />
      </View>

      {!premium && <AdBanner onHide={() => router.push('/premium')} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { fontFamily: fonts.display, fontSize: 15, color: colors.text },
  carCard: { flexDirection: 'row', alignItems: 'center' },
  carName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  small: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  ring: { width: 78, height: 78, alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontFamily: fonts.display, fontSize: 17, color: colors.text },
  ringLabel: { fontFamily: fonts.body, fontSize: 9, color: colors.muted },
  actions: { flexDirection: 'row', gap: 10 },
});
