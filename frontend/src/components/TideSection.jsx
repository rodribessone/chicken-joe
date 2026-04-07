import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useT } from '../i18n/LangContext'

export default function TideSection({ beachId }) {
  const t = useT()
  const [tides, setTides]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getTides(beachId)
      .then(setTides)
      .catch(() => setTides(null))
      .finally(() => setLoading(false))
  }, [beachId])

  if (loading) return <TideSkeleton />
  if (!tides || tides.events.length === 0) return null

  const nowMs     = Date.now()
  const nextIndex = tides.events.findIndex(e => new Date(e.time_iso).getTime() > nowMs)

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">
          {t('tides.title')}
        </h3>
        <span className="text-xs text-white/25 italic">{t('tides.approximate')}</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {tides.events.map((event, i) => {
          const isNext = i === nextIndex
          const isPast = nextIndex !== -1 ? i < nextIndex : true
          const isHigh = event.type === 'high'

          return (
            <div
              key={i}
              className={`
                rounded-xl p-3 text-center transition-all
                ${isNext ? 'bg-seafoam/20 border border-seafoam/40' : 'bg-white/5 border border-white/10'}
                ${isPast ? 'opacity-40' : ''}
              `}
            >
              <div className={`text-lg leading-none mb-1 ${isNext ? 'text-seafoam' : 'text-white/50'}`}>
                {isHigh ? '↑' : '↓'}
              </div>
              <p className={`text-sm font-bold tabular-nums ${isNext ? 'text-white' : 'text-white/70'}`}>
                {event.time}
              </p>
              <p className={`text-xs mt-0.5 ${isNext ? 'text-seafoam' : 'text-white/40'}`}>
                {event.height_m}m
              </p>
              <p className={`text-xs mt-0.5 font-medium ${isNext ? 'text-seafoam/80' : 'text-white/30'}`}>
                {isHigh ? t('tides.high') : t('tides.low')}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function TideSkeleton() {
  return (
    <div className="mt-4">
      <div className="h-3 w-24 bg-white/10 rounded mb-2 animate-pulse" />
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white/10 rounded-xl animate-pulse" />)}
      </div>
    </div>
  )
}
