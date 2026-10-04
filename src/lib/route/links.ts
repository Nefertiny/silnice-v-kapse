import type { LonLat, PlannedRoute } from './mapy';

const lonLat = ([lon, lat]: LonLat) => `${lon},${lat}`;

/** Google Mapy dostanou názvy míst, jak je člověk napsal, a najdou si je samy. */
export function googleMapsUrl(from: string, to: string): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=driving`;
}

/** Otevře aplikaci Mapy.com (nebo web) rovnou s navigací po nalezené trase. */
export function mapyNavigationUrl(route: PlannedRoute): string {
  return `https://mapy.com/fnc/v1/route?mapset=traffic&start=${lonLat(route.from.position)}&end=${lonLat(route.to.position)}&routeType=car_fast_traffic&navigate=true`;
}

/** Waze umí jen cíl, mezizastávky neumí. */
export function wazeUrl(to: string, route?: PlannedRoute): string {
  if (!route) return `https://waze.com/ul?q=${encodeURIComponent(to)}&navigate=yes`;
  const [lon, lat] = route.to.position;
  return `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
}
