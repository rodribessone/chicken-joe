import { dotColor } from '../utils'

export default function BeachTabs({ beaches, selectedId, onSelect, allConditions, onAdd, isFavorite, onToggleFavorite }) {
  return (
    <div className="mt-1">
      {/* Scrollable beach pills */}
      <div className="relative -mx-4">
        <div className="flex gap-2 overflow-x-auto py-4 px-4 scrollbar-hide">
          {beaches.map(beach => {
            const score    = allConditions[beach.id]?.surf_score
            const selected = beach.id === selectedId
            const fav      = isFavorite?.(beach.id)

            return (
              <div key={beach.id} className="relative flex-shrink-0">
                <button
                  onClick={() => onSelect(beach.id)}
                  className={`
                    flex items-center gap-2 pl-3 pr-8 py-2 rounded-full text-sm
                    font-semibold transition-all duration-150
                    ${selected
                      ? 'bg-seafoam text-navy shadow-lg shadow-seafoam/20'
                      : 'bg-white/10 text-white/70 hover:bg-white/15 active:bg-white/20'
                    }
                  `}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 transition-colors"
                    style={{ backgroundColor: dotColor(score) }}
                  />
                  <span className="whitespace-nowrap">{beach.name}</span>
                  {score != null && (
                    <span className={`text-xs font-bold tabular-nums ${selected ? 'text-navy/60' : 'text-white/40'}`}>
                      {score}
                    </span>
                  )}
                </button>

                {/* Favorite star */}
                {onToggleFavorite && (
                  <button
                    onClick={e => { e.stopPropagation(); onToggleFavorite(beach.id) }}
                    title={fav ? 'Remove from favorites' : 'Add to favorites'}
                    className={`
                      absolute right-2 top-1/2 -translate-y-1/2
                      text-xs transition-all leading-none
                      ${fav ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}
                      ${selected ? 'text-navy/60 hover:text-navy' : 'text-white/30 hover:text-yellow-400'}
                    `}
                    style={{ fontSize: '11px' }}
                  >
                    {fav ? '★' : '☆'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {/* Fade right edge */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-navy to-transparent pointer-events-none" />
      </div>

      {/* Add beach — always visible, below the scroll strip */}
      <button
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl mb-5
                   border border-dashed border-white/20 text-white/50
                   hover:border-seafoam/50 hover:text-seafoam hover:bg-seafoam/5
                   active:scale-[.99] transition-all duration-150 text-sm font-medium"
      >
        <PlusIcon />
        Add a beach
      </button>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}
