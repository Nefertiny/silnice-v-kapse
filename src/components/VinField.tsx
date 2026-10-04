import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { isValidVin, normalizeVin, VIN_LENGTH, vinHint } from '@/lib/vin';
import { colors, fonts } from '@/theme';
import { GlassCard, PrimaryButton, SecondaryButton } from './ui';

export const VIN_HELP = 'Najdete ho v malém technickém průkazu v kolonce E nebo dole za čelním sklem.';

/** Pole pro VIN s počítadlem znaků. Hodnotu rovnou čistí (velká písmena, bez mezer). */
export function VinField({ value, onChange, autoFocus }: { value: string; onChange: (vin: string) => void; autoFocus?: boolean }) {
  const hint = vinHint(value);
  const complete = isValidVin(value);
  return (
    <View style={{ gap: 6 }}>
      <View style={[styles.box, complete && { borderColor: 'rgba(61,220,151,0.6)' }]}>
        <TextInput
          accessibilityLabel="VIN"
          value={value}
          onChangeText={(t) => onChange(normalizeVin(t))}
          placeholder="17 znaků"
          placeholderTextColor={colors.faint}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          autoFocus={autoFocus}
          maxLength={VIN_LENGTH + 4}
          style={styles.input}
        />
        <Text style={[styles.count, complete && { color: colors.ok }]}>
          {value.length}/{VIN_LENGTH}
        </Text>
      </View>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

/** Karta pro doplnění nebo opravu VIN. Prázdná hodnota VIN smaže. */
export function VinEditor({ initial, onSave, onCancel }: { initial?: string; onSave: (vin: string | undefined) => void; onCancel: () => void }) {
  const [vin, setVin] = useState(initial ?? '');
  const canSave = isValidVin(vin) || (!vin && !!initial);
  return (
    <GlassCard tone="accent">
      <Text style={styles.title}>VIN vozidla</Text>
      <Text style={styles.help}>{VIN_HELP} Podle VIN ověříme STK, i když ji jinde nenajdeme.</Text>
      <VinField value={vin} onChange={setVin} autoFocus />
      <View style={styles.row}>
        <SecondaryButton style={{ flex: 1 }} label="Zrušit" onPress={onCancel} />
        <PrimaryButton style={{ flex: 1 }} label={!vin && initial ? 'Smazat' : 'Uložit'} disabled={!canSave} onPress={() => onSave(vin || undefined)} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSolid,
    paddingLeft: 16,
    paddingRight: 14,
    gap: 10,
  },
  input: { flex: 1, minWidth: 0, fontFamily: fonts.bodyHeavy, fontSize: 18, letterSpacing: 1.5, color: colors.text, outlineWidth: 0 },
  count: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.faint },
  hint: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.warn },
  title: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.text },
  help: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
  row: { flexDirection: 'row', gap: 10 },
});
