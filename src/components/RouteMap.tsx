import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { routeMapHtml } from '@/lib/route/mapHtml';
import type { PlannedRoute } from '@/lib/route/mapy';
import { colors } from '@/theme';
import { MapFrame, mapColors, useMapState } from './RouteMapFrame';

export function RouteMap({ route }: { route: PlannedRoute }) {
  const html = useMemo(() => routeMapHtml(route, mapColors()), [route]);
  const [state, report] = useMapState(html);
  return (
    <MapFrame state={state}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <WebView
          originWhitelist={['*']}
          // Stránka potřebuje skutečný původ (https), jinak některé telefony nepustí MapLibre jeho pomocná vlákna.
          source={{ html, baseUrl: 'https://silnice-v-kapse.app/' }}
          onMessage={(e) => report(e.nativeEvent.data)}
          scrollEnabled={false}
          setSupportMultipleWindows={false}
          style={styles.web}
        />
      </View>
    </MapFrame>
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: colors.surfaceSolid },
});
