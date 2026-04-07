import { useT } from '../i18n/LangContext'

export default function SearchInput({ value, onChange, onSuggest, noResults }) {
  const t = useT()

  return (
    <div className="mt-4 space-y-1.5">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
        <input
          type="search"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={t('search.placeholder')}
          className="w-full bg-white/10 border border-white/15 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-seafoam/60 transition-colors"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {noResults && value.trim() && (
        <div className="flex items-center justify-between px-1 py-1">
          <p className="text-white/40 text-xs">{t('search.no_results')} "{value}"</p>
          <button
            onClick={onSuggest}
            className="text-seafoam text-xs font-semibold hover:text-seafoam-dark transition-colors"
          >
            {t('search.suggest')}
          </button>
        </div>
      )}
    </div>
  )
}

function SearchIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
    </svg>
  )
}
