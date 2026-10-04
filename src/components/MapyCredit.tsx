import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { SvgUri } from 'react-native-svg';

import { colors, fonts } from '@/theme';

/** Mapy.com chtějí u výsledků hledání trasy svoje logo. */
export function MapyCredit() {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel="Trasa: Mapy.com" onPress={() => Linking.openURL('https://mapy.com/')} style={styles.row}>
      <Text style={styles.text}>Trasa:</Text>
      <SvgUri uri="https://api.mapy.com/img/api/logo.svg" height={14} width={64} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  text: { fontFamily: fonts.body, fontSize: 11, color: colors.faint },
});
