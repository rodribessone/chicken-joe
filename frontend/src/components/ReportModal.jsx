/**
 * ReportModal — surf report submission.
 *
 * UX philosophy: tags are the primary action (one-tap), text is optional.
 * A report is valid as long as at least one tag is selected OR text is provided.
 */

import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useT } from '../i18n/LangContext'
import { useAuth } from '../auth/AuthContext'

// Tag categories for visual grouping
const TAG_GROUPS = [
  {
    label: 'Conditions',
    tags: ['clean', 'choppy', 'glassy', 'pumping', 'barreling', 'closing out'],
  },
  {
    label: 'Crowd',
    tags: ['empty', 'crowded'],
  },
  {
    label: 'Level',
    tags: ['good for beginners', 'good for intermediates', 'experts only'],
  },
]

const FALLBACK_TAGS = TAG_GROUPS.flatMap(g => g.tags)

export default function ReportModal({ beaches, defaultBeachId, onClose, onSubmit }) {
  const t = useT()
  const { user } = useAuth()

  const [beachId, setBeachId]           = useState(defaultBeachId)
  const [text, setText]                 = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [availableTags, setAvailableTags] = useState(FALLBACK_TAGS)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)

  useEffect(() => {
    api.getTags().then(d => setAvailableTags(d.tags)).catch(() => {})
  }, [])

  const toggleTag = (tag) =>
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(x => x !== tag) : [...prev, tag])

  const canSubmit = selectedTags.length > 0 || text.trim().length > 0

  const handleSubmit = async () => {
    if (!canSubmit) { setError('Select at least one tag or write a comment.'); return }
    setLoading(true); setError(null)
    try {
      await onSubmit(beachId, { text: text.trim(), tags: selectedTags })
    } catch {
      setError(t('report.error_fail'))
      setLoading(false)
    }
  }

  // Build grouped tag buttons from available tags list
  const groups = TAG_GROUPS.map(g => ({
    ...g,
    tags: g.tags.filter(tag => availableTags.includes(tag)),
  })).filter(g => g.tags.length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-navy-light w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6
                      max-h-[92vh] overflow-y-auto shadow-2xl border border-white/10">

        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-lg font-bold">{t('report.modal_title')}</h2>
            {user && (
              <p className="text-seafoam text-xs mt-0.5">posting as @{user.username}</p>
            )}
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1 -mr-1">
            <XIcon />
          </button>
        </div>

        {/* Beach selector */}
        <div className="mb-5">
          <label className={lbl}>{t('report.beach')}</label>
          <select value={beachId} onChange={e => setBeachId(e.target.value)} className={inp}>
            {beaches.map(b => (
              <option key={b.id} value={b.id} className="bg-navy">{b.name}</option>
            ))}
          </select>
        </div>

        {/* Tags — primary action */}
        <div className="mb-5">
          <label className={lbl}>
            How's it looking?
            <span className="text-white/30 normal-case ml-1 font-normal">tap to select</span>
          </label>
          <div className="space-y-3">
            {groups.map(group => (
              <div key={group.label}>
                <p className="text-white/25 text-xs mb-1.5">{group.label}</p>
                <div className="flex flex-wrap gap-2">
                  {group.tags.map(tag => {
                    const active = selectedTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`
                          text-sm px-4 py-2 rounded-full border font-medium transition-all active:scale-95
                          ${active
                            ? 'bg-seafoam text-navy border-seafoam shadow-md shadow-seafoam/20'
                            : 'bg-white/8 text-white/70 border-white/15 hover:border-white/30 hover:text-white'
                          }
                        `}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comment — optional */}
        <div className="mb-5">
          <label className={lbl}>
            Comment
            <span className="text-white/30 normal-case ml-1 font-normal">optional</span>
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={t('report.placeholder')}
            rows={2}
            maxLength={500}
            className={`${inp} resize-none`}
          />
          {text.length > 0 && (
            <p className="text-white/25 text-xs text-right mt-1">{text.length}/500</p>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-4 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          className="w-full bg-seafoam text-navy font-bold py-3 rounded-xl
                     hover:bg-seafoam-dark active:scale-95 transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {loading ? t('report.submitting') : t('report.submit')}
        </button>
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

const inp = 'w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-seafoam transition-colors'
const lbl = 'block text-xs text-white/50 uppercase tracking-wide mb-2 font-semibold'
