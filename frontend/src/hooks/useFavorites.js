import { useState, useCallback } from 'react'

const KEY = 'cj_favorites'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(load)

  const toggleFavorite = useCallback((beachId) => {
    setFavorites(prev => {
      const next = prev.includes(beachId)
        ? prev.filter(id => id !== beachId)
        : [...prev, beachId]
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const isFavorite = useCallback((beachId) => favorites.includes(beachId), [favorites])

  return { favorites, toggleFavorite, isFavorite }
}
