import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/useAuthStore'

// ── Spring Boot backend ──────────────────────────────────────────────
export const backendClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:8080/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

// ── Flask AI service ─────────────────────────────────────────────────
// Content-Type intentionally omitted globally — FormData uploads need
// the browser to set the correct multipart boundary automatically.
export const aiClient = axios.create({
  baseURL: import.meta.env.VITE_AI_SERVICE_BASE_URL || 'http://localhost:5000/api',
  timeout: 60000,
  headers: { Accept: 'application/json' },
})

// ── Auth routes that must NEVER have a token attached ────────────────
const AUTH_ROUTES = ['/auth/login', '/auth/register']

// ── Attach JWT to every non-auth request ────────────────────────────
function attachToken(config) {
  const isAuthRoute = AUTH_ROUTES.some(r => config.url?.includes(r))
  if (isAuthRoute) {
    console.debug('[Axios] Skipping token for auth route:', config.url)
    return config
  }

  const token = useAuthStore.getState().token

  // Guard: reject obviously invalid tokens before they reach the server
  if (token) {
    const parts = token.split('.')
    if (parts.length !== 3) {
      console.error(
        '[Axios] STALE / INVALID TOKEN DETECTED — clearing and redirecting to login.',
        'Token starts with:', token.substring(0, 30)
      )
      useAuthStore.getState().logout()
      toast.error('Your session is invalid. Please log in again.')
      window.location.href = '/login'
      return Promise.reject(new Error('Invalid token cleared — please log in again'))
    }

    config.headers['Authorization'] = `Bearer ${token}`
    console.debug('[Axios] JWT attached to:', config.url)
  } else {
    console.warn('[Axios] No token for protected route:', config.url)
  }

  return config
}

backendClient.interceptors.request.use(attachToken, err => Promise.reject(err))
aiClient.interceptors.request.use(attachToken, err => Promise.reject(err))

// ── Response error handler ───────────────────────────────────────────
function handleError(error) {
  const status  = error?.response?.status
  const message = error?.response?.data?.error
              || error?.response?.data?.message
              || error?.message
              || 'Something went wrong'

  console.error('[Axios]', status, message, '| URL:', error?.config?.url)

  if (status === 401) {
    useAuthStore.getState().logout()
    toast.error('Session expired. Please login again.')
    window.location.href = '/login'
  } else if (status === 403) {
    // 403 after valid token = permissions issue OR stale mock token
    const storedToken = useAuthStore.getState().token
    if (!storedToken || storedToken.split('.').length !== 3) {
      useAuthStore.getState().logout()
      toast.error('Invalid session — please log in again.')
      window.location.href = '/login'
    } else {
      toast.error('Permission denied (403). ' + message)
    }
  } else if (status === 404) {
    toast.error('Resource not found.')
  } else if (status >= 500) {
    toast.error('Server error — check backend logs.')
  } else if (!error.response) {
    toast.error('Cannot connect — check that all services are running.')
  } else {
    toast.error(message)
  }

  return Promise.reject(error)
}

backendClient.interceptors.response.use(r => r, handleError)
aiClient.interceptors.response.use(r => r, handleError)

export default backendClient