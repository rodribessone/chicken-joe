import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { LangProvider } from './i18n/LangContext'
import { useT } from './i18n/LangContext'
import { AuthProvider } from './auth/AuthContext'
import { api } from './api/client'
import { useFavorites } from './hooks/useFavorites'
import Header from './components/Header'
import BeachTabs from './components/BeachTabs'
import ConditionsCard from './components/ConditionsCard'
import TideSection from './components/TideSection'
import AdPlaceholder from './components/AdPlaceholder'
import ReportFeed from './components/ReportFeed'
import ReportModal from './components/ReportModal'
import SearchInput from './components/SearchInput'
import NearbyBeaches from './components/NearbyBeaches'
import SuggestBeachModal from './components/SuggestBeachModal'
import AddBeachModal from './components/AddBeachModal'
import AuthModal from './components/AuthModal'
import FlagBeachModal from './components/FlagBeachModal'
import AdminPanel from './components/AdminPanel'
import ProfileModal from './components/ProfileModal'
import GlossarySection from './components/GlossarySection'

const ForecastSection = lazy(() => import('./components/ForecastSection'))

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </LangProvider>
  )
}

// ─── Trend calculation ────────────────────────────────────────────────────────
function computeTrend(forecastDays, currentScore) {
  if (!forecastDays?.length || currentScore == null) return null
  const now   = new Date()
  const curHr = now.getHours()
  const today = forecastDays[0]
  if (!today) return null

  const upcoming = today.hours.filter(h => h.hour > curHr && h.hour <= curHr + 3)
  if (upcoming.length < 2) return null

  const avgNext = upcoming.reduce((s, h) => s + h.surf_score, 0) / upcoming.length
  const diff    = avgNext - currentScore

  return {
    direction: diff > 0.7 ? 'up' : diff < -0.7 ? 'down' : 'stable',
    diff: Math.round(diff * 10) / 10,
  }
}

// ─── Main app ─────────────────────────────────────────────────────────────────
function AppInner() {
  const t = useT()
  const { favorites, toggleFavorite, isFavorite } = useFavorites()

  const [beaches, setBeaches]               = useState([])
  const [selectedId, setSelectedId]         = useState('noosa')
  const [allConditions, setAllConditions]   = useState({})
  const [allForecasts, setAllForecasts]     = useState({})    // cache: beachId → days[]
  const [forecastLoading, setForecastLoading] = useState(false)
  const [loadingSelected, setLoadingSelected] = useState(false)
  const [todayReports, setTodayReports]     = useState([])
  const [historyReports, setHistoryReports] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [search, setSearch]                 = useState('')
  const [reportOpen, setReportOpen]         = useState(false)
  const [suggestOpen, setSuggestOpen]       = useState(false)
  const [suggestPrefill, setSuggestPrefill] = useState('')
  const [addBeachOpen, setAddBeachOpen]     = useState(false)
  const [addBeachPrefill, setAddBeachPrefill] = useState('')
  const [authOpen, setAuthOpen]             = useState(false)
  const [flagBeachOpen, setFlagBeachOpen]   = useState(false)
  const [adminOpen, setAdminOpen]           = useState(false)
  const [profileOpen, setProfileOpen]       = useState(false)

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchConditions = useCallback(async (beachId, showLoading = false) => {
    if (showLoading) setLoadingSelected(true)
    try {
      const data = await api.getConditions(beachId)
      setAllConditions(prev => ({ ...prev, [beachId]: data }))
    } catch (err) {
      console.error(`Conditions fetch failed for ${beachId}:`, err)
    } finally {
      if (showLoading) setLoadingSelected(false)
    }
  }, [])

  const fetchForecast = useCallback(async (beachId) => {
    if (allForecasts[beachId]) return        // already cached
    setForecastLoading(true)
    try {
      const days = await api.getForecast(beachId)
      setAllForecasts(prev => ({ ...prev, [beachId]: days }))
    } catch (err) {
      console.error(`Forecast fetch failed for ${beachId}:`, err)
    } finally {
      setForecastLoading(false)
    }
  }, [allForecasts])

  useEffect(() => {
    api.getBeaches()
      .then(data => {
        setBeaches(data)
        data.forEach(b => fetchConditions(b.id, b.id === 'noosa'))
        fetchForecast('noosa')
      })
      .catch(console.error)
  }, [fetchConditions]) // eslint-disable-line

  useEffect(() => {
    const id = setInterval(() => fetchConditions(selectedId, true), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [selectedId, fetchConditions])

  useEffect(() => {
    setHistoryReports(null)
    api.getReports(selectedId, 'today').then(setTodayReports).catch(console.error)
  }, [selectedId])

  const handleLoadHistory = () => {
    setHistoryLoading(true)
    api.getReports(selectedId, 'history')
      .then(setHistoryReports)
      .catch(() => setHistoryReports([]))
      .finally(() => setHistoryLoading(false))
  }

  // ── Derived state ───────────────────────────────────────────────────────────

  // Favorites first, then the rest
  const sortedBeaches = useMemo(() => {
    const favs  = beaches.filter(b => isFavorite(b.id))
    const rest  = beaches.filter(b => !isFavorite(b.id))
    return [...favs, ...rest]
  }, [beaches, favorites]) // eslint-disable-line

  const filteredBeaches = useMemo(() => {
    if (!search.trim()) return sortedBeaches
    const q = search.toLowerCase()
    return sortedBeaches.filter(b => b.name.toLowerCase().includes(q))
  }, [sortedBeaches, search])

  const noResults = search.trim().length > 0 && filteredBeaches.length === 0

  const trend = useMemo(
    () => computeTrend(allForecasts[selectedId], allConditions[selectedId]?.surf_score),
    [allForecasts, allConditions, selectedId]
  )

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSelectBeach = (id) => {
    setSelectedId(id)
    setSearch('')
    if (!allConditions[id]) fetchConditions(id, true)
    fetchForecast(id)
  }

  const handleReportSubmit = async (beachId, payload) => {
    await api.createReport(beachId, payload)
    setReportOpen(false)
    if (beachId === selectedId) {
      api.getReports(selectedId, 'today').then(setTodayReports).catch(console.error)
    }
  }

  const handleAddBeachOpen = (prefill = '') => {
    setAddBeachPrefill(prefill)
    setAddBeachOpen(true)
  }

  const handleBeachRemoved = (beachId) => {
    setBeaches(prev => {
      const next = prev.filter(b => b.id !== beachId)
      if (selectedId === beachId && next.length > 0) setSelectedId(next[0].id)
      return next
    })
    setAdminOpen(false)
  }

  const handleBeachAdded = async (beach) => {
    try {
      const updated = await api.getBeaches()
      setBeaches(updated)
      handleSelectBeach(beach.id)
    } catch {
      setBeaches(prev => [...prev, beach])
      handleSelectBeach(beach.id)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-navy font-sans">
      <Header
        onAuthOpen={() => setAuthOpen(true)}
        onAdminOpen={() => setAdminOpen(true)}
        onProfileOpen={() => setProfileOpen(true)}
      />

      <main className="max-w-2xl mx-auto px-4 pb-28">
        <NearbyBeaches beaches={beaches} allConditions={allConditions} onSelect={handleSelectBeach} />
        <SearchInput
          value={search}
          onChange={setSearch}
          onSuggest={() => handleAddBeachOpen(search)}
          noResults={noResults}
        />
        <BeachTabs
          beaches={filteredBeaches}
          selectedId={selectedId}
          onSelect={handleSelectBeach}
          allConditions={allConditions}
          onAdd={() => handleAddBeachOpen()}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
        />
        <ConditionsCard
          conditions={allConditions[selectedId]}
          loading={loadingSelected && !allConditions[selectedId]}
          onRefresh={() => fetchConditions(selectedId, true)}
          onFlagBeach={() => setFlagBeachOpen(true)}
          trend={trend}
        />
        <Suspense fallback={<div className="mt-4 h-52 bg-white/5 rounded-2xl animate-pulse" />}>
          <ForecastSection
            days={allForecasts[selectedId]}
            loading={forecastLoading && !allForecasts[selectedId]}
          />
        </Suspense>
        <TideSection beachId={selectedId} />
        <GlossarySection />
        <AdPlaceholder />
        <ReportFeed
          todayReports={todayReports}
          historyReports={historyReports}
          historyLoading={historyLoading}
          onLoadHistory={handleLoadHistory}
        />
      </main>

      {/* Floating report button */}
      <button
        onClick={() => setReportOpen(true)}
        className="fixed bottom-6 right-5 bg-seafoam text-navy font-bold px-5 py-3 rounded-full
                   shadow-2xl shadow-seafoam/30 text-sm flex items-center gap-2
                   hover:bg-seafoam-dark active:scale-95 transition-all"
      >
        <PlusIcon />
        {t('report.btn')}
      </button>

      {reportOpen && (
        <ReportModal beaches={beaches} defaultBeachId={selectedId}
          onClose={() => setReportOpen(false)} onSubmit={handleReportSubmit} />
      )}
      {suggestOpen && (
        <SuggestBeachModal prefillName={suggestPrefill} onClose={() => setSuggestOpen(false)} />
      )}
      {addBeachOpen && (
        <AddBeachModal prefillQuery={addBeachPrefill}
          onClose={() => setAddBeachOpen(false)} onAdded={handleBeachAdded} />
      )}
      {authOpen   && <AuthModal onClose={() => setAuthOpen(false)} />}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
      {flagBeachOpen && allConditions[selectedId] && (
        <FlagBeachModal
          beach={{ id: selectedId, name: allConditions[selectedId].beach_name }}
          onClose={() => setFlagBeachOpen(false)}
        />
      )}
      {adminOpen && (
        <AdminPanel onClose={() => setAdminOpen(false)} onBeachRemoved={handleBeachRemoved} />
      )}
    </div>
  )
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}
