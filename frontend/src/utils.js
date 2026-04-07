const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']

export function degreesToCompass(deg) {
  return COMPASS[Math.round(deg / 22.5) % 16]
}

export function scoreColor(score) {
  if (score < 3) return '#ef4444'
  if (score < 5) return '#f97316'
  if (score < 7) return '#eab308'
  if (score < 9) return '#22c55e'
  return '#4dcfaa'
}

export function scoreBg(score) {
  if (score < 3) return 'rgba(239,68,68,0.12)'
  if (score < 5) return 'rgba(249,115,22,0.12)'
  if (score < 7) return 'rgba(234,179,8,0.12)'
  if (score < 9) return 'rgba(34,197,94,0.12)'
  return 'rgba(77,207,170,0.12)'
}

export function dotColor(score) {
  if (score == null) return '#4b5563'
  if (score < 3) return '#ef4444'
  if (score < 5) return '#f97316'
  if (score < 7) return '#eab308'
  return '#22c55e'
}

/**
 * Returns a translation key (e.g. 'wave.head_high').
 * Use as: t(waveHeightLabel(height_m))
 */
export function waveHeightLabel(m) {
  if (m < 0.2) return 'wave.flat'
  if (m < 0.5) return 'wave.ankle_knee'
  if (m < 0.9) return 'wave.knee_waist'
  if (m < 1.4) return 'wave.waist_chest'
  if (m < 2.0) return 'wave.head_high'
  if (m < 2.5) return 'wave.overhead'
  if (m < 3.5) return 'wave.double_overhead'
  return 'wave.xxl'
}

export function timeAgo(isoString) {
  const secs = Math.floor((Date.now() - new Date(isoString)) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
