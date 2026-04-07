import { useT } from '../i18n/LangContext'

export default function AdPlaceholder() {
  const t = useT()
  return (
    <div className="mt-4 h-16 bg-white/5 border border-dashed border-white/15 rounded-2xl flex items-center justify-center">
      <span className="text-white/25 text-xs uppercase tracking-widest font-medium">
        {t('ad.label')}
      </span>
    </div>
  )
}
