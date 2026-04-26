// src/routes/index.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import DashboardLayout from '../layouts/DashboardLayout'
import Login        from '../pages/Login'
import Register     from '../pages/Register'
import Dashboard    from '../pages/Dashboard'
import Products     from '../pages/products/Products'
import Customers    from '../pages/customers/Customers'
import Invoices     from '../pages/invoices/Invoices'
import VoiceBilling from '../pages/VoiceBilling'
import Analytics    from '../pages/analytics/Analytics'
import Settings     from '../pages/settings/Settings'

function ProtectedRoute({ children }) {
  const token = useAuthStore(s => s.token)
  const isValid = token && token.split('.').length === 3
  if (!isValid) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const token = useAuthStore(s => s.token)
  const isValid = token && token.split('.').length === 3
  if (isValid) return <Navigate to="/dashboard" replace />
  return children
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index                   element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"        element={<Dashboard />} />
        <Route path="invoices"         element={<Invoices />} />
        <Route path="products"         element={<Products />} />
        <Route path="customers"        element={<Customers />} />
        <Route path="voice-billing"    element={<VoiceBilling />} />
        <Route path="analytics"        element={<Analytics />} />
        <Route path="settings"         element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}