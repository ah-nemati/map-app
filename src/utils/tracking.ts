export type LatLng = [number, number];

export interface RouteStats {
  speed: number;
  distance: number;
  totalDistance: number;
  percent: number;
  eta: string;
  elapsedSeconds: number;
  heading: number;
  currentPointIndex: number;
}

export function geoToLatLng(points: number[][]): LatLng[] {
  return points.map(([lng, lat]) => [lat, lng]);
}

/**
 * Calculates distance between two LatLng points in meters using Haversine formula
 */
export function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000; // Earth radius in meters
  const p1 = (a[0] * Math.PI) / 180;
  const p2 = (b[0] * Math.PI) / 180;
  const dp = ((b[0] - a[0]) * Math.PI) / 180;
  const dl = ((b[1] - a[1]) * Math.PI) / 180;
  const x =
    Math.sin(dp / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Calculates compass heading/bearing from point A to point B in degrees (0-360)
 */
export function bearing(a: LatLng, b: LatLng): number {
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Calculates a smooth lookahead bearing along the route polyline.
 * Looking ahead by target meters (e.g. 35m) eliminates micro-jitter and anticipates turns.
 */
export function calculateLookaheadBearing(
  route: LatLng[],
  currentIndex: number,
  progress: number,
  targetLookaheadMeters = 35
): number {
  if (route.length < 2) return 0;

  const safeIdx = Math.min(currentIndex, route.length - 2);
  const p1 = route[safeIdx];
  const p2 = route[safeIdx + 1];
  const currentPos = interpolate(p1, p2, progress);

  let accumulatedDist = haversine(currentPos, p2);
  let lookaheadIdx = safeIdx + 1;

  while (
    accumulatedDist < targetLookaheadMeters &&
    lookaheadIdx < route.length - 1
  ) {
    const nextDist = haversine(route[lookaheadIdx], route[lookaheadIdx + 1]);
    accumulatedDist += nextDist;
    lookaheadIdx++;
  }

  const lookaheadPoint = route[Math.min(lookaheadIdx, route.length - 1)];
  const directDist = haversine(currentPos, lookaheadPoint);

  if (directDist < 1) {
    if (safeIdx > 0) {
      return bearing(route[safeIdx - 1], route[safeIdx]);
    }
    return bearing(p1, p2);
  }

  return bearing(currentPos, lookaheadPoint);
}

/**
 * Computes shortest angular difference between two angles in range [-180, +180].
 * Prevents 360-degree wrap-around spinning.
 */
export function getShortestAngleDelta(currentAngle: number, targetAngle: number): number {
  const normalizedCurrent = ((currentAngle % 360) + 360) % 360;
  const normalizedTarget = ((targetAngle % 360) + 360) % 360;
  let diff = normalizedTarget - normalizedCurrent;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

/**
 * Frame-rate independent exponential smoothing for angles using shortest path.
 */
export function smoothAngle(
  currentContinuousAngle: number,
  targetAngle: number,
  deltaSec: number,
  speed = 6
): number {
  const delta = getShortestAngleDelta(currentContinuousAngle, targetAngle);
  // Deadband filter for tiny micro-jitters
  if (Math.abs(delta) < 0.15) return currentContinuousAngle;
  const factor = 1 - Math.exp(-speed * deltaSec);
  return currentContinuousAngle + delta * factor;
}

/**
 * Returns Persian name for compass heading
 */
export function getCompassDirectionFa(heading: number): string {
  const normalized = ((heading % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return "شمال";
  if (normalized >= 22.5 && normalized < 67.5) return "شمال‌شرق";
  if (normalized >= 67.5 && normalized < 112.5) return "شرق";
  if (normalized >= 112.5 && normalized < 157.5) return "جنوب‌شرق";
  if (normalized >= 157.5 && normalized < 202.5) return "جنوب";
  if (normalized >= 202.5 && normalized < 247.5) return "جنوب‌غرب";
  if (normalized >= 247.5 && normalized < 292.5) return "غرب";
  return "شمال‌غرب";
}

/**
 * Interpolates between two points given progress t (0 <= t <= 1)
 */
export function interpolate(a: LatLng, b: LatLng, t: number): LatLng {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * Calculates total road distance of a route in kilometers
 */
export function calculateTotalDistance(route: LatLng[]): number {
  if (route.length < 2) return 0;
  let totalMeters = 0;
  for (let i = 0; i < route.length - 1; i++) {
    totalMeters += haversine(route[i], route[i + 1]);
  }
  return Number((totalMeters / 1000).toFixed(1));
}

/**
 * Computes bounding box for a set of coordinates [[minLat, minLng], [maxLat, maxLng]]
 */
export function getRouteBounds(route: LatLng[]): [[number, number], [number, number]] {
  if (!route.length) {
    return [
      [27, 51],
      [36, 57],
    ];
  }
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const [lat, lng] of route) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  // Add padding
  const latPad = (maxLat - minLat) * 0.05 || 0.1;
  const lngPad = (maxLng - minLng) * 0.05 || 0.1;

  return [
    [minLat - latPad, minLng - lngPad],
    [maxLat + latPad, maxLng + lngPad],
  ];
}

export {
  toPersianDigits,
  formatPersianNumber,
  formatPersianDate,
  formatPersianDateTime,
  formatPersianTime,
  formatDurationFa,
} from "./persian";

