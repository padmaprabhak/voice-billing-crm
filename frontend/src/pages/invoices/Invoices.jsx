import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Plus, Search, Download, Mail, CheckCircle2,
  Clock, AlertCircle, Loader2, Filter, X, Eye,
  ChevronDown, RefreshCw
} from 'lucide-react'
import Button from '../../components/ui/Button'
import backendClient from '../../api/axios'
import toast from 'react-hot-toast'

const api = {
  list:   (q) => backendClient.get(`/invoices?${q}`).then(r => r.data?.data),
  status: (id, s) => backendClient.patch(`/invoices/${id}/status?status=${s}`).then(r => r.data?.data),
  email:  (id, to) => backendClient.post(`/invoices/${id}/email`, to ? { toEmail: to } : {}).then(r => r.data),
  pdf:    (id) => backendClient.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
}

const inr = (v) => '₹' + Number(v ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })

const STATUS_CONFIG = {
  PAID:      { style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  PENDING:   { style: 'bg-amber-500/10 text-amber-400 border-amber-500/20',       icon: Clock },
  OVERDUE:   { style: 'bg-rose-500/10 text-rose-400 border-rose-500/20',          icon: AlertCircle },
  DRAFT:     { style: 'bg-slate-500/10 text-slate-400 border-slate-500/20',       icon: FileText },
  SENT:      { style: 'bg-blue-500/10 text-blue-400 border-blue-500/20',          icon: Mail },
  CANCELLED: { style: 'bg-red-900/20 text-red-400 border-red-500/20',             icon: X },
}

// ── Invoice Detail Panel ───────────────────────────────────────────────
function InvoiceDetail({ invoice, onClose, onStatusChange }) {
  const [downloading, setDownloading] = useState(false)
  const [sending,     setSending]     = useState(false)
  const [emailInput,  setEmailInput]  = useState('')
  const [showEmail,   setShowEmail]   = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const handleDownloadPdf = async () => {
    setDownloading(true)
    try {
      const res = await api.pdf(invoice.id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a   = document.createElement('a')
      a.href = url; a.download = `${invoice.invoiceNumber}.pdf`; a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch { } finally { setDownloading(false) }
  }

  const handleSendEmail = async () => {
    setSending(true)
    try {
      await api.email(invoice.id, emailInput || null)
      toast.success('Invoice emailed successfully')
      setShowEmail(false)
    } catch { } finally { setSending(false) }
  }

  const handleStatus = async (newStatus) => {
    setUpdatingStatus(true)
    try {
      await onStatusChange(invoice.id, newStatus)
      toast.success(`Status updated to ${newStatus}`)
    } catch { } finally { setUpdatingStatus(false) }
  }

  const cfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.DRAFT

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <p className="font-mono text-sm font-semibold text-cyan-400">{invoice.invoiceNumber}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {new Date(invoice.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${cfg.style}`}>
              {invoice.status}
            </span>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1 transition">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Customer */}
          <div className="px-5 py-4 border-b border-slate-800">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Customer</p>
            <p className="text-sm font-semibold text-slate-200">{invoice.customer?.name}</p>
            {invoice.customer?.email && <p className="text-xs text-slate-500 mt-0.5">{invoice.customer.email}</p>}
            {invoice.customer?.phone && <p className="text-xs text-slate-500">{invoice.customer.phone}</p>}
          </div>

          {/* Items */}
          <div className="px-5 py-4 border-b border-slate-800">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Items</p>
            <div className="space-y-2">
              {invoice.items?.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-slate-300">{item.description}</p>
                    <p className="text-[11px] text-slate-500">
                      {item.quantity} × {inr(item.price)}
                      {item.gstPercentage > 0 && ` + ${item.gstPercentage}% GST`}
                    </p>
                  </div>
                  <p className="text-slate-200 font-semibold">{inr(item.total)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="px-5 py-4 border-b border-slate-800 space-y-2">
            {[
              { label: 'Subtotal',  value: inr(invoice.totalAmount) },
              invoice.discountAmount > 0 && { label: `Discount (${invoice.discountPercent}%)`, value: '- ' + inr(invoice.discountAmount), color: 'text-emerald-400' },
              { label: 'Total GST', value: inr(invoice.totalGST) },
            ].filter(Boolean).map(row => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <p className="text-slate-500">{row.label}</p>
                <p className={row.color ?? 'text-slate-300'}>{row.value}</p>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <p className="text-sm font-bold text-slate-200">TOTAL</p>
              <p className="text-xl font-bold text-cyan-400 font-syne">{inr(invoice.finalAmount)}</p>
            </div>
          </div>

          {/* Status update */}
          <div className="px-5 py-4 border-b border-slate-800">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(STATUS_CONFIG).map(s => (
                <button key={s} disabled={s === invoice.status || updatingStatus}
                  onClick={() => handleStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    s === invoice.status
                      ? STATUS_CONFIG[s].style + ' opacity-60 cursor-default'
                      : 'bg-transparent text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Voice transcript */}
          {invoice.voiceTranscript && (
            <div className="px-5 py-4 border-b border-slate-800">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Voice Generated
              </p>
              <p className="text-xs text-slate-400 italic">"{invoice.voiceTranscript}"</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-800 space-y-3">
          <Button icon={Download} fullWidth variant="primary"
            loading={downloading} onClick={handleDownloadPdf}>
            Download PDF Invoice
          </Button>

          {showEmail ? (
            <div className="space-y-2">
              <input value={emailInput} onChange={e => setEmailInput(e.target.value)}
                placeholder={invoice.customer?.email || 'customer@email.com'}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm
                  text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
              <div className="flex gap-2">
                <Button icon={Mail} fullWidth loading={sending} onClick={handleSendEmail}>Send Invoice</Button>
                <Button variant="ghost" onClick={() => setShowEmail(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button icon={Mail} fullWidth variant="secondary"
              onClick={() => setShowEmail(true)}>
              Email Invoice to Customer
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────
export default function Invoices() {
  const [search,   setSearch]   = useState('')
  const [query,    setQuery]    = useState('')
  const [status,   setStatus]   = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate,   setToDate]   = useState('')
  const [selected, setSelected] = useState(null)
  const qc = useQueryClient()

  const params = new URLSearchParams({
    page: 0, size: 100, sortBy: 'createdAt', sortDir: 'desc',
    ...(query    && { search: query }),
    ...(status   && { status }),
    ...(fromDate && { fromDate }),
    ...(toDate   && { toDate }),
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['invoices', query, status, fromDate, toDate],
    queryFn: () => api.list(params.toString()),
    staleTime: 30_000,
  })
  const invoices = data?.content ?? []

  const statusMutation = useMutation({
    mutationFn: ({ id, s }) => api.status(id, s),
    onSuccess: (updated) => {
      qc.invalidateQueries(['invoices'])
      if (selected?.id === updated.id) setSelected(updated)
    },
  })

  const totalRevenue = invoices
    .filter(i => i.status === 'PAID')
    .reduce((s, i) => s + Number(i.finalAmount ?? 0), 0)

  const clearFilters = () => { setQuery(''); setSearch(''); setStatus(''); setFromDate(''); setToDate('') }

  return (
    <div className="space-y-6 font-dm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-syne text-2xl font-bold text-white">Invoices</h1>
          <p className="text-sm text-slate-500 mt-0.5">All invoices in ₹ (INR) with GST</p>
        </div>
        <div className="flex items-center gap-2">
          {(query || status || fromDate || toDate) && (
            <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>Clear Filters</Button>
          )}
          <Button icon={Plus}>New Invoice</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',   value: invoices.length,                                 color: 'text-white' },
          { label: 'Paid',    value: invoices.filter(i=>i.status==='PAID').length,    color: 'text-emerald-400' },
          { label: 'Pending', value: invoices.filter(i=>i.status==='PENDING').length, color: 'text-amber-400' },
          { label: 'Revenue', value: '₹' + Number(totalRevenue).toLocaleString('en-IN', {minimumFractionDigits:0}), color: 'text-cyan-400' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <p className={`text-xl font-bold font-syne ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <form className="flex gap-2 flex-1 min-w-52" onSubmit={e => { e.preventDefault(); setQuery(search) }}>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Invoice # or customer name…"
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm
                text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
          </div>
          <Button type="submit" variant="secondary" size="md">Search</Button>
        </form>

        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300 focus:outline-none">
          <option value="">All Status</option>
          {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300 focus:outline-none" />
        <span className="text-slate-600 text-xs">to</span>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300 focus:outline-none" />
      </div>

      {error && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
        Failed to load invoices: {error.message}
      </div>}

      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
          <FileText size={16} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">All Invoices</h2>
          <span className="ml-2 px-2 py-0.5 rounded-md bg-slate-800 text-xs text-slate-400 border border-slate-700">
            {invoices.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-600" /></div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 text-slate-600 text-sm">No invoices found. Use Voice Billing to create one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Invoice', 'Customer', 'Amount', 'GST', 'Status', 'Date', 'Due', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => {
                  const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.DRAFT
                  const Ico = cfg.icon
                  const isOverdue = inv.status === 'OVERDUE'
                  return (
                    <tr key={inv.id}
                      className={`border-b border-slate-800/50 hover:bg-slate-800/40 transition cursor-pointer
                        ${i === invoices.length - 1 ? 'border-b-0' : ''}`}
                      onClick={() => setSelected(inv)}>
                      <td className="px-4 py-3.5 font-mono text-xs text-cyan-400">
                        {inv.invoiceNumber}
                        {inv.voiceGenerated && <span className="ml-1.5 text-[9px] text-violet-400 bg-violet-500/10 px-1 py-0.5 rounded">🎙</span>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-300 font-medium max-w-32 truncate">{inv.customer?.name}</td>
                      <td className="px-4 py-3.5 text-slate-200 font-semibold">{inr(inv.finalAmount)}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{inr(inv.totalGST)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${cfg.style}`}>
                          <Ico size={10} /> {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">
                        {new Date(inv.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                      </td>
                      <td className={`px-4 py-3.5 text-xs ${isOverdue ? 'text-rose-400 font-semibold' : 'text-slate-500'}`}>
                        {inv.dueDate
                          ? new Date(inv.dueDate).toLocaleDateString('en-IN', { day:'numeric', month:'short' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSelected(inv)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition" title="View">
                            <Eye size={13} />
                          </button>
                          <DownloadBtn invoiceId={inv.id} invoiceNum={inv.invoiceNumber} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <InvoiceDetail
          invoice={selected}
          onClose={() => setSelected(null)}
          onStatusChange={(id, s) => statusMutation.mutateAsync({ id, s })}
        />
      )}
    </div>
  )
}

// Inline PDF download button
function DownloadBtn({ invoiceId, invoiceNum }) {
  const [loading, setLoading] = useState(false)
  return (
    <button title="Download PDF"
      className="p-1.5 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition"
      onClick={async (e) => {
        e.stopPropagation()
        setLoading(true)
        try {
          const res = await backendClient.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' })
          const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
          const a   = document.createElement('a')
          a.href = url; a.download = `${invoiceNum}.pdf`; a.click()
          URL.revokeObjectURL(url)
        } catch {} finally { setLoading(false) }
      }}>
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
    </button>
  )
}