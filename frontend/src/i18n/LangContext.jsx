import { createContext, useContext, useState, useCallback } from 'react'
import { ui, glossary, LANGS } from './translations'

const LangContext = createContext(null)

const STORAGE_KEY = 'cj_lang'
const DEFAULT_LANG = 'en'

function getInitialLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && LANGS[stored]) return stored
  } catch {/* ignore */}
  // Auto-detect from browser
  const browser = navigator.language?.slice(0, 2)
  return LANGS[browser] ? browser : DEFAULT_LANG
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang)

  const setLang = useCallback((code) => {
    if (!LANGS[code]) return
    setLangState(code)
    try { localStorage.setItem(STORAGE_KEY, code) } catch {/* ignore */}
  }, [])

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used inside LangProvider')
  return ctx
}

/**
 * Returns a translation function t(key) for the current language.
 * Falls back to English, then returns the key itself.
 */
export function useT() {
  const { lang } = useLang()
  return useCallback(
    (key) => ui[lang]?.[key] ?? ui[DEFAULT_LANG]?.[key] ?? key,
    [lang],
  )
}

/**
 * Returns the glossary terms array for the current language.
 */
export function useGlossary() {
  const { lang } = useLang()
  return glossary[lang] ?? glossary[DEFAULT_LANG]
}
