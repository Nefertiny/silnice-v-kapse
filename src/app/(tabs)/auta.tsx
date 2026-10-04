import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Body, GlassCard, IconButton, Pill, Plate, PrimaryButton, SecondaryButton, Title } from '@/components/ui';
import { useCars } from '@/lib/cars';
import { carDeadlines, daysLabel } from '@/lib/dates';
import { colors, fonts } from '@/theme';

const SHORT = { vignette: 'Známka', stk: 'STK', insurance: 'Ručení' } as const;

export default function Fleet() {
  const { cars, premium, canAddCar, removeCar } = useCars();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const attention = cars.filter((c) => carDeadlines(c).some((d) => d.state === 'soon' || d.state === 'expired' || d.state === 'unknown')).length;

  return (
    <Screen tab>
      <View style={styles.header}>
        <Title>Vozový park</Title>
        {premium && <Pill label="Premium" tone="accent" />}
      </View>

      <View style={styles.stats}>
        <GlassCard style={styles.stat}>
          <Text style={styles.statValue}>{cars.length}</Text>
          <Text style={styles.small}>{cars.length === 1 ? 'auto hlídáme' : 'aut hlídáme'}</Text>
        </GlassCard>
        <GlassCard style={styles.stat} tone={attention ? 'warn' : undefined}>
          <Text style={[styles.statValue, attention ? { color: colors.warn } : null]}>{attention}</Text>
          <Text style={styles.small}>{attention > 1 && attention < 5 ? 'potřebují pozornost' : 'potřebuje pozornost'}</Text>
        </GlassCard>
      </View>

      {cars.map((car) => (
        <GlassCard key={car.id} style={{ gap: 10 }}>
          <View style={styles.carTop}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ověřit ${car.spz}`}
              style={styles.carInfo}
              onPress={() => router.push({ pathname: '/overeni', params: { carId: car.id } })}
            >
              <Plate spz={car.spz} size="s" />
              {car.name ? <Text style={styles.model}>{car.name}</Text> : null}
            </Pressable>
            <IconButton icon="trash" label={`Smazat ${car.spz}`} color={colors.muted} onPress={() => setConfirmId(car.id)} />
          </View>
          <View style={styles.pills}>
            {carDeadlines(car).map((d) => (
              <Pill
                key={d.kind}
                label={d.state === 'soon' ? `${SHORT[d.kind]} ${daysLabel(d.daysLeft!).toLowerCase()}` : d.state === 'expired' ? `${SHORT[d.kind]} propadla` : d.state === 'unknown' ? `${SHORT[d.kind]} ?` : SHORT[d.kind]}
                tone={d.state === 'soon' ? 'warn' : d.state === 'expired' ? 'alert' : d.state === 'unknown' ? 'neutral' : 'ok'}
              />
            ))}
          </View>
          {confirmId === car.id && (
            <View style={styles.confirm}>
              <SecondaryButton style={{ flex: 1 }} label="Nechat" onPress={() => setConfirmId(null)} />
              <PrimaryButton
                style={{ flex: 1, backgroundColor: colors.alert }}
                label="Smazat"
                onPress={() => {
                  removeCar(car.id);
                  setConfirmId(null);
                }}
              />
            </View>
          )}
        </GlassCard>
      ))}

      {canAddCar ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/pridat')} style={styles.add}>
          <Icon name="plus" size={20} color={colors.accent} strokeWidth={2} />
          <Text style={styles.addText}>{cars.length ? 'Přidat další auto' : 'Přidat auto'}</Text>
        </Pressable>
      ) : (
        <GlassCard tone="accent">
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Icon name="lock" size={20} color={colors.accent} />
            <Text style={styles.lockTitle}>Více aut s Premium</Text>
          </View>
          <Body muted>Bez předplatného hlídáme jedno auto. S Premium za 29 Kč měsíčně přidáte celý vozový park.</Body>
          <PrimaryButton label="Chci Premium" onPress={() => router.push('/premium')} />
        </GlassCard>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, gap: 2 },
  statValue: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  small: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  carTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  carInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minHeight: 44 },
  model: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  pills: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  confirm: { flexDirection: 'row', gap: 10 },
  add: {
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(56,225,255,0.6)',
    backgroundColor: 'rgba(56,225,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.accent },
  lockTitle: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.text },
});
