/**
 * ForecastSection — 7-day surf forecast with hourly wave chart.
 *
 * Day tabs at top → select a day → area chart of wave height by hour
 * colored by surf score, with wind speed overlay.
 */

import { useState } from 'react'
import {
  Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Line, ComposedChart,
} from 'recharts'
import { scoreColor } from '../utils'

// Score → tailwind color stop for gradient
function scoreGradientColor(score) {
  if (score >= 8) return '#10b981'   // emerald
  if (score >= 6) return '#4dcfaa'   // seafoam
  if (score >= 4) return '#f59e0b'   // amber
  if (score >= 2) return '#f97316'   // orange
  return '#6b7280'                    // grey
}

function formatHour(h) {
  if (h === 0)  return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

export default function ForecastSection({ days, loading }) {
  const [selectedDay, setDay] = useState(0)

  if (loading) return <ForecastSkeleton />
  if (!days?.length) return null

  const day = days[selectedDay]

  // Only show daytime hours (5am–9pm) in chart
  const chartHours = day.hours.filter(h => h.hour >= 5 && h.hour <= 21)

  // Find global max wave across all days for consistent Y axis
  const globalMax = Math.max(...days.map(d => d.max_wave_m), 0.5)

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">
          7-Day Forecast
        </h3>
        <span className="text-white/25 text-xs">wave height · wind</span>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1 mb-3">
        {days.map((d, i) => {
          const active = i === selectedDay
          const color  = scoreGradientColor(d.best_score)
          return (
            <button
              key={d.date}
              onClick={() => setDay(i)}
              className={`
                flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl
                border transition-all min-w-[64px]
                ${active
                  ? 'bg-white/12 border-white/25'
                  : 'bg-white/5 border-white/8 hover:bg-white/8'
                }
              `}
            >
              <span className={`text-xs font-bold ${active ? 'text-white' : 'text-white/50'}`}>
                {d.label}
              </span>
              <span
                className="text-sm font-black mt-0.5 tabular-nums"
                style={{ color }}
              >
                {d.max_wave_m}m
              </span>
              <span className="text-[10px] text-white/30 mt-0.5">{d.best_label}</span>
            </button>
          )
        })}
      </div>

      {/* Chart */}
      <div className="bg-white/5 rounded-2xl p-3 pt-4">
        {/* Best window pill */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <span className="text-white font-bold text-sm">{day.label}</span>
            <span className="text-white/40 text-xs ml-2">
              Best around {formatHour(day.best_hour)}
            </span>
          </div>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              color: scoreGradientColor(day.best_score),
              backgroundColor: scoreGradientColor(day.best_score) + '22',
            }}
          >
            {day.best_score} · {day.best_label}
          </span>
        </div>

        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={chartHours} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#4dcfaa" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#4dcfaa" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />

            <XAxis
              dataKey="hour"
              tickFormatter={formatHour}
              tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis
              yAxisId="wave"
              domain={[0, Math.ceil(globalMax * 1.2)]}
              tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}m`}
            />
            <YAxis
              yAxisId="wind"
              orientation="right"
              domain={[0, 'auto']}
              tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}`}
              hide
            />

            <Tooltip content={<ForecastTooltip />} />

            <Area
              yAxisId="wave"
              type="monotone"
              dataKey="wave_height_m"
              stroke="#4dcfaa"
              strokeWidth={2}
              fill="url(#waveGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#4dcfaa', stroke: '#062840', strokeWidth: 2 }}
            />
            <Line
              yAxisId="wind"
              type="monotone"
              dataKey="wind_speed_kmh"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="3 3"
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex gap-4 justify-center mt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-seafoam rounded" />
            <span className="text-white/30 text-[10px]">Wave height</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-white/20 rounded" style={{ borderTop: '1px dashed rgba(255,255,255,0.2)' }} />
            <span className="text-white/30 text-[10px]">Wind km/h</span>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function ForecastTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="bg-navy-dark border border-white/15 rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <p className="text-white/50 mb-1.5 font-semibold">{formatHour(d.hour)}</p>
      <p className="text-seafoam font-bold">🌊 {d.wave_height_m}m · {d.wave_period_s}s</p>
      <p className="text-white/50 mt-0.5">💨 {d.wind_speed_kmh} km/h</p>
      <p className="font-bold mt-1" style={{ color: scoreGradientColor(d.surf_score) }}>
        Score {d.surf_score} · {d.score_label}
      </p>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ForecastSkeleton() {
  return (
    <section className="mt-4 animate-pulse">
      <div className="h-3 bg-white/10 rounded w-28 mb-3" />
      <div className="flex gap-2 overflow-hidden mb-3">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex-shrink-0 w-16 h-16 bg-white/8 rounded-xl" />
        ))}
      </div>
      <div className="bg-white/5 rounded-2xl h-48" />
    </section>
  )
}
