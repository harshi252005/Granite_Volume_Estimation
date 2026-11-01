export function formatGpsString(gps) {
  if (!gps) return '—';
  if (typeof gps === 'string') return gps;
  if (gps.lat !== undefined) return `${Number(gps.lat).toFixed(5)}° N, ${Number(gps.lng).toFixed(5)}° E`;
  return String(gps);
}
