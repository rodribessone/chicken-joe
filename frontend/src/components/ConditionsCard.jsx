import { useState } from 'react'
import { scoreColor, scoreBg, degreesToCompass, waveHeightLabel, timeAgo } from '../utils'
import { useT } from '../i18n/LangContext'
import { useAuth } from '../auth/AuthContext'
import { SCORE_LABEL_KEY } from '../i18n/translations'

export default function ConditionsCard({ conditions, loading, onRefresh, onFlagBeach, trend }) {
  const t = useT()
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)

  if (loading) return <SkeletonCard />
  if (!conditions) return null

  const { wave, wind, water_temp_c, surf_score, score_label, fetched_at, beach_name, is_community, webcam_url } = conditions

  const handleShare = async () => {
    const emoji = surf_score >= 8 ? '🤙' : surf_score >= 6 ? '🏄' : surf_score >= 4 ? '👌' : '😐'
    const text = `${beach_name} — ${surf_score}/10 ${score_label} ${emoji}\n${wave.height_m}m waves · ${wave.period_s}s · ${wind.label}\nvia Chicken Joe`
    if (navigator.share) {
      await navigator.share({ title: `Chicken Joe — ${beach_name}`, text }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(text).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  const color = scoreColor(surf_score)
  const bg    = scoreBg(surf_score)

  return (
    <div className="bg-navy-light rounded-2xl p-5 shadow-xl">
      {/* Top row */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <h2 className="text-xl font-bold leading-tight">{beach_name}</h2>
          <p className="text-white/40 text-xs mt-0.5">{t('conditions.updated')} {timeAgo(fetched_at)}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleShare}
            title="Share conditions"
            className="text-white/30 hover:text-seafoam transition-colors p-1 mt-0.5 relative"
          >
            {copied
              ? <span className="text-seafoam text-xs font-bold px-1">Copied!</span>
              : <ShareIcon />
            }
          </button>
          <button
            onClick={onRefresh}
            className="text-white/30 hover:text-seafoam transition-colors p-1 -mr-1 mt-0.5"
            title={t('conditions.refresh')}
          >
            <RefreshIcon />
          </button>
        </div>
      </div>

      {/* Score circle + summary */}
      <div className="flex items-center gap-5 mb-5">
        <div
          className="w-24 h-24 rounded-full flex flex-col items-center justify-center flex-shrink-0"
          style={{ backgroundColor: bg, border: `2.5px solid ${color}` }}
        >
          <span className="text-4xl font-black leading-none" style={{ color }}>{surf_score}</span>
          <span className="text-xs font-bold tracking-wide mt-1.5" style={{ color }}>
            {t(SCORE_LABEL_KEY[score_label] ?? 'score.fair').toUpperCase()}
          </span>
          {trend && (
            <span className={`text-[10px] font-bold mt-1 ${
              trend.direction === 'up'   ? 'text-emerald-400' :
              trend.direction === 'down' ? 'text-red-400' :
              'text-white/30'
            }`}>
              {trend.direction === 'up' ? '↑ improving' : trend.direction === 'down' ? '↓ dropping' : '→ stable'}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <SummaryRow icon="🌊" text={`${wave.height_m}m · ${t(waveHeightLabel(wave.height_m))}`} />
          <SummaryRow icon="💨" text={wind.label} sub={`${t('conditions.gusts')} ${wind.gusts_kmh} km/h`} />
          <SummaryRow icon="🧭" text={`${t('conditions.swell_from')} ${degreesToCompass(wave.direction_deg)}`} />
          {water_temp_c != null && <SummaryRow icon="🌡️" text={`${water_temp_c}°C ${t('conditions.water')}`} />}
        </div>
      </div>

      {/* Webcam + flag row */}
      {(webcam_url || (is_community && user && onFlagBeach)) && (
        <div className="mb-4 flex items-center justify-between">
          {webcam_url ? (
            <a
              href={webcam_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-seafoam/70 hover:text-seafoam text-xs flex items-center gap-1.5 transition-colors font-medium"
            >
              <CamIcon />
              Live cam
            </a>
          ) : <span />}
          {is_community && user && onFlagBeach && (
            <button
              onClick={onFlagBeach}
              className="text-white/25 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
            >
              <FlagIcon />
              Report incorrect beach
            </button>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatBox
          label={t('conditions.wave_height')}
          value={`${wave.height_m}m`}
          sub={`${wave.period_s}s ${t('conditions.period').toLowerCase()}`}
        />
        <StatBox
          label={t('conditions.wind')}
          value={wind.label}
          sub={`${t('conditions.gusts')} ${wind.gusts_kmh} km/h`}
        />
        {wave.swell_height_m != null ? (
          <StatBox
            label={t('conditions.swell')}
            value={`${wave.swell_height_m}m`}
            sub={`${wave.swell_period_s}s · ${degreesToCompass(wave.direction_deg)}`}
          />
        ) : (
          <StatBox
            label={t('conditions.wave_dir')}
            value={degreesToCompass(wave.direction_deg)}
            sub={`${wave.direction_deg}°`}
          />
        )}
        {water_temp_c != null ? (
          <StatBox label={t('conditions.water_temp')} value={`${water_temp_c}°C`} />
        ) : (
          <StatBox
            label={t('conditions.wave_period')}
            value={`${wave.period_s}s`}
            sub={t('conditions.energy')}
          />
        )}
      </div>
    </div>
  )
}

function SummaryRow({ icon, text, sub }) {
  return (
    <div className="flex items-center gap-2 text-sm min-w-0">
      <span className="flex-shrink-0">{icon}</span>
      <span className="text-white/80 truncate">{text}</span>
      {sub && <span className="text-white/35 text-xs flex-shrink-0">· {sub}</span>}
    </div>
  )
}

function StatBox({ label, value, sub }) {
  return (
    <div className="bg-white/10 rounded-xl p-3">
      <p className="text-white/45 text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className="text-white font-bold text-lg leading-tight">{value}</p>
      {sub && <p className="text-white/35 text-xs mt-0.5">{sub}</p>}
    </div>
  )
}

function CamIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18M3 8l6-2 6 2 6-2v10l-6 2-6-2-6 2V8z" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-navy-light rounded-2xl p-5 animate-pulse">
      <div className="h-6 bg-white/15 rounded-lg w-40 mb-1" />
      <div className="h-3 bg-white/10 rounded w-24 mb-5" />
      <div className="flex gap-5 mb-5">
        <div className="w-24 h-24 rounded-full bg-white/15 flex-shrink-0" />
        <div className="flex-1 space-y-2.5 pt-1">
          <div className="h-4 bg-white/15 rounded w-3/4" />
          <div className="h-4 bg-white/15 rounded w-1/2" />
          <div className="h-4 bg-white/15 rounded w-2/3" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-white/15 rounded-xl" />)}
      </div>
    </div>
  )
}
