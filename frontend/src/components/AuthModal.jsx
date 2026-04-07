/**
 * AuthModal — Login / Register modal for Chicken Joe.
 *
 * Two-tab UI: Login | Register
 * On success: closes automatically (auth state updates via AuthContext).
 */

import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

const base  = 'w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-seafoam transition-colors'
const label = 'block text-xs text-white/50 uppercase tracking-wide mb-1.5 font-semibold'

export default function AuthModal({ onClose, initialTab = 'login' }) {
  const [tab, setTab] = useState(initialTab)   // 'login' | 'register'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-navy-light w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6
                      max-h-[92vh] overflow-y-auto shadow-2xl border border-white/10">

        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">🏄 Chicken Joe</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1 -mr-1">
            <XIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white/5 rounded-xl p-1">
          {['login', 'register'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t
                  ? 'bg-seafoam text-navy shadow'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {t === 'login' ? 'Log in' : 'Sign up'}
            </button>
          ))}
        </div>

        {tab === 'login'
          ? <LoginForm onClose={onClose} onSwitch={() => setTab('register')} />
          : <RegisterForm onClose={onClose} onSwitch={() => setTab('login')} />
        }
      </div>
    </div>
  )
}

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginForm({ onClose, onSwitch }) {
  const { login } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword]     = useState('')
  const [error, setError]           = useState(null)
  const [loading, setLoading]       = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identifier.trim() || !password) return
    setLoading(true); setError(null)
    try {
      await login(identifier.trim(), password)
      onClose()
    } catch (err) {
      setError(err.detail ?? 'Incorrect username/email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={label}>Username or email</label>
        <input
          type="text"
          autoFocus
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          placeholder="your_username or you@email.com"
          className={base}
          autoComplete="username"
        />
      </div>
      <div>
        <label className={label}>Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          className={base}
          autoComplete="current-password"
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !identifier.trim() || !password}
        className="w-full bg-seafoam text-navy font-bold py-3 rounded-xl
                   hover:bg-seafoam-dark active:scale-95 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {loading ? 'Logging in…' : 'Log in'}
      </button>

      <p className="text-center text-white/40 text-xs pt-1">
        No account?{' '}
        <button type="button" onClick={onSwitch} className="text-seafoam hover:text-seafoam-dark font-semibold">
          Sign up free
        </button>
      </p>
    </form>
  )
}

// ─── Register form ────────────────────────────────────────────────────────────

function RegisterForm({ onClose, onSwitch }) {
  const { register } = useAuth()
  const [email, setEmail]         = useState('')
  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError("Passwords don't match."); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers and underscores.')
      return
    }
    setLoading(true); setError(null)
    try {
      await register(email.trim(), username.trim(), password)
      onClose()
    } catch (err) {
      const msg = err.detail ?? err.message ?? 'Could not create account.'
      if (msg.toLowerCase().includes('email')) setError('That email is already registered.')
      else if (msg.toLowerCase().includes('username')) setError('That username is already taken.')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={label}>Email</label>
        <input
          type="email"
          autoFocus
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@email.com"
          className={base}
          autoComplete="email"
        />
      </div>
      <div>
        <label className={label}>
          Username
          <span className="text-white/25 normal-case ml-1 font-normal">(letters, numbers, _)</span>
        </label>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="surf_legend"
          className={base}
          autoComplete="username"
          minLength={3}
          maxLength={30}
        />
      </div>
      <div>
        <label className={label}>Password <span className="text-white/25 normal-case font-normal">min. 8 chars</span></label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          className={base}
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className={label}>Confirm password</label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="••••••••"
          className={base}
          autoComplete="new-password"
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !email || !username || !password || !confirm}
        className="w-full bg-seafoam text-navy font-bold py-3 rounded-xl
                   hover:bg-seafoam-dark active:scale-95 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {loading ? 'Creating account…' : '🤙 Create account'}
      </button>

      <p className="text-center text-white/40 text-xs pt-1">
        Already have an account?{' '}
        <button type="button" onClick={onSwitch} className="text-seafoam hover:text-seafoam-dark font-semibold">
          Log in
        </button>
      </p>
    </form>
  )
}

// ─── Icon ─────────────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
