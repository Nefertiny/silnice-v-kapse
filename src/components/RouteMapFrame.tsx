import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

// Společné části mapy pro telefon (RouteMap.tsx) i web (RouteMap.web.tsx).
export type MapState = 'loading' | 'ready' | 'error';

/** Ať se mapa nenačte z jakéhokoli důvodu, po této době ukážeme hlášku místo prázdného rámečku. */
const MAP_TIMEOUT_MS = 20000;

export function mapColors() {
  return { line: colors.accent, start: colors.accent, end: colors.warn, ground: colors.surfaceSolid };
}

export function useMapState(html: string) {
  const [state, setState] = useState<{ html: string; value: MapState }>({ html, value: 'loading' });
  const current = state.html === html ? state.value : 'loading';
  useEffect(() => {
    const t = setTimeout(() => setState((s) => (s.html === html && s.value !== 'loading' ? s : { html, value: 'error' })), MAP_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [html]);
  const report = useCallback(
    (m: unknown) => {
      if (m === 'ready' || m === 'error') setState((s) => (s.html === html && s.value !== 'loading' ? s : { html, value: m }));
    },
    [html],
  );
  return [current, report] as const;
}

export function MapFrame({ state, children }: { state: MapState; children: ReactNode }) {
  return (
    <View style={styles.frame} accessibilityLabel="Mapa s trasou">
      {children}
      {state !== 'ready' && (
        <View style={styles.overlay}>
          {state === 'loading' ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.note}>Mapu se nepodařilo načíst.</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSolid },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
});
