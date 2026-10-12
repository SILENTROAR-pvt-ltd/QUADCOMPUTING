// Where each listed destination is, so a phone can tell which one the member is nearest to. The matching
// runs on the device: the member's position is never sent to the server or to any other service.
export const PLACE_COORDS: Record<string, readonly [number, number]> = {
  goa: [15.5, 73.83], manali: [32.24, 77.19], 'old-manali': [32.26, 77.18], 'leh-ladakh': [34.15, 77.58],
  rishikesh: [30.09, 78.27], jaipur: [26.91, 75.79], udaipur: [24.58, 73.68], hampi: [15.34, 76.46],
  alleppey: [9.5, 76.34], varanasi: [25.32, 82.97], mumbai: [19.08, 72.88], ooty: [11.41, 76.7],
  'ha-long-bay': [20.91, 107.18], ubud: [-8.51, 115.26], 'chiang-mai': [18.79, 98.98], phuket: [7.88, 98.39],
  kyoto: [35.01, 135.77], santorini: [36.39, 25.46], paris: [48.86, 2.35], interlaken: [46.69, 7.86],
  lisbon: [38.72, -9.14], banff: [51.18, -115.57], 'new-york': [40.71, -74.01], marrakech: [31.63, -7.99],
  serengeti: [-2.33, 34.83], sydney: [-33.87, 151.21], queenstown: [-45.03, 168.66],
};

const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in kilometres. */
export function distanceKm(a: readonly [number, number], b: readonly [number, number]): number {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The listed destination closest to a position, if one is within `maxKm`; otherwise null. */
export function nearestPlace<T extends { slug: string }>(lat: number, lng: number, places: T[], maxKm = 120): { place: T; km: number } | null {
  let best: { place: T; km: number } | null = null;
  for (const place of places) {
    const at = PLACE_COORDS[place.slug];
    if (!at) continue;
    const km = distanceKm([lat, lng], at);
    if (km <= maxKm && (!best || km < best.km)) best = { place, km };
  }
  return best;
}
