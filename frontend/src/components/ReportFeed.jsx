import { useState } from 'react'
import { timeAgo } from '../utils'
import { useT } from '../i18n/LangContext'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/client'

// ─── helpers ────────────────────────────────────────────────────────────────

function toAEST(utcStr) {
  const utc = new Date(utcStr.replace(' ', 'T') + 'Z')
  return new Date(utc.getTime() + 10 * 60 * 60 * 1000)
}

function formatDate(utcStr) {
  const d = toAEST(utcStr)
  const today = new Date()
  const todayAEST = new Date(today.getTime() + 10 * 60 * 60 * 1000)

  const sameDay = (a, b) =>
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth()    === b.getUTCMonth()    &&
    a.getUTCDate()     === b.getUTCDate()

  if (sameDay(d, todayAEST)) return 'Today'

  const yesterdayAEST = new Date(todayAEST.getTime() - 24 * 60 * 60 * 1000)
  if (sameDay(d, yesterdayAEST)) return 'Yesterday'

  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

function groupByDay(reports) {
  const groups = {}
  for (const r of reports) {
    const label = formatDate(r.created_at)
    ;(groups[label] ??= []).push(r)
  }
  return groups
}

// ─── main component ──────────────────────────────────────────────────────────

export default function ReportFeed({ todayReports: initialToday, onLoadHistory, historyReports: initialHistory, historyLoading }) {
  const t = useT()
  const [historyOpen, setHistoryOpen] = useState(false)

  // Local copies so we can mutate without refetching
  const [today, setToday]     = useState(initialToday)
  const [history, setHistory] = useState(initialHistory)

  // Sync when props change (beach switch / new report submitted)
  useState(() => { setToday(initialToday) }, [initialToday])
  useState(() => { setHistory(initialHistory) }, [initialHistory])

  // Vote state: { [reportId]: { upvotes, downvotes, userVote } }
  const [votes, setVotes] = useState({})
  const handleVoteChange = (reportId, result) =>
    setVotes(prev => ({ ...prev, [reportId]: result }))

  // Mutations
  const handleUpdated = (updated) => {
    const apply = list => list?.map(r => r.id === updated.id ? { ...r, ...updated } : r)
    setToday(apply)
    setHistory(apply)
  }
  const handleDeleted = (reportId) => {
    const apply = list => list?.filter(r => r.id !== reportId)
    setToday(apply)
    setHistory(apply)
  }

  const handleToggleHistory = () => {
    if (!historyOpen && initialHistory === null) onLoadHistory()
    setHistoryOpen(o => !o)
  }

  // Keep in sync when parent reloads
  const displayToday   = today   ?? initialToday
  const displayHistory = history ?? initialHistory

  return (
    <section className="mt-6 pb-4">
      {/* ── Today ── */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">
          {t('reports.today_title')}
        </h3>
        {displayToday.length > 0 && (
          <span className="text-xs bg-seafoam/15 text-seafoam px-2.5 py-0.5 rounded-full font-bold tabular-nums">
            {displayToday.length}
          </span>
        )}
      </div>

      {displayToday.length === 0 ? (
        <div className="bg-white/5 rounded-xl p-5 text-center">
          <p className="text-2xl mb-2">🤙</p>
          <p className="text-white/40 text-sm">{t('reports.no_today')}</p>
          <p className="text-white/25 text-xs mt-1">{t('reports.be_first')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayToday.map(r => (
            <ReportCard
              key={r.id}
              report={r}
              voteState={votes[r.id]}
              onVoteChange={handleVoteChange}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {/* ── History toggle ── */}
      <button
        onClick={handleToggleHistory}
        className="mt-4 w-full text-white/30 hover:text-white/50 text-xs transition-colors py-1.5 flex items-center justify-center gap-1.5"
      >
        <span>{historyOpen ? t('reports.hide_history') : t('reports.show_history')}</span>
        <span className={`transition-transform duration-200 ${historyOpen ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {/* ── History panel ── */}
      {historyOpen && (
        <div className="mt-2 border-t border-white/10 pt-4">
          <h4 className="text-xs font-semibold text-white/35 uppercase tracking-widest mb-3">
            {t('reports.history_title')}
          </h4>
          {historyLoading ? (
            <HistorySkeleton />
          ) : !displayHistory || displayHistory.length === 0 ? (
            <p className="text-white/25 text-xs text-center py-4">{t('reports.history_empty')}</p>
          ) : (
            <HistoryList
              reports={displayHistory}
              votes={votes}
              onVoteChange={handleVoteChange}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          )}
        </div>
      )}
    </section>
  )
}

// ─── Tag groups (mirrors ReportModal) ────────────────────────────────────────

const TAG_GROUPS = [
  { label: 'Conditions', tags: ['clean','choppy','glassy','pumping','barreling','closing out'] },
  { label: 'Crowd',      tags: ['empty','crowded'] },
  { label: 'Level',      tags: ['good for beginners','good for intermediates','experts only'] },
]
const ALL_TAGS = TAG_GROUPS.flatMap(g => g.tags)

// ─── ReportCard ──────────────────────────────────────────────────────────────

function ReportCard({ report, compact = false, voteState, onVoteChange, onUpdated, onDeleted }) {
  const { user } = useAuth()
  const [voteLoading, setVoteLoading]   = useState(false)
  const [editing, setEditing]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]         = useState(false)

  const isOwner = user && report.username && user.username === report.username
  const canEdit = isOwner || user?.is_admin

  const upvotes   = voteState?.upvotes   ?? report.upvotes   ?? 0
  const downvotes = voteState?.downvotes ?? report.downvotes ?? 0
  const userVote  = voteState?.userVote  ?? null

  const handleVote = async (vote) => {
    if (!user || voteLoading) return
    setVoteLoading(true)
    try {
      const result = await api.voteReport(report.id, vote)
      onVoteChange(report.id, {
        upvotes:   result.upvotes,
        downvotes: result.downvotes,
        userVote:  result.user_vote,
      })
    } catch { /* silent */ } finally {
      setVoteLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.deleteReport(report.id)
      onDeleted?.(report.id)
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (editing) {
    return (
      <EditForm
        report={report}
        onSave={updated => { onUpdated?.(updated); setEditing(false) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className={`bg-white/5 border border-white/10 rounded-xl ${compact ? 'p-3' : 'p-4'}`}>
      {/* Header row */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {report.username
            ? <span className="text-seafoam text-xs font-semibold">@{report.username}</span>
            : <span className="text-white/25 text-xs">anonymous</span>
          }
          <span className="text-white/20 text-xs">·</span>
          <span className="text-white/35 text-xs">{timeAgo(report.created_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          {!compact && <span className="text-white/20 text-xs">{report.beach_name}</span>}
          {/* Edit / Delete — only for owner or admin */}
          {canEdit && !confirmDelete && (
            <div className="flex items-center gap-1.5 ml-1">
              <button
                onClick={() => setEditing(true)}
                className="text-white/25 hover:text-seafoam transition-colors"
                title="Edit report"
              >
                <PencilIcon />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-white/25 hover:text-red-400 transition-colors"
                title="Delete report"
              >
                <TrashIcon />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Text */}
      {report.text && (
        <p className={`text-white/85 leading-relaxed ${compact ? 'text-xs' : 'text-sm'}`}>
          {report.text}
        </p>
      )}

      {/* Tags */}
      {report.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {report.tags.map(tag => (
            <span key={tag} className="text-xs px-2.5 py-0.5 rounded-full bg-seafoam/10 text-seafoam border border-seafoam/20 font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Inline delete confirmation */}
      {confirmDelete && (
        <div className="mt-3 flex items-center justify-between gap-3
                        bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2.5">
          <p className="text-red-300 text-xs font-medium">Delete this report?</p>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-white/50 hover:text-white text-xs px-2.5 py-1
                         rounded-lg bg-white/8 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-white text-xs font-bold px-3 py-1
                         bg-red-500 hover:bg-red-600 rounded-lg
                         active:scale-95 transition-all disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Vote row */}
      {!confirmDelete && (
        <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-white/8">
          <VoteButton type="up"   count={upvotes}   active={userVote === 1}  disabled={!user || voteLoading} onClick={() => handleVote(1)}  tooltip={user ? null : 'Log in to vote'} />
          <VoteButton type="down" count={downvotes} active={userVote === -1} disabled={!user || voteLoading} onClick={() => handleVote(-1)} tooltip={user ? null : 'Log in to vote'} />
        </div>
      )}
    </div>
  )
}

// ─── Inline edit form ─────────────────────────────────────────────────────────

function EditForm({ report, onSave, onCancel }) {
  const [text, setText]               = useState(report.text ?? '')
  const [selectedTags, setSelectedTags] = useState(report.tags ?? [])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)

  const toggleTag = (tag) =>
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(x => x !== tag) : [...prev, tag])

  const handleSave = async () => {
    if (!text.trim() && selectedTags.length === 0) {
      setError('Add at least one tag or comment.'); return
    }
    setLoading(true); setError(null)
    try {
      const updated = await api.updateReport(report.id, { text: text.trim(), tags: selectedTags })
      onSave(updated)
    } catch {
      setError('Could not save changes.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/5 border border-seafoam/30 rounded-xl p-4 space-y-3">
      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {ALL_TAGS.map(tag => {
          const active = selectedTags.includes(tag)
          return (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all
                ${active
                  ? 'bg-seafoam text-navy border-seafoam'
                  : 'bg-white/8 text-white/60 border-white/15 hover:border-white/30'
                }`}
            >
              {tag}
            </button>
          )
        })}
      </div>

      {/* Text */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Optional comment…"
        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white
                   text-sm placeholder-white/25 focus:outline-none focus:border-seafoam
                   transition-colors resize-none"
      />

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 bg-seafoam text-navy font-bold py-2 rounded-xl text-sm
                     hover:bg-seafoam-dark active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save changes'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm text-white/50 bg-white/8
                     hover:bg-white/12 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function VoteButton({ type, count, active, disabled, onClick, tooltip }) {
  const isUp = type === 'up'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`
        flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold
        transition-all active:scale-95
        ${active
          ? isUp
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
          : 'bg-white/5 text-white/30 border border-white/10 hover:text-white/60 hover:border-white/20'
        }
        ${disabled && !active ? 'cursor-default' : 'cursor-pointer'}
      `}
    >
      {isUp ? <ThumbUpIcon active={active} /> : <ThumbDownIcon active={active} />}
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  )
}

// ─── History ─────────────────────────────────────────────────────────────────

function HistoryList({ reports, votes, onVoteChange, onUpdated, onDeleted }) {
  const groups = groupByDay(reports)
  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([label, items]) => (
        <div key={label}>
          <p className="text-white/30 text-xs font-semibold mb-2 uppercase tracking-wide">{label}</p>
          <div className="space-y-2">
            {items.map(r => (
              <ReportCard
                key={r.id}
                report={r}
                compact
                voteState={votes[r.id]}
                onVoteChange={onVoteChange}
                onUpdated={onUpdated}
                onDeleted={onDeleted}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function HistorySkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3].map(i => <div key={i} className="h-14 bg-white/10 rounded-xl" />)}
    </div>
  )
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
    </svg>
  )
}

function ThumbUpIcon({ active }) {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017a2 2 0 01-1.789-1.106L7 13.5V11a2 2 0 012-2h2V4a1 1 0 011-1h1a1 1 0 011 1v6z" />
    </svg>
  )
}

function ThumbDownIcon({ active }) {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 011.789 1.106L17 10.5V13a2 2 0 01-2 2h-2v3a1 1 0 01-1 1h-1a1 1 0 01-1-1v-4z" />
    </svg>
  )
}
