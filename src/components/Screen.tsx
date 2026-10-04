import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, TAB_BAR_SPACE } from '@/theme';
import { RoadBackground } from './RoadBackground';

/** Obrazovka s 3D pozadím, bezpečnými okraji a posouváním. */
export function Screen({ children, tab, footer }: { children: ReactNode; tab?: boolean; footer?: ReactNode }) {
  return (
    <View style={styles.root}>
      <RoadBackground />
      <SafeAreaView style={styles.flex} edges={tab ? ['top'] : ['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: tab ? TAB_BAR_SPACE + 16 : 24 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer && <View style={styles.footer}>{footer}</View>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, gap: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  footer: { paddingHorizontal: 20, paddingBottom: 12, gap: 8, width: '100%', maxWidth: 560, alignSelf: 'center' },
});
