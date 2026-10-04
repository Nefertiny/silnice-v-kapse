import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { nextAnniversary } from '@/lib/dates';
import { INSURERS, OTHER_INSURER } from '@/lib/insurers';
import type { Car } from '@/lib/types';
import { colors, fonts } from '@/theme';
import { DateStepper } from './DateStepper';
import { ChoiceGroup, SectionLabel } from './ui';

const OPTIONS = [...INSURERS, OTHER_INSURER].map((name) => ({ value: name, label: name }));

/**
 * Ruční zadání povinného ručení: pojišťovna tlačítkem a výročí smlouvy.
 * Výročí se opakuje každý rok, takže i datum z loňské smlouvy posuneme na nejbližší budoucí.
 */
export function InsuranceEditor({
  car,
  onSave,
  onCancel,
}: {
  car: Car;
  onSave: (patch: Pick<Car, 'insurer' | 'insuranceUntil'>) => void;
  onCancel: () => void;
}) {
  const [insurer, setInsurer] = useState(car.insurer ?? '');
  return (
    <DateStepper
      title="Povinné ručení"
      initial={car.insuranceUntil}
      onCancel={onCancel}
      onSave={(iso) => onSave({ insurer: insurer || undefined, insuranceUntil: nextAnniversary(iso) })}
    >
      <Text style={styles.help}>Pojišťovnu a výročí smlouvy najdete na smlouvě nebo na zelené kartě.</Text>
      <SectionLabel>Pojišťovna</SectionLabel>
      <ChoiceGroup options={OPTIONS} value={insurer} onChange={setInsurer} />
      <SectionLabel>Výročí smlouvy</SectionLabel>
    </DateStepper>
  );
}

const styles = StyleSheet.create({
  help: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
});
