import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { timeAgo } from '../utils'

export default function ProfileModal({ onClose }) {
  const { user, logout } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getProfile()
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => { logout(); onClose() }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-navy-light w-full max-w-md rounded-t-2xl sm:rounded-2xl
                      max-h-[88vh] flex flex-col shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex justify-between items-start px-6 pt-6 pb-5 border-b border-white/10 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-full bg-seafoam/20 flex items-center justify-center">
                <span className="text-seafoam font-black text-base">
                  {user?.username?.[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-white font-bold leading-tight">@{user?.username}</p>
                {user?.is_admin && (
                  <span className="text-[10px] bg-seafoam/20 text-seafoam px-1.5 py-0.5 rounded font-semibold">
                    admin
                  </span>
                )}
              </div>
            </div>
            <p className="text-white/35 text-xs">{user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="text-white/30 hover:text-red-400 text-xs border border-white/15
                         hover:border-red-400/30 px-2.5 py-1.5 rounded-lg transition-all"
            >
              Log out
            </button>
            <button onClick={onClose} className="text-white/40 hover:text-white p-1">
              <XIcon />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {loading ? (
            <ProfileSkeleton />
          ) : profile ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <StatTile
                  value={profile.stats.total_reports}
                  label="Reports"
                  icon="📋"
                />
                <StatTile
                  value={profile.stats.upvotes_received}
                  label="👍 received"
                  color="text-emerald-400"
                />
                <StatTile
                  value={profile.stats.downvotes_received}
                  label="👎 received"
                  color="text-red-400"
                />
              </div>

              {/* Member since */}
              <p className="text-white/25 text-xs text-center">
                Member since {new Date(profile.created_at).toLocaleDateString('en-AU', {
                  month: 'long', year: 'numeric'
                })}
              </p>

              {/* Recent reports */}
              {profile.recent_reports.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">
                    Your recent reports
                  </h3>
                  <div className="space-y-2">
                    {profile.recent_reports.map(r => (
                      <div key={r.id} className="bg-white/5 rounded-xl p-3 border border-white/8">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-seafoam text-xs font-semibold">{r.beach_name}</span>
                          <span className="text-white/30 text-xs">{timeAgo(r.created_at)}</span>
                        </div>
                        {r.text && (
                          <p className="text-white/70 text-xs leading-relaxed">{r.text}</p>
                        )}
                        {r.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {r.tags.map(tag => (
                              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full
                                                          bg-seafoam/10 text-seafoam border border-seafoam/20">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-3 mt-2 text-[11px] text-white/30">
                          <span>👍 {r.upvotes}</span>
                          <span>👎 {r.downvotes}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {profile.recent_reports.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-2xl mb-2">🤙</p>
                  <p className="text-white/40 text-sm">No reports yet</p>
                  <p className="text-white/25 text-xs mt-1">Be the first to report conditions at your local!</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-white/40 text-sm text-center py-6">Could not load profile.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatTile({ value, label, icon, color = 'text-white' }) {
  return (
    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/8">
      {icon && <p className="text-xl mb-1">{icon}</p>}
      <p className={`text-2xl font-black tabular-nums ${color}`}>{value}</p>
      <p className="text-white/35 text-xs mt-0.5">{label}</p>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => <div key={i} className="h-20 bg-white/10 rounded-xl" />)}
      </div>
      <div className="space-y-2">
        {[1,2,3].map(i => <div key={i} className="h-16 bg-white/10 rounded-xl" />)}
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
