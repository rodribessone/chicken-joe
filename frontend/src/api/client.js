const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// Attach bearer token if one is stored
function authHeader() {
  const token = localStorage.getItem('cj_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { ...authHeader() } })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json()
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body:    JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json()
}

async function patch(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body:    JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json()
}

async function del(path) {
  const res = await fetch(`${BASE}${path}`, {
    method:  'DELETE',
    headers: { ...authHeader() },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  // 204 No Content — no body to parse
  if (res.status === 204) return null
  return res.json()
}

// OAuth2 login requires application/x-www-form-urlencoded, not JSON
async function postForm(path, fields) {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams(fields),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.detail ?? `API ${res.status}`), { status: res.status, detail: err.detail })
  }
  return res.json()
}

export const api = {
  // Beaches
  getBeaches:     ()                         => get('/beaches'),
  getConditions:  (id)                       => get(`/beaches/${id}/conditions`),
  getTides:       (id)                       => get(`/beaches/${id}/tides`),
  getForecast:    (id)                       => get(`/beaches/${id}/forecast`),
  addBeach:       (payload)                  => post('/beaches', payload),

  // Reports
  getReports:     (id, period = 'today')     => get(`/beaches/${id}/reports?period=${period}`),
  createReport:   (id, payload)              => post(`/beaches/${id}/reports`, payload),
  getTags:        ()                         => get('/tags'),

  // Beach suggestions / flagging
  suggestBeach:   (payload)                  => post('/beaches/suggest', payload),
  flagBeach:      (id, payload)              => post(`/beaches/${id}/flag`, payload),
  getBeachFlags:  (id)                       => get(`/beaches/${id}/flags`),

  // Report votes + edit/delete
  voteReport:     (reportId, vote)           => post(`/reports/${reportId}/vote`, { vote }),
  updateReport:   (reportId, payload)        => patch(`/reports/${reportId}`, payload),
  deleteReport:   (reportId)                 => del(`/reports/${reportId}`),

  // Admin — beach flags
  adminGetFlags:          ()             => get('/admin/flags'),
  adminDismissFlag:       (flagId)       => post(`/admin/flags/${flagId}/dismiss`, {}),
  adminRemoveBeach:       (beachId)      => del(`/admin/beaches/${beachId}`),
  // Admin — suggestions
  adminGetSuggestions:    ()             => get('/admin/suggestions'),
  adminApproveSuggestion: (id)           => post(`/admin/suggestions/${id}/approve`, {}),
  adminRejectSuggestion:  (id)           => del(`/admin/suggestions/${id}`),
  // Admin — reports
  adminGetReports:        ()             => get('/admin/reports'),
  adminDeleteReport:      (id)           => del(`/admin/reports/${id}`),

  // Auth
  login:          (username, password)       => postForm('/auth/login', { username, password }),
  register:       (payload)                  => post('/auth/register', payload),
  getMe:          ()                         => get('/auth/me'),
  getProfile:     ()                         => get('/auth/profile'),
}
