import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, Users, FileText, DollarSign, Mic,
  ArrowUpRight, BarChart2, Loader2, Package, Award
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import backendClient from '../../api/axios'

const api = {
  analytics: (months) =>
    backendClient.get(`/analytics/dashboard?months=${months}`).then(r => r.data?.data),
}

const inr = (v) => '₹' + Number(v ?? 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})
const inrShort = (v) => {
  const n = Number(v ?? 0)
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
  if (n >= 1000)   return '₹' + (n / 1000).toFixed(1) + 'K'
  return '₹' + n.toFixed(0)
}

const STATUS_COLORS = {
  PAID:      '#22d3ee',
  PENDING:   '#f59e0b',
  OVERDUE:   '#f43f5e',
  DRAFT:     '#64748b',
  SENT:      '#3b82f6',
  CANCELLED: '#6b7280',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color ?? '#22d3ee' }}>
          {p.name === 'revenue' ? inr(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function Analytics() {
  const [months, setMonths] = useState(6)

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', months],
    queryFn: () => api.analytics(months),
    staleTime: 60_000,
  })

  const summary  = data?.summary          ?? {}
  const monthly  = data?.monthlyRevenue   ?? []
  const topProds = data?.topProducts      ?? []
  const topCusts = data?.topCustomers     ?? []
  const byStatus = data?.invoicesByStatus ?? []
  const daily    = data?.dailyRevenue     ?? []

  const statCards = [
    { label: 'Total Revenue',    value: inr(summary.totalRevenue),    icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'Pending Revenue',  value: inr(summary.pendingRevenue),  icon: TrendingUp, color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
    { label: 'Total Customers',  value: summary.totalCustomers ?? 0,  icon: Users,      color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20' },
    { label: 'Total Invoices',   value: summary.totalInvoices  ?? 0,  icon: FileText,   color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20' },
    { label: 'Paid Invoices',    value: summary.paidInvoices   ?? 0,  icon: ArrowUpRight, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'Overdue Invoices', value: summary.overdueInvoices ?? 0, icon: FileText,   color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20' },
    { label: 'Voice Sessions',   value: summary.voiceSessions  ?? 0,  icon: Mic,        color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20' },
  ]

  return (
    <div className="space-y-6 font-dm">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-syne text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Sales performance and business insights</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {[3, 6, 12].map(m => (
            <button key={m} onClick={() => setMonths(m)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                months === m
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}>
              {m}M
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          Failed to load analytics: {error.message}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-slate-600" />
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
            {statCards.map(({ label, value, icon: Icon, color, bg, border }) => (
              <div key={label} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className={`w-8 h-8 rounded-lg ${bg} border ${border} flex items-center justify-center mb-3`}>
                  <Icon size={15} className={color} />
                </div>
                <p className="text-xl font-bold font-syne text-white">{value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Revenue area chart */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={16} className="text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-200">Monthly Revenue</h2>
            </div>
            {monthly.length === 0 ? (
              <p className="text-center text-slate-600 text-sm py-12">No revenue data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthly} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={inrShort} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="revenue"
                    stroke="#22d3ee" strokeWidth={2}
                    fill="url(#revenueGrad)" dot={{ fill: '#22d3ee', strokeWidth: 0, r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Daily revenue bar */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
              <div className="flex items-center gap-2 mb-5">
                <BarChart2 size={16} className="text-violet-400" />
                <h2 className="text-sm font-semibold text-slate-200">Daily Revenue (30 days)</h2>
              </div>
              {daily.length === 0 ? (
                <p className="text-center text-slate-600 text-sm py-12">No daily data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={daily} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 9 }}
                      axisLine={false} tickLine={false}
                      tickFormatter={d => d.slice(5)} // MM-DD
                    />
                    <YAxis tickFormatter={inrShort} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" name="revenue" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Invoice status pie */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
              <div className="flex items-center gap-2 mb-5">
                <FileText size={16} className="text-amber-400" />
                <h2 className="text-sm font-semibold text-slate-200">Invoices by Status</h2>
              </div>
              {byStatus.length === 0 ? (
                <p className="text-center text-slate-600 text-sm py-12">No invoice data yet</p>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={200}>
                    <PieChart>
                      <Pie data={byStatus} dataKey="count" nameKey="status"
                        cx="50%" cy="50%" outerRadius={75} innerRadius={40}
                        paddingAngle={3}>
                        {byStatus.map((entry) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#64748b'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {byStatus.map(s => (
                      <div key={s.status} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm"
                            style={{ background: STATUS_COLORS[s.status] ?? '#64748b' }} />
                          <span className="text-slate-400">{s.status}</span>
                        </div>
                        <span className="text-slate-200 font-semibold">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Top products */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
                <Package size={16} className="text-cyan-400" />
                <h2 className="text-sm font-semibold text-slate-200">Top Products by Revenue</h2>
              </div>
              {topProds.length === 0 ? (
                <p className="text-center text-slate-600 text-sm py-10">No product data yet</p>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {topProds.slice(0, 8).map((p, i) => (
                    <div key={p.productName} className="flex items-center gap-3 px-5 py-3">
                      <span className="w-5 text-xs text-slate-600 font-mono">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 font-medium truncate">{p.productName}</p>
                        <p className="text-xs text-slate-500">{p.totalQuantity} units sold</p>
                      </div>
                      <span className="text-sm font-semibold text-cyan-400 shrink-0">
                        {inr(p.totalRevenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top customers */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
                <Award size={16} className="text-amber-400" />
                <h2 className="text-sm font-semibold text-slate-200">Top Customers by Spending</h2>
              </div>
              {topCusts.length === 0 ? (
                <p className="text-center text-slate-600 text-sm py-10">No customer data yet</p>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {topCusts.slice(0, 8).map((c, i) => (
                    <div key={c.customerName} className="flex items-center gap-3 px-5 py-3">
                      <span className="w-5 text-xs text-slate-600 font-mono">{i + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600
                        flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {c.customerName[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 font-medium truncate">{c.customerName}</p>
                        <p className="text-xs text-slate-500">{c.totalInvoices} invoices</p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-400 shrink-0">
                        {inr(c.totalSpent)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}