import { useLang } from '../i18n/LangContext'
import { LANGS } from '../i18n/translations'

export default function LangSwitcher() {
  const { lang, setLang } = useLang()

  return (
    <div className="flex items-center gap-0.5">
      {Object.entries(LANGS).map(([code, { flag, label }]) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          title={LANGS[code].name}
          className={`
            text-xs px-2 py-1 rounded-lg font-semibold transition-all
            ${lang === code
              ? 'bg-seafoam text-navy'
              : 'text-white/40 hover:text-white/70 hover:bg-white/10'
            }
          `}
        >
          {flag} {label}
        </button>
      ))}
    </div>
  )
}
