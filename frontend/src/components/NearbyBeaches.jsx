import { useState, useEffect } from 'react'
import { haversineKm, dotColor, scoreColor } from '../utils'
import { useT } from '../i18n/LangContext'

export default function NearbyBeaches({ beaches, allConditions, onSelect }) {
  const t = useT()
  const [nearby, setNearby] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation || beaches.length === 0) return
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        const sorted = beaches
          .map(b => ({ ...b, distanceKm: haversineKm(latitude, longitude, b.lat, b.lon) }))
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, 4)
        setNearby(sorted)
      },
      () => {},
      { timeout: 8000 },
    )
  }, [beaches])

  if (!nearby) return null

  return (
    <section className="mt-4">
      <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
        {t('nearby.title')}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {nearby.map(beach => {
          const cond  = allConditions[beach.id]
          const score = cond?.surf_score
          return (
            <button
              key={beach.id}
              onClick={() => onSelect(beach.id)}
              className="bg-white/10 hover:bg-white/15 active:bg-white/20 rounded-xl p-3 text-left transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor(score) }} />
                  <span className="text-white/40 text-xs">
                    {beach.distanceKm < 1
                      ? `${(beach.distanceKm * 1000).toFixed(0)}m`
                      : `${beach.distanceKm.toFixed(1)} km`}
                  </span>
                </div>
                {score != null && (
                  <span className="text-xs font-bold tabular-nums" style={{ color: scoreColor(score) }}>
                    {score}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-white leading-tight truncate">{beach.name}</p>
              {score != null && (
                <p className="text-xs mt-0.5 text-white/35">{cond.score_label}</p>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
