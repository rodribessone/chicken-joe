/**
 * FlagBeachModal — lets a logged-in user report a community beach as incorrect.
 * Admin will review and either dismiss the flag or remove the beach.
 */

import { useState } from 'react'
import { api } from '../api/client'

export default function FlagBeachModal({ beach, onClose }) {
  const [reason, setReason]   = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (reason.trim().length < 5) { setError('Please give a bit more detail (min. 5 characters).'); return }
    setLoading(true); setError(null)
    try {
      await api.flagBeach(beach.id, { reason: reason.trim() })
      setDone(true)
    } catch (err) {
      if (err.message.includes('409')) {
        setError("You've already flagged this beach — we'll review it soon.")
      } else {
        setError('Could not send report. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-navy-light w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6
                      shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-base font-bold">Report incorrect beach</h2>
            <p className="text-white/40 text-xs mt-0.5">{beach.name}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1 -mr-1">
            <XIcon />
          </button>
        </div>

        {done ? (
          <div className="text-center py-4">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-white font-semibold mb-1">Report received</p>
            <p className="text-white/45 text-sm">
              Our team will review it and take action if needed. Thanks for keeping the data accurate!
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full bg-white/10 hover:bg-white/15 text-white font-semibold
                         py-2.5 rounded-xl text-sm transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wide mb-2 font-semibold">
                What's wrong with this beach?
              </label>
              <textarea
                autoFocus
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Wrong location, beach doesn't exist, duplicate of another beach…"
                rows={3}
                maxLength={300}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5
                           text-white text-sm placeholder-white/25 focus:outline-none
                           focus:border-seafoam transition-colors resize-none"
              />
              <p className="text-white/25 text-xs text-right mt-1">{reason.length}/300</p>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || reason.trim().length < 5}
              className="w-full bg-red-500/80 hover:bg-red-500 text-white font-bold py-3 rounded-xl
                         active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Sending…' : 'Send report'}
            </button>
          </form>
        )}
      </div>
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
