/**
 * AdminPanel — full admin interface with three tabs:
 *   🚩 Beach flags      — review and dismiss/remove flagged community beaches
 *   💡 Suggestions      — approve or reject beach suggestions
 *   📋 Reports          — browse recent reports, delete offensive ones
 */

import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { timeAgo } from '../utils'

const TABS = [
  { id: 'flags',       label: '🚩 Flags' },
  { id: 'suggestions', label: '💡 Suggestions' },
  { id: 'reports',     label: '📋 Reports' },
]

export default function AdminPanel({ onClose, onBeachRemoved, onBeachAdded }) {
  const [tab, setTab] = useState('flags')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-navy-light w-full max-w-lg rounded-t-2xl sm:rounded-2xl
                      max-h-[90vh] flex flex-col shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-5 pb-3 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>🛡️</span> Admin panel
            </h2>
            <p className="text-white/40 text-xs mt-0.5">Moderate beaches, suggestions &amp; reports</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1 -mr-1">
            <XIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 pb-0 flex-shrink-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${tab === t.id
                  ? 'bg-seafoam/20 text-seafoam border border-seafoam/30'
                  : 'text-white/40 hover:text-white/70 border border-transparent'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {tab === 'flags'       && <FlagsTab onBeachRemoved={onBeachRemoved} />}
          {tab === 'suggestions' && <SuggestionsTab onBeachAdded={onBeachAdded} />}
          {tab === 'reports'     && <ReportsTab />}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Flags tab
// ---------------------------------------------------------------------------

function FlagsTab({ onBeachRemoved }) {
  const [flags, setFlags]   = useState(null)
  const [error, setError]   = useState(null)
  const [acting, setActing] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null) // flag object

  useEffect(() => {
    api.adminGetFlags()
      .then(setFlags)
      .catch(() => setError('Could not load flags.'))
  }, [])

  const handleDismiss = async (flagId) => {
    setActing(flagId)
    try {
      await api.adminDismissFlag(flagId)
      setFlags(prev => prev.filter(f => f.id !== flagId))
    } catch {
      setError('Could not dismiss flag.')
    } finally {
      setActing(null)
    }
  }

  const handleRemoveBeach = async (flag) => {
    setActing(flag.id)
    try {
      await api.adminRemoveBeach(flag.beach_id)
      setFlags(prev => prev.filter(f => f.beach_id !== flag.beach_id))
      onBeachRemoved?.(flag.beach_id)
    } catch {
      setError('Could not remove beach.')
    } finally {
      setActing(null)
      setConfirmRemove(null)
    }
  }

  if (flags === null && !error) return <LoadingSkeleton />

  return (
    <div className="space-y-3">
      {error && <ErrorBanner msg={error} />}
      {!error && flags?.length === 0 && (
        <EmptyState icon="✅" msg="No pending flags — all clear!" />
      )}
      {flags?.map(flag => (
        <div key={flag.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-white font-semibold text-sm">{flag.beach_name}</p>
              <p className="text-white/35 text-xs">
                <span className="text-seafoam">@{flag.username}</span>
                {' · '}{timeAgo(flag.created_at)}
              </p>
            </div>
            <span className="text-white/20 text-xs font-mono">{flag.beach_id}</span>
          </div>
          <p className="text-white/70 text-sm bg-white/5 rounded-lg px-3 py-2 mb-3 leading-relaxed">
            "{flag.reason}"
          </p>

          {confirmRemove?.id === flag.id ? (
            <div className="flex items-center justify-between gap-3
                            bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2.5">
              <p className="text-red-300 text-xs font-medium">Remove beach "{flag.beach_name}"?</p>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setConfirmRemove(null)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/10 text-white/70 hover:bg-white/15">
                  Cancel
                </button>
                <button onClick={() => handleRemoveBeach(flag)} disabled={acting === flag.id}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">
                  {acting === flag.id ? '…' : 'Remove'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => handleDismiss(flag.id)} disabled={!!acting}
                className="flex-1 py-2 rounded-lg text-xs font-semibold
                           bg-white/8 text-white/60 border border-white/15
                           hover:bg-white/12 hover:text-white transition-all disabled:opacity-40">
                {acting === flag.id ? '…' : 'Dismiss flag'}
              </button>
              <button onClick={() => setConfirmRemove(flag)} disabled={!!acting}
                className="flex-1 py-2 rounded-lg text-xs font-semibold
                           bg-red-500/15 text-red-400 border border-red-500/25
                           hover:bg-red-500/25 transition-all disabled:opacity-40">
                Remove beach
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Suggestions tab
// ---------------------------------------------------------------------------

function SuggestionsTab({ onBeachAdded }) {
  const [suggestions, setSuggestions] = useState(null)
  const [error, setError]             = useState(null)
  const [acting, setActing]           = useState(null)

  useEffect(() => {
    api.adminGetSuggestions()
      .then(setSuggestions)
      .catch(() => setError('Could not load suggestions.'))
  }, [])

  const handleApprove = async (s) => {
    setActing(s.id)
    try {
      await api.adminApproveSuggestion(s.id)
      setSuggestions(prev => prev.filter(x => x.id !== s.id))
      onBeachAdded?.()
    } catch {
      setError('Could not approve suggestion.')
    } finally {
      setActing(null)
    }
  }

  const handleReject = async (s) => {
    setActing(s.id)
    try {
      await api.adminRejectSuggestion(s.id)
      setSuggestions(prev => prev.filter(x => x.id !== s.id))
    } catch {
      setError('Could not reject suggestion.')
    } finally {
      setActing(null)
    }
  }

  if (suggestions === null && !error) return <LoadingSkeleton />

  return (
    <div className="space-y-3">
      {error && <ErrorBanner msg={error} />}
      {!error && suggestions?.length === 0 && (
        <EmptyState icon="🏄" msg="No pending suggestions." />
      )}
      {suggestions?.map(s => (
        <div key={s.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex justify-between items-start mb-1">
            <p className="text-white font-semibold text-sm">{s.name}</p>
            <span className="text-white/30 text-xs bg-white/5 px-2 py-0.5 rounded-full">{s.state}</span>
          </div>
          <p className="text-white/40 text-xs mb-1 font-mono">
            {s.lat.toFixed(4)}, {s.lon.toFixed(4)}
          </p>
          {s.notes && (
            <p className="text-white/60 text-sm bg-white/5 rounded-lg px-3 py-2 mb-3 leading-relaxed">
              "{s.notes}"
            </p>
          )}
          <p className="text-white/25 text-xs mb-3">{timeAgo(s.submitted_at)}</p>
          <div className="flex gap-2">
            <button onClick={() => handleApprove(s)} disabled={!!acting}
              className="flex-1 py-2 rounded-lg text-xs font-semibold
                         bg-seafoam/15 text-seafoam border border-seafoam/25
                         hover:bg-seafoam/25 transition-all disabled:opacity-40">
              {acting === s.id ? '…' : '✓ Approve'}
            </button>
            <button onClick={() => handleReject(s)} disabled={!!acting}
              className="flex-1 py-2 rounded-lg text-xs font-semibold
                         bg-red-500/15 text-red-400 border border-red-500/25
                         hover:bg-red-500/25 transition-all disabled:opacity-40">
              {acting === s.id ? '…' : '✕ Reject'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reports tab
// ---------------------------------------------------------------------------

function ReportsTab() {
  const [reports, setReports]       = useState(null)
  const [error, setError]           = useState(null)
  const [confirmDel, setConfirmDel] = useState(null) // report id
  const [deleting, setDeleting]     = useState(null)

  useEffect(() => {
    api.adminGetReports()
      .then(setReports)
      .catch(() => setError('Could not load reports.'))
  }, [])

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      await api.adminDeleteReport(id)
      setReports(prev => prev.filter(r => r.id !== id))
    } catch {
      setError('Could not delete report.')
    } finally {
      setDeleting(null)
      setConfirmDel(null)
    }
  }

  if (reports === null && !error) return <LoadingSkeleton />

  return (
    <div className="space-y-3">
      {error && <ErrorBanner msg={error} />}
      {!error && reports?.length === 0 && (
        <EmptyState icon="📭" msg="No reports yet." />
      )}
      {reports?.map(r => (
        <div key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex justify-between items-start mb-1">
            <div>
              <p className="text-seafoam text-xs font-semibold">{r.beach_name}</p>
              <p className="text-white/30 text-xs">
                {r.username ? `@${r.username}` : 'Anonymous'}
                {' · '}{timeAgo(r.created_at)}
              </p>
            </div>
            <span className="text-white/20 text-xs font-mono">#{r.id}</span>
          </div>

          {r.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {r.tags.map(tag => (
                <span key={tag} className="text-xs bg-white/10 text-white/50 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {r.text && (
            <p className="text-white/70 text-sm leading-relaxed mb-3">
              {r.text}
            </p>
          )}

          {confirmDel === r.id ? (
            <div className="flex items-center justify-between gap-3
                            bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2.5">
              <p className="text-red-300 text-xs font-medium">Delete this report?</p>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setConfirmDel(null)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/10 text-white/70 hover:bg-white/15">
                  Cancel
                </button>
                <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">
                  {deleting === r.id ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(r.id)}
              className="py-1.5 px-3 rounded-lg text-xs font-semibold
                         bg-red-500/10 text-red-400 border border-red-500/20
                         hover:bg-red-500/20 transition-all">
              Delete report
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-28 bg-white/10 rounded-xl" />
      ))}
    </div>
  )
}

function EmptyState({ icon, msg }) {
  return (
    <div className="text-center py-10">
      <p className="text-3xl mb-2">{icon}</p>
      <p className="text-white/50 text-sm">{msg}</p>
    </div>
  )
}

function ErrorBanner({ msg }) {
  return <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{msg}</p>
}

function XIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
