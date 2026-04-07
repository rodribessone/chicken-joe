/**
 * AdminPanel — modal for admins to review and action beach flags.
 *
 * Actions per flag:
 *   - Dismiss: remove the flag, keep the beach
 *   - Remove beach: delete the community beach + all its flags
 */

import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { timeAgo } from '../utils'

export default function AdminPanel({ onClose, onBeachRemoved }) {
  const [flags, setFlags]     = useState(null)   // null = loading
  const [error, setError]     = useState(null)
  const [acting, setActing]   = useState(null)   // flagId currently being actioned

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
    if (!confirm(`Remove beach "${flag.beach_name}"? This cannot be undone.`)) return
    setActing(flag.id)
    try {
      await api.adminRemoveBeach(flag.beach_id)
      // Remove all flags for this beach from the list
      setFlags(prev => prev.filter(f => f.beach_id !== flag.beach_id))
      onBeachRemoved?.(flag.beach_id)
    } catch {
      setError('Could not remove beach.')
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-navy-light w-full max-w-lg rounded-t-2xl sm:rounded-2xl
                      max-h-[85vh] flex flex-col shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>🛡️</span> Beach flags
            </h2>
            <p className="text-white/40 text-xs mt-0.5">Review community reports</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1 -mr-1">
            <XIcon />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          {flags === null ? (
            <LoadingSkeleton />
          ) : flags.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-white/50 text-sm">No pending flags — all clear!</p>
            </div>
          ) : (
            flags.map(flag => (
              <FlagCard
                key={flag.id}
                flag={flag}
                actioning={acting === flag.id}
                onDismiss={() => handleDismiss(flag.id)}
                onRemove={() => handleRemoveBeach(flag)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function FlagCard({ flag, actioning, onDismiss, onRemove }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      {/* Beach + reporter */}
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

      {/* Reason */}
      <p className="text-white/70 text-sm bg-white/5 rounded-lg px-3 py-2 mb-3 leading-relaxed">
        "{flag.reason}"
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onDismiss}
          disabled={actioning}
          className="flex-1 py-2 rounded-lg text-xs font-semibold
                     bg-white/8 text-white/60 border border-white/15
                     hover:bg-white/12 hover:text-white transition-all
                     disabled:opacity-40"
        >
          {actioning ? '…' : 'Dismiss flag'}
        </button>
        <button
          onClick={onRemove}
          disabled={actioning}
          className="flex-1 py-2 rounded-lg text-xs font-semibold
                     bg-red-500/15 text-red-400 border border-red-500/25
                     hover:bg-red-500/25 transition-all disabled:opacity-40"
        >
          {actioning ? '…' : 'Remove beach'}
        </button>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-28 bg-white/10 rounded-xl" />
      ))}
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
