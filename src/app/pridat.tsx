import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { VIN_HELP, VinField } from '@/components/VinField';
import { BackHeader, Body, ChoiceGroup, GlassCard, PrimaryButton, SectionLabel } from '@/components/ui';
import { normalizeSpz, useCars } from '@/lib/cars';
import type { VehicleType } from '@/lib/types';
import { isValidVin } from '@/lib/vin';
import { colors, fonts } from '@/theme';

const TYPES: { value: VehicleType; label: string; sub: string }[] = [
  { value: 'osobni', label: 'Osobní', sub: 'benzín nebo nafta' },
  { value: 'elektro', label: 'Elektro', sub: 'hlídáme i nabíjení' },
  { value: 'hybrid', label: 'Hybrid', sub: 'plug-in i klasický' },
  { value: 'motorka', label: 'Motorka', sub: 'bez dálniční známky' },
];

function Check({ children }: { children: string }) {
  return (
    <View style={styles.check}>
      <Icon name="check" size={18} color={colors.ok} strokeWidth={2.4} />
      <Text style={styles.checkText}>{children}</Text>
    </View>
  );
}

export default function AddCar() {
  const { addCar, canAddCar } = useCars();
  const [spz, setSpz] = useState('');
  const [type, setType] = useState<VehicleType>('osobni');
  const [vin, setVin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const compact = normalizeSpz(spz).replace(/ /g, '');
  const vinOk = !vin || isValidVin(vin);
  const valid = /^[0-9A-Z]{5,8}$/.test(compact) && vinOk;

  const submit = () => {
    const result = addCar({ spz, type, ...(vin ? { vin } : {}) });
    if (!result.ok) {
      if (result.reason === 'limit') router.push('/premium');
      else setError('Tohle auto už hlídáme.');
      return;
    }
    router.replace({ pathname: '/overeni', params: { carId: result.car.id } });
  };

  return (
    <Screen>
      <BackHeader title="Přidejte své auto" />
      <Body muted>Stačí SPZ. Dálniční známku, STK a povinné ručení pak hlídáme za vás.</Body>

      <View style={{ gap: 8 }}>
        <SectionLabel>Registrační značka</SectionLabel>
        <View style={styles.plate}>
          <View style={styles.eu}>
            <Text style={styles.cz}>CZ</Text>
          </View>
          <TextInput
            accessibilityLabel="Registrační značka"
            value={spz}
            onChangeText={(t) => {
              setSpz(t.toUpperCase().slice(0, 9));
              setError(null);
            }}
            placeholder="1AB 2345"
            placeholderTextColor="rgba(11,18,32,0.35)"
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={9}
            style={styles.plateInput}
          />
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <View style={{ gap: 8 }}>
        <SectionLabel>Typ vozidla</SectionLabel>
        <ChoiceGroup options={TYPES} value={type} onChange={setType} />
      </View>

      <View style={{ gap: 8 }}>
        <SectionLabel>VIN (nepovinné)</SectionLabel>
        <VinField value={vin} onChange={setVin} />
        <Text style={styles.help}>{VIN_HELP} Když ho nezadáte, zkusíme ho najít sami.</Text>
      </View>

      <GlassCard>
        <SectionLabel>Co ověříme</SectionLabel>
        <Check>Dálniční známku podle SPZ</Check>
        <Check>Platnost technické kontroly (STK)</Check>
        <Check>Výročí povinného ručení, které zadáte ze smlouvy</Check>
      </GlassCard>

      <PrimaryButton label="Ověřit a začít hlídat" disabled={!valid} onPress={submit} />
      <Text style={styles.note}>
        {canAddCar ? 'Zdarma 1 auto. S Premium přidáte celý vozový park.' : 'Další auto přidáte s Premium za 29 Kč měsíčně.'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  plate: {
    flexDirection: 'row',
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.plate,
    borderWidth: 3,
    borderColor: colors.plateText,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  eu: { width: 34, backgroundColor: colors.plateEu, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8 },
  cz: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: '#FFFFFF' },
  plateInput: { flex: 1, paddingHorizontal: 16, fontFamily: fonts.bodyHeavy, fontSize: 32, letterSpacing: 4, color: colors.plateText },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.alert },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  help: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted },
  note: { textAlign: 'center', fontFamily: fonts.body, fontSize: 12, color: colors.muted },
});
