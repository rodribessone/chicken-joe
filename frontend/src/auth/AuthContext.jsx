/**
 * AuthContext — user authentication state for Chicken Joe.
 *
 * Stores the JWT in localStorage under the key "cj_token".
 * On mount, validates any stored token against GET /auth/me.
 *
 * Exposes via useAuth():
 *   user       — { id, username, email, is_admin } | null
 *   loading    — true while validating token on first mount
 *   login(usernameOrEmail, password)  → Promise (throws on failure)
 *   logout()
 *   register(email, username, password) → Promise (throws on failure)
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../api/client'

const TOKEN_KEY = 'cj_token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)  // validating stored token

  // On mount: validate any stored token
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (!stored) { setLoading(false); return }

    api.getMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)  // expired / invalid
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (usernameOrEmail, password) => {
    const { access_token } = await api.login(usernameOrEmail, password)
    localStorage.setItem(TOKEN_KEY, access_token)
    const me = await api.getMe()
    setUser(me)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  const register = async (email, username, password) => {
    await api.register({ email, username, password })
    // Auto-login after successful registration
    await login(username, password)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
