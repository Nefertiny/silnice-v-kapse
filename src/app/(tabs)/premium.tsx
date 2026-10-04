import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { GlassCard, PrimaryButton, SecondaryButton, SectionLabel, Title } from '@/components/ui';
import { useCars } from '@/lib/cars';
import { colors, fonts } from '@/theme';

const PERKS = [
  { title: 'Bez reklam', sub: 'čistá aplikace bez bannerů' },
  { title: 'Vozový park', sub: 'neomezený počet aut' },
  { title: 'AI rádce bez omezení', sub: 'plánování jízd dopředu a objížďky' },
  { title: 'Nabíjení na trase', sub: 'pro elektroauta podle dojezdu' },
  { title: 'Upozornění s předstihem', sub: 'STK, známka i ručení měsíc předem' },
];

export default function Premium() {
  const { premium, setPremium } = useCars();
  return (
    <Screen tab>
      <Title>Premium</Title>

      <GlassCard tone="accent" style={styles.hero}>
        <SectionLabel>Silnice v kapse Premium</SectionLabel>
        <Text style={styles.price}>
          29 Kč<Text style={styles.per}> / měsíc</Text>
        </Text>
        <Text style={styles.small}>V eurozóně 1 € měsíčně</Text>
      </GlassCard>

      <View style={{ gap: 8 }}>
        {PERKS.map((p) => (
          <View key={p.title} style={styles.perk}>
            <Icon name="check" size={20} color={colors.accent} strokeWidth={2.4} />
            <View style={{ gap: 1, flex: 1 }}>
              <Text style={styles.perkTitle}>{p.title}</Text>
              <Text style={styles.small}>{p.sub}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.note}>Zdarma: 1 auto, hlídání termínů a plánování jízd s reklamou.</Text>

      {premium ? (
        <>
          <GlassCard tone="ok">
            <Text style={styles.perkTitle}>Premium máte aktivní</Text>
          </GlassCard>
          <SecondaryButton label="Vypnout (zkušební režim)" onPress={() => setPremium(false)} />
        </>
      ) : (
        <PrimaryButton label="Předplatit za 29 Kč měsíčně" onPress={() => setPremium(true)} />
      )}
      <Text style={styles.note}>
        Zkušební verze: tlačítko zatím jen zapne Premium v telefonu. Placení přes Google Play a App Store doplníme před vydáním.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 6 },
  price: { fontFamily: fonts.display, fontSize: 44, color: colors.accent },
  per: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  small: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  perkTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  note: { textAlign: 'center', fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted },
});
