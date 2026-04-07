/**
 * AddBeachModal
 *
 * Lets any user add a new beach immediately (no admin review needed).
 * Flow:
 *   1. Search by name → Nominatim geocoding (OpenStreetMap, free, no key)
 *   2. Pick from results → interactive map preview
 *   3. Confirm → POST /beaches → beach is live instantly
 *
 * On success: calls onAdded(beach) so App can select the new beach.
 */

import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'
import { useT } from '../i18n/LangContext'

const STATES = ['QLD', 'NSW', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']

const STATE_MAP = {
  Queensland: 'QLD', 'New South Wales': 'NSW', Victoria: 'VIC',
  'Western Australia': 'WA', 'South Australia': 'SA', Tasmania: 'TAS',
  'Northern Territory': 'NT', 'Australian Capital Territory': 'ACT',
}

// ─── Nominatim hook (debounced) ──────────────────────────────────────────────

function useNominatim(query) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    setResults([])
    if (query.trim().length < 3) { setLoading(false); return }

    setLoading(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const q   = encodeURIComponent(query.trim() + ' australia')
        const url =
          `https://nominatim.openstreetmap.org/search` +
          `?q=${q}&format=json&countrycodes=au&limit=6&addressdetails=1`
        const res = await fetch(url, {
          headers: { 'User-Agent': 'ChickenJoe/1.0 surf-conditions-app' },
        })
        setResults(await res.json())
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 500)           // 500ms debounce — respects Nominatim 1 req/s rate limit

    return () => clearTimeout(timer.current)
  }, [query])

  return { results, loading }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const slugFirstPart = (displayName) => displayName.split(',')[0].trim()

const detectState = (result) =>
  STATE_MAP[result.address?.state] ?? 'QLD'

const buildDescription = (result) => {
  const a = result.address ?? {}
  const parts = [a.suburb, a.town, a.city, a.county]
    .filter(Boolean)
    .slice(0, 2)
  return parts.length ? parts.join(', ') : ''
}

// ─── Map preview ─────────────────────────────────────────────────────────────

function MapPreview({ lat, lon }) {
  const pad  = 0.02
  const bbox = `${lon - pad},${lat - pad},${lon + pad},${lat + pad}`
  const src  = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`
  const href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15`

  return (
    <div className="rounded-xl overflow-hidden border border-white/20">
      <iframe
        title="location-preview"
        src={src}
        className="w-full h-48 block"
        style={{ border: 0 }}
        sandbox="allow-scripts allow-same-origin"
      />
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1 py-1.5 bg-white/5 text-seafoam/70 hover:text-seafoam text-xs transition-colors"
      >
        <MapPinIcon /> View on OpenStreetMap ↗
      </a>
    </div>
  )
}

// ─── Main modal ──────────────────────────────────────────────────────────────

export default function AddBeachModal({ onClose, prefillQuery = '', onAdded }) {
  const t = useT()

  /* step 1 – search */
  const [query, setQuery]       = useState(prefillQuery)
  const { results, loading }    = useNominatim(query)

  /* step 2 – confirm */
  const [picked, setPicked]       = useState(null)   // Nominatim result
  const [name, setName]           = useState('')
  const [state, setState]         = useState('QLD')

  /* submission */
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState(null)
  const [done, setDone]             = useState(null)  // the new Beach object

  const handlePick = (result) => {
    setPicked(result)
    setName(slugFirstPart(result.display_name))
    setState(detectState(result))
    setError(null)
  }

  const handleBack = () => { setPicked(null); setError(null) }

  const handleAdd = async () => {
    if (!name.trim()) { setError('Beach name is required.'); return }
    setSubmitting(true); setError(null)
    try {
      const beach = await api.addBeach({
        name:        name.trim(),
        state,
        lat:         parseFloat(picked.lat),
        lon:         parseFloat(picked.lon),
        description: buildDescription(picked),
      })
      setDone(beach)
    } catch (err) {
      setError('Could not add the beach. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoSurf = () => {
    onAdded?.(done)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-navy-light w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6
                      max-h-[92vh] overflow-y-auto shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-lg font-bold">🏄 Add a Beach</h2>
            <p className="text-white/40 text-xs mt-0.5">
              Search &rarr; confirm on map &rarr; it's live instantly
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1 -mr-1">
            <XIcon />
          </button>
        </div>

        {/* ── States ─────────────────────────────────────────────────────── */}
        {done ? (
          <SuccessScreen beach={done} onClose={handleGoSurf} />
        ) : picked ? (
          <ConfirmStep
            picked={picked}
            name={name} setName={setName}
            state={state} setState={setState}
            onBack={handleBack}
            onAdd={handleAdd}
            submitting={submitting}
            error={error}
          />
        ) : (
          <SearchStep
            query={query} setQuery={setQuery}
            results={results} loading={loading}
            onPick={handlePick}
          />
        )}
      </div>
    </div>
  )
}

// ─── Step 1: Search ──────────────────────────────────────────────────────────

function SearchStep({ query, setQuery, results, loading, onPick }) {
  return (
    <>
      <div className="relative mb-1">
        <MagIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
        <input
          autoFocus
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Type beach name to search…"
          className={`${base} pl-9 py-3`}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-lg leading-none"
          >×</button>
        )}
      </div>
      <p className="text-white/25 text-xs px-1 mb-4">
        e.g. Happy Valley Beach, Kings Beach, Snapper Rocks
      </p>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-white/40 py-5 text-sm">
          <Spinner /> Searching…
        </div>
      )}

      {!loading && query.trim().length >= 3 && results.length === 0 && (
        <p className="text-white/35 text-sm text-center py-5">
          No results — try a different name or add more detail (e.g. "Kings Beach Caloundra").
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-white/35 text-xs mb-2 uppercase tracking-wide font-semibold">
            Select the correct location
          </p>
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => onPick(r)}
              className="w-full text-left bg-white/10 hover:bg-white/15 active:bg-white/20
                         rounded-xl px-4 py-3 transition-colors group"
            >
              <p className="text-white font-semibold text-sm group-hover:text-seafoam transition-colors">
                {slugFirstPart(r.display_name)}
              </p>
              <p className="text-white/40 text-xs mt-0.5 truncate">{r.display_name}</p>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

// ─── Step 2: Confirm ─────────────────────────────────────────────────────────

function ConfirmStep({ picked, name, setName, state, setState, onBack, onAdd, submitting, error }) {
  const lat = parseFloat(picked.lat)
  const lon = parseFloat(picked.lon)

  return (
    <>
      <button onClick={onBack} className="text-seafoam text-xs hover:text-seafoam-dark mb-4 flex items-center gap-1">
        ← Search again
      </button>

      {/* Map */}
      <p className="text-white/40 text-xs uppercase tracking-wide font-semibold mb-2">
        Confirm location on map
      </p>
      <MapPreview lat={lat} lon={lon} />
      <p className="text-white/25 text-xs text-center mt-1 tabular-nums">
        {lat.toFixed(5)}, {lon.toFixed(5)}
      </p>

      {/* Editable fields */}
      <div className="mt-4 space-y-4">
        <div>
          <label className={label}>Beach Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className={base}
          />
        </div>

        <div>
          <label className={label}>State</label>
          <select value={state} onChange={e => setState(e.target.value)} className={base}>
            {STATES.map(s => <option key={s} value={s} className="bg-navy">{s}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        onClick={onAdd}
        disabled={submitting}
        className="mt-5 w-full bg-seafoam text-navy font-bold py-3 rounded-xl
                   hover:bg-seafoam-dark active:scale-95 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {submitting ? 'Adding…' : '🤙 Add this beach'}
      </button>
    </>
  )
}

// ─── Success ─────────────────────────────────────────────────────────────────

function SuccessScreen({ beach, onClose }) {
  return (
    <div className="text-center py-6">
      <p className="text-5xl mb-3">🏄</p>
      <h3 className="text-xl font-black mb-1">{beach.name}</h3>
      <p className="text-seafoam text-sm font-semibold mb-1">{beach.state}</p>
      <p className="text-white/50 text-sm mb-6">
        The beach is live! Conditions will load now.
      </p>
      <button
        onClick={onClose}
        className="bg-seafoam text-navy font-bold px-8 py-3 rounded-xl text-sm
                   hover:bg-seafoam-dark transition-colors"
      >
        Go surf check →
      </button>
    </div>
  )
}

// ─── Micro components ────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function MagIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
    </svg>
  )
}

function MapPinIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}

const base  = 'w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-seafoam transition-colors'
const label = 'block text-xs text-white/50 uppercase tracking-wide mb-1.5 font-semibold'
