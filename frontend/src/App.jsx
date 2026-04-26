import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AppRoutes from './routes/index.jsx'
import { useAuthStore } from './store/useAuthStore'

/**
 * On mount: if the stored token is NOT a valid JWT (3 dot-separated parts)
 * clear it immediately so the user is sent to /login cleanly.
 * This removes old mock tokens like "mock-jwt-token-replace-with-real".
 */
function useClearStaleToken() {
  const { token, logout } = useAuthStore()
  useEffect(() => {
    if (token && token.split('.').length !== 3) {
      console.warn(
        '[App] Stale/invalid token found in localStorage — clearing.',
        'Value:', token.substring(0, 40)
      )
      logout()
    }
  }, []) // run once on mount
}

export default function App() {
  useClearStaleToken()

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background:  '#0f172a',
            color:       '#e2e8f0',
            border:      '1px solid #1e3a5f',
            fontFamily:  "'DM Sans', sans-serif",
            fontSize:    '0.875rem',
            borderRadius:'10px',
          },
          success: { iconTheme: { primary: '#22d3ee', secondary: '#0f172a' } },
          error:   { iconTheme: { primary: '#f43f5e', secondary: '#0f172a' } },
        }}
      />
      <AppRoutes />
    </BrowserRouter>
  )
}