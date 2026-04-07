import { useState } from 'react'
import { useT, useGlossary } from '../i18n/LangContext'

export default function GlossarySection() {
  const t       = useT()
  const terms   = useGlossary()
  const [open, setOpen]       = useState(false)
  const [expanded, setExpanded] = useState(null)

  const toggle = (i) => setExpanded(prev => prev === i ? null : i)

  return (
    <section className="mt-4">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 hover:bg-white/8 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📖</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">
              {t('glossary.title')}
            </p>
            <p className="text-white/35 text-xs mt-0.5">{t('glossary.subtitle')}</p>
          </div>
        </div>
        <ChevronIcon open={open} />
      </button>

      {/* Terms list */}
      {open && (
        <div className="mt-2 space-y-1.5">
          {terms.map((item, i) => (
            <TermCard
              key={i}
              item={item}
              expanded={expanded === i}
              onToggle={() => toggle(i)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function TermCard({ item, expanded, onToggle }) {
  return (
    <div
      className={`
        rounded-xl border transition-all overflow-hidden
        ${expanded
          ? 'bg-white/10 border-white/20'
          : 'bg-white/5 border-white/10 hover:bg-white/8'
        }
      `}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={onToggle}
      >
        <span className="text-xl flex-shrink-0">{item.icon}</span>
        <span className="text-sm font-semibold text-white/85 flex-1">{item.term}</span>
        <ChevronIcon open={expanded} small />
      </button>

      {expanded && (
        <div className="px-4 pb-4 -mt-1">
          <p className="text-white/60 text-sm leading-relaxed pl-9">{item.desc}</p>
        </div>
      )}
    </div>
  )
}

function ChevronIcon({ open, small = false }) {
  return (
    <svg
      className={`
        flex-shrink-0 transition-transform duration-200 text-white/30
        ${small ? 'w-4 h-4' : 'w-5 h-5'}
        ${open ? 'rotate-180' : ''}
      `}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}
