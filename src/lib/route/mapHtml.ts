import type { PlannedRoute } from './mapy';

// Mapu kreslí MapLibre ve WebView, podklad je OpenFreeMap (zdarma i pro komerční použití, bez klíče).
// Verze 5 má jeden soubor pro prohlížeč, verze 6 už jen moduly.
const MAPLIBRE = 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl';
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

/** JSON vložený do <script> nesmí obsahovat „</script>“ z názvů míst. */
function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/** Stránka s mapou trasy. Zpět do appky pošle „ready“, nebo „error“, když se mapa nenačte. */
export function routeMapHtml(route: PlannedRoute, colors: { line: string; start: string; end: string; ground: string }): string {
  const data = {
    line: route.line,
    start: route.from.position,
    end: route.to.position,
    colors,
    style: MAP_STYLE_URL,
  };
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="${MAPLIBRE}.css">
<style>
  html,body,#map{margin:0;height:100%;background:${colors.ground}}
  .pin{width:14px;height:14px;border-radius:50%;box-sizing:border-box}
  .maplibregl-ctrl-attrib{font:10px sans-serif}
</style>
</head><body>
<div id="map"></div>
<script>
  var D = ${safeJson(data)};
  var sent = false;
  function send(m) {
    if (sent) return;
    sent = true;
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(m);
    else if (window.parent !== window) window.parent.postMessage({ sivkMap: m }, '*');
  }
  function fail() { send('error'); }
  window.onerror = fail;
</script>
<script src="${MAPLIBRE}.js" onerror="fail()"></script>
<script>
  (function () {
    if (!window.maplibregl) return fail();
    try {
      var bounds = D.line.reduce(function (b, p) { return b.extend(p); }, new maplibregl.LngLatBounds(D.line[0], D.line[0]));
      var map = new maplibregl.Map({
        container: 'map',
        style: D.style,
        bounds: bounds,
        fitBoundsOptions: { padding: 36 },
        pitch: 30,
        interactive: false,
        attributionControl: { compact: true },
      });
      map.on('load', function () {
        map.addSource('route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: D.line } } });
        map.addLayer({ id: 'route-glow', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': D.colors.line, 'line-width': 12, 'line-opacity': 0.25, 'line-blur': 4 } });
        map.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': D.colors.line, 'line-width': 4 } });
        [[D.start, 'border:3px solid ' + D.colors.start + ';background:' + D.colors.ground], [D.end, 'background:' + D.colors.end]].forEach(function (p) {
          var el = document.createElement('div');
          el.className = 'pin';
          el.style.cssText = p[1];
          new maplibregl.Marker({ element: el }).setLngLat(p[0]).addTo(map);
        });
        map.once('idle', function () { send('ready'); });
      });
    } catch (e) { fail(); }
  })();
</script>
</body></html>`;
}
