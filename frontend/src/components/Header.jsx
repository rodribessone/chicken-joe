import { useT } from '../i18n/LangContext'
import { useAuth } from '../auth/AuthContext'
import LangSwitcher from './LangSwitcher'

export default function Header({ onAuthOpen, onAdminOpen, onProfileOpen }) {
  const t = useT()
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-10 bg-navy-dark/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
        <SurfboardIcon />
        <div className="leading-none flex-1">
          <h1 className="text-xl font-black tracking-tight text-white">Chicken Joe</h1>
          <p className="text-xs text-seafoam mt-0.5">{t('header.region')}</p>
        </div>

        <LangSwitcher />

        {user ? (
          <div className="flex items-center gap-2">
            {user.is_admin && (
              <button
                onClick={onAdminOpen}
                title="Admin panel"
                className="text-xs font-bold bg-seafoam/15 text-seafoam border border-seafoam/30
                           px-2.5 py-1 rounded-lg hover:bg-seafoam/25 transition-all"
              >
                🛡️
              </button>
            )}
            <button
              onClick={onProfileOpen}
              className="text-right leading-none hover:opacity-80 transition-opacity"
            >
              <p className="text-seafoam text-xs font-bold">@{user.username}</p>
            </button>
            <button
              onClick={logout}
              title="Log out"
              className="text-white/30 hover:text-white/70 transition-colors p-1"
            >
              <LogoutIcon />
            </button>
          </div>
        ) : (
          <button
            onClick={onAuthOpen}
            className="text-xs font-bold text-seafoam border border-seafoam/30 hover:border-seafoam
                       px-3 py-1.5 rounded-lg transition-all hover:bg-seafoam/10 active:scale-95"
          >
            Log in
          </button>
        )}
      </div>
    </header>
  )
}

function SurfboardIcon() {
  return (
    <svg width="22" height="38" viewBox="0 0 22 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M11 1C11 1 2 11 2 22C2 33 6.5 37 11 37C15.5 37 20 33 20 22C20 11 11 1 11 1Z"
        fill="#4dcfaa" stroke="#062840" strokeWidth="1"
      />
      <line x1="11" y1="5" x2="11" y2="31" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" />
      <ellipse cx="11" cy="31" rx="3" ry="1.5" fill="#062840" fillOpacity="0.4" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
    </svg>
  )
}
