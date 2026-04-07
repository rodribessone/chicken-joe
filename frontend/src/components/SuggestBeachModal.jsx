import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'
import { useT } from '../i18n/LangContext'

const STATES = ['QLD', 'NSW', 'VIC', 'WA', 'SA', 'TAS', 'NT', 'ACT']

const STATE_MAP = {
  'Queensland': 'QLD', 'New South Wales': 'NSW', 'Victoria': 'VIC',
  'Western Australia': 'WA', 'South Australia': 'SA', 'Tasmania': 'TAS',
  'Northern Territory': 'NT', 'Australian Capital Territory': 'ACT',
}

// ─── Nominatim geocoding hook ────────────────────────────────────────────────

function useNominatim(query) {
  const [results, setResults]   = useState([])
  const [loading, setLoading]   = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (query.trim().length < 3) { setResults([]); return }

    clearTimeout(timeoutRef.current)
    setLoading(true)

    timeoutRef.current = setTimeout(async () => {
      try {
        const q   = encodeURIComponent(query + ' australia')
        const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&countrycodes=au&limit=6&addressdetails=1`
        const res = await fetch(url, { headers: { 'User-Agent': 'ChickenJoe/1.0 surf-conditions-app' } })
        setResults(await res.json())
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 500) // debounce — Nominatim rate limit: 1 req/s

    return () => clearTimeout(timeoutRef.current)
  }, [query])

  return { results, loading }
}

// ─── helpers ────────────────────────────────────────────────────────────────

function extractState(result) {
  return STATE_MAP[result.address?.state] ?? 'QLD'
}

function shortName(displayName) {
  return displayName.split(',')[0].trim()
}

// ─── Map preview ─────────────────────────────────────────────────────────────

function MapPreview({ lat, lon, t }) {
  const pad  = 0.018
  const bbox = `${lon - pad},${lat - pad},${lon + pad},${lat + pad}`
  const src  = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`
  const link = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15`

  return (
    <div className="rounded-xl overflow-hidden border border-white/20 mt-1">
      <iframe
        src={src}
        title="Location preview"
        className="w-full h-44"
        style={{ border: 0, display: 'block' }}
        sandbox="allow-scripts allow-same-origin"
      />
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-xs text-seafoam/70 hover:text-seafoam text-center py-1.5 bg-white/5 transition-colors"
      >
        {t('suggest.view_larger')}
      </a>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function SuggestBeachModal({ onClose, prefillName = '' }) {
  const t = useT()

  // Step 1 — search
  const [query, setQuery]   = useState(prefillName)
  const { results, loading: searching } = useNominatim(query)

  // Step 2 — confirm
  const [selected, setSelected] = useState(null)
  const [name, setName]         = useState('')
  const [state, setState]       = useState('QLD')
  const [notes, setNotes]       = useState('')

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState(null)
  const [success, setSuccess]       = useState(false)

  const handlePick = (result) => {
    setSelected(result)
    setName(shortName(result.display_name))
    setState(extractState(result))
    setError(null)
  }

  const handleBack = () => { setSelected(null); setResults_clear() }
  // (results clear naturally when query changes, but we leave query so user can re-search)

  const handleSubmit = async () => {
    if (!name.trim()) { setError(t('suggest.err_name')); return }
    setSubmitting(true); setError(null)
    try {
      await api.suggestBeach({
        name:  name.trim(),
        state,
        lat:   parseFloat(selected.lat),
        lon:   parseFloat(selected.lon),
        notes: notes.trim() || null,
      })
      setSuccess(true)
    } catch {
      setError(t('suggest.err_fail'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-navy-light w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[92vh] overflow-y-auto shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-lg font-bold">{t('suggest.title')}</h2>
            <p className="text-white/40 text-xs mt-0.5">{t('suggest.subtitle')}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1 -mr-1">
            <XIcon />
          </button>
        </div>

        {success ? (
          <SuccessState t={t} onClose={onClose} />
        ) : selected ? (
          <ConfirmStep
            t={t} selected={selected}
            name={name} setName={setName}
            state={state} setState={setState}
            notes={notes} setNotes={setNotes}
            onBack={handleBack}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={error}
          />
        ) : (
          <SearchStep
            t={t} query={query} setQuery={setQuery}
            results={results} searching={searching}
            onPick={handlePick}
          />
        )}
      </div>
    </div>
  )
}

// ─── Step 1: Search ──────────────────────────────────────────────────────────

function SearchStep({ t, query, setQuery, results, searching, onPick }) {
  return (
    <div>
      {/* Search input */}
      <div className="relative mb-1">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
        <input
          autoFocus
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('suggest.search_placeholder')}
          className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-seafoam transition-colors"
        />
      </div>
      <p className="text-white/30 text-xs mb-4 px-1">{t('suggest.search_hint')}</p>

      {/* States */}
      {searching && (
        <div className="flex items-center gap-2 text-white/40 text-sm py-4 justify-center">
          <Spinner /> {t('suggest.searching')}
        </div>
      )}

      {!searching && query.trim().length >= 3 && results.length === 0 && (
        <p className="text-white/35 text-sm text-center py-4">{t('suggest.no_results')}</p>
      )}

      {results.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-white/35 text-xs mb-2">{t('suggest.pick_prompt')}</p>
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => onPick(r)}
              className="w-full text-left bg-white/10 hover:bg-white/15 active:bg-white/20 rounded-xl px-4 py-3 transition-colors"
            >
              <p className="text-white text-sm font-semibold">{shortName(r.display_name)}</p>
              <p className="text-white/40 text-xs mt-0.5 truncate">{r.display_name}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Step 2: Confirm ─────────────────────────────────────────────────────────

function ConfirmStep({ t, selected, name, setName, state, setState, notes, setNotes, onBack, onSubmit, submitting, error }) {
  const lat = parseFloat(selected.lat)
  const lon = parseFloat(selected.lon)

  return (
    <div>
      {/* Back link */}
      <button onClick={onBack} className="text-seafoam text-xs hover:text-seafoam-dark transition-colors mb-4 flex items-center gap-1">
        {t('suggest.change_location')}
      </button>

      {/* Map preview */}
      <p className="text-xs text-white/40 uppercase tracking-wide font-semibold mb-1.5">{t('suggest.confirm_title')}</p>
      <MapPreview lat={lat} lon={lon} t={t} />

      {/* Coord badge */}
      <p className="text-white/30 text-xs text-center mt-1.5 tabular-nums">
        {lat.toFixed(5)}, {lon.toFixed(5)}
      </p>

      {/* Editable name */}
      <div className="mt-4">
        <Field label={t('suggest.name')}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label={t('suggest.state')}>
          <select value={state} onChange={e => setState(e.target.value)} className={inputClass}>
            {STATES.map(s => <option key={s} value={s} className="bg-navy">{s}</option>)}
          </select>
        </Field>

        <Field label={t('suggest.notes')}>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            maxLength={300}
            className={`${inputClass} resize-none`}
          />
        </Field>
      </div>

      {error && <p className="text-red-400 text-sm mb-4 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="w-full bg-seafoam text-navy font-bold py-3 rounded-xl hover:bg-seafoam-dark active:scale-95 transition-all disabled:opacity-50 text-sm"
      >
        {submitting ? t('suggest.submitting') : t('suggest.submit')}
      </button>
    </div>
  )
}

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessState({ t, onClose }) {
  return (
    <div className="text-center py-6">
      <p className="text-4xl mb-3">🤙</p>
      <h3 className="text-lg font-bold mb-2">{t('suggest.success_title')}</h3>
      <p className="text-white/60 text-sm mb-6">{t('suggest.success_msg')}</p>
      <button onClick={onClose} className="bg-seafoam text-navy font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-seafoam-dark transition-colors">
        {t('suggest.success_btn')}
      </button>
    </div>
  )
}

// ─── Micro-components ────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs text-white/50 uppercase tracking-wide mb-1.5 font-semibold">{label}</label>
      {children}
    </div>
  )
}

function XIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SearchIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
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

const inputClass = 'w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-seafoam transition-colors'

// silence the unused-var warning — results clear via hook when query changes
function setResults_clear() {}
