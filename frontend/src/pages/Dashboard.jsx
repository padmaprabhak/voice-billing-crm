import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Users, FileText, DollarSign, Mic, ArrowUpRight, Loader2 } from 'lucide-react'
import backendClient from '../api/axios'

// ── Fetch real stats from backend ────────────────────────────────────
function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await backendClient.get('/dashboard/stats')
      return res.data?.data ?? null
    },
    staleTime: 1000 * 30,   // refresh every 30 s
    retry: 2,
  })
}

function useRecentInvoices() {
  return useQuery({
    queryKey: ['recent-invoices'],
    queryFn: async () => {
      const res = await backendClient.get('/invoices?size=5&page=0&sortBy=createdAt&sortDir=desc')
      return res.data?.data?.content ?? []
    },
    staleTime: 1000 * 30,
    retry: 2,
  })
}

// ── Currency formatter ───────────────────────────────────────────────
function inr(value) {
  return '₹' + Number(value ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })
}

const STATUS_STYLE = {
  PAID:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  PENDING:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  OVERDUE:   'bg-rose-500/10 text-rose-400 border-rose-500/20',
  DRAFT:     'bg-slate-500/10 text-slate-400 border-slate-500/20',
  SENT:      'bg-blue-500/10 text-blue-400 border-blue-500/20',
  CANCELLED: 'bg-red-900/20 text-red-400 border-red-500/20',
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats()
  const { data: invoices = [], isLoading: invLoading } = useRecentInvoices()

  const statCards = stats ? [
    {
      label:  'Total Revenue',
      value:  inr(stats.totalRevenue),
      icon:   DollarSign,
      color:  'text-emerald-400',
      bg:     'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label:  'Active Customers',
      value:  Number(stats.activeCustomers ?? 0).toLocaleString('en-IN'),
      icon:   Users,
      color:  'text-cyan-400',
      bg:     'bg-cyan-500/10',
      border: 'border-cyan-500/20',
    },
    {
      label:  'Pending Invoices',
      value:  Number(stats.pendingInvoices ?? 0).toLocaleString(),
      icon:   FileText,
      color:  'text-amber-400',
      bg:     'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      label:  'Voice Sessions',
      value:  Number(stats.voiceSessions ?? 0).toLocaleString(),
      icon:   Mic,
      color:  'text-violet-400',
      bg:     'bg-violet-500/10',
      border: 'border-violet-500/20',
    },
  ] : []

  return (
    <div className="space-y-6 font-dm">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Welcome back — here's what's happening today.</p>
        </div>
        <span className="hidden sm:block text-xs text-slate-500 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Stats */}
      {statsError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          Could not load stats — is the backend running? ({statsError.message})
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center h-28">
                <Loader2 size={20} className="text-slate-600 animate-spin" />
              </div>
            ))
          : statCards.map(({ label, value, icon: Icon, color, bg, border }) => (
              <div key={label} className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                  <div className={`w-9 h-9 rounded-lg ${bg} border ${border} flex items-center justify-center`}>
                    <Icon size={17} className={color} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white font-syne">{value}</p>
              </div>
            ))}
      </div>

      {/* Recent invoices */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-200">Recent Invoices</h2>
          </div>
          <a href="/invoices" className="text-xs text-cyan-400 hover:text-cyan-300 transition font-medium">
            View all →
          </a>
        </div>

        {invLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="text-slate-600 animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-slate-600 text-sm">
            No invoices yet. Create one via Voice Billing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Invoice', 'Customer', 'Amount', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.id}
                    className={`border-b border-slate-800/50 hover:bg-slate-800/40 transition ${i === invoices.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="px-5 py-3.5 font-mono text-xs text-cyan-400">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3.5 text-slate-300 font-medium">{inv.customer?.name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-slate-200 font-semibold">{inr(inv.finalAmount)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${STATUS_STYLE[inv.status] ?? STATUS_STYLE.DRAFT}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}