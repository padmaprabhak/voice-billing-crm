import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import DashboardLayout from '../layouts/DashboardLayout'
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import Invoices from '../pages/Invoices'
import Customers from '../pages/Customers'
import VoiceBilling from '../pages/VoiceBilling'

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  if (token) return <Navigate to="/dashboard" replace />
  return children
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"     element={<Dashboard />} />
        <Route path="invoices"      element={<Invoices />} />
        <Route path="customers"     element={<Customers />} />
        <Route path="voice-billing" element={<VoiceBilling />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}