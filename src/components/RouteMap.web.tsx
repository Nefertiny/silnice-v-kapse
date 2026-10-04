import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { routeMapHtml } from '@/lib/route/mapHtml';
import type { PlannedRoute } from '@/lib/route/mapy';
import { MapFrame, mapColors, useMapState } from './RouteMapFrame';

// Na webu není WebView, stejnou stránku s mapou ukážeme v rámečku.
export function RouteMap({ route }: { route: PlannedRoute }) {
  const html = useMemo(() => routeMapHtml(route, mapColors()), [route]);
  const [state, report] = useMapState(html);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data && typeof e.data === 'object' && 'sivkMap' in e.data) report(e.data.sivkMap);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [report]);
  return (
    <MapFrame state={state}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <iframe title="Mapa s trasou" srcDoc={html} style={{ border: 0, width: '100%', height: '100%' }} />
      </View>
    </MapFrame>
  );
}
