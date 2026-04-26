import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Plus, Search, Mail, Phone, Edit2, Trash2,
  Loader2, X, FileText, TrendingUp, ChevronRight
} from 'lucide-react'
import Button from '../../components/ui/Button'
import backendClient from '../../api/axios'
import toast from 'react-hot-toast'

const api = {
  list:    (q)      => backendClient.get(`/customers?${q}`).then(r => r.data?.data),
  create:  (d)      => backendClient.post('/customers', d).then(r => r.data?.data),
  update:  (id, d)  => backendClient.put(`/customers/${id}`, d).then(r => r.data?.data),
  remove:  (id)     => backendClient.delete(`/customers/${id}`),
  invoices:(id)     => backendClient.get(`/invoices?customerId=${id}&size=20&sortBy=createdAt&sortDir=desc`).then(r => r.data?.data?.content ?? []),
}

const inr = (v) => '₹' + Number(v ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
const STATUS_STYLE = {
  ACTIVE:    'bg-emerald-500/10 text-emerald-400',
  INACTIVE:  'bg-slate-700 text-slate-500',
  SUSPENDED: 'bg-rose-500/10 text-rose-400',
}
const INV_STATUS = {
  PAID:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  OVERDUE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  DRAFT:   'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

// ── Customer Form Modal ────────────────────────────────────────────────
function CustomerModal({ customer, onClose, onSave }) {
  const [form, setForm] = useState({
    name:       customer?.name       ?? '',
    email:      customer?.email      ?? '',
    phone:      customer?.phone      ?? '',
    address:    customer?.address    ?? '',
    city:       customer?.city       ?? '',
    state:      customer?.state      ?? '',
    country:    customer?.country    ?? 'India',
    postalCode: customer?.postalCode ?? '',
    taxId:      customer?.taxId      ?? '',
    notes:      customer?.notes      ?? '',
    status:     customer?.status     ?? 'ACTIVE',
  })
  const [saving, setSaving] = useState(false)
  const s = (k) => (v) => setForm(f => ({ ...f, [k]: v }))

  const field = (label, key, type = 'text', ph = '') => (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 mb-1 tracking-wide">{label}</label>
      <input type={type} value={form[key] ?? ''} placeholder={ph}
        onChange={e => s(key)(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm
          text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2
          focus:ring-cyan-500/40 transition" />
    </div>
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try { await onSave(form); onClose() }
    catch { } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl my-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-syne text-lg font-bold text-white">
            {customer ? 'Edit Customer' : 'Add Customer'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {field('Full Name *', 'name', 'text', 'e.g. Rajesh Kumar')}
          <div className="grid grid-cols-2 gap-3">
            {field('Email', 'email', 'email', 'email@example.com')}
            {field('Phone', 'phone', 'tel', '+91 98765 43210')}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 tracking-wide">Address</label>
            <textarea value={form.address} rows={2} onChange={e => s('address')(e.target.value)}
              placeholder="Street address"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm
                text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2
                focus:ring-cyan-500/40 resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {field('City', 'city', 'text', 'Chennai')}
            {field('State', 'state', 'text', 'Tamil Nadu')}
            {field('PIN', 'postalCode', 'text', '600001')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('GSTIN / Tax ID', 'taxId', 'text', '22AAAAA0000A1Z5')}
            {field('Country', 'country', 'text', 'India')}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 tracking-wide">Notes</label>
            <textarea value={form.notes} rows={2} onChange={e => s('notes')(e.target.value)}
              placeholder="Internal notes about this customer"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm
                text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2
                focus:ring-cyan-500/40 resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            {['ACTIVE', 'INACTIVE', 'SUSPENDED'].map(st => (
              <button key={st} type="button"
                onClick={() => s('status')(st)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  form.status === st
                    ? st === 'ACTIVE'   ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : st === 'INACTIVE' ? 'bg-slate-700 text-slate-300 border-slate-600'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-transparent text-slate-600 border-slate-800 hover:border-slate-700'
                }`}>{st}</button>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={saving} fullWidth>
              {customer ? 'Update Customer' : 'Add Customer'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} fullWidth>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Customer Detail Drawer ─────────────────────────────────────────────
function CustomerDrawer({ customer, onClose, onEdit }) {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['customer-invoices', customer.id],
    queryFn: () => api.invoices(customer.id),
    staleTime: 30_000,
  })

  const totalSpent = invoices
    .filter(i => i.status === 'PAID')
    .reduce((s, i) => s + Number(i.finalAmount ?? 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600
              flex items-center justify-center text-sm font-bold text-white">
              {customer.name[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">{customer.name}</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[customer.status]}`}>
                {customer.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="xs" icon={Edit2} onClick={() => onEdit(customer)}>Edit</Button>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition p-1">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Contact info */}
        <div className="px-5 py-4 border-b border-slate-800 space-y-2">
          {customer.email && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Mail size={13} className="text-slate-600 shrink-0" />
              <span>{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Phone size={13} className="text-slate-600 shrink-0" />
              <span>{customer.phone}</span>
            </div>
          )}
          {customer.address && (
            <p className="text-xs text-slate-500 leading-relaxed">
              {[customer.address, customer.city, customer.state, customer.postalCode].filter(Boolean).join(', ')}
            </p>
          )}
          {customer.taxId && (
            <p className="text-xs text-slate-500">GSTIN: <span className="text-slate-300 font-mono">{customer.taxId}</span></p>
          )}
        </div>

        {/* Spend summary */}
        <div className="grid grid-cols-3 gap-px bg-slate-800 mx-5 my-4 rounded-xl overflow-hidden">
          {[
            { label: 'Invoices',  value: invoices.length },
            { label: 'Paid',      value: invoices.filter(i => i.status === 'PAID').length },
            { label: 'Total Spent', value: inr(totalSpent) },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 p-3 text-center">
              <p className="text-sm font-bold text-white font-syne">{s.value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Invoice history */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-800">
            <FileText size={13} className="text-slate-500" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Purchase History</p>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-slate-600" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-center text-slate-600 text-sm py-8">No invoices yet</p>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {invoices.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/40 transition">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-cyan-400">{inv.invoiceNumber}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(inv.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-200">{inr(inv.finalAmount)}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${INV_STATUS[inv.status] ?? INV_STATUS.DRAFT}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────
export default function Customers() {
  const [search,   setSearch]   = useState('')
  const [query,    setQuery]    = useState('')
  const [modal,    setModal]    = useState(null)
  const [drawer,   setDrawer]   = useState(null)
  const [delId,    setDelId]    = useState(null)
  const qc = useQueryClient()

  const params = new URLSearchParams({ page: 0, size: 100, sortBy: 'createdAt', sortDir: 'desc', ...(query && { search: query }) })

  const { data, isLoading, error } = useQuery({
    queryKey: ['customers', query],
    queryFn: () => api.list(params.toString()),
    staleTime: 30_000,
  })
  const customers = data?.content ?? []

  const createMutation = useMutation({
    mutationFn: (d) => api.create(d),
    onSuccess: () => { qc.invalidateQueries(['customers']); toast.success('Customer added') },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, d }) => api.update(id, d),
    onSuccess: () => { qc.invalidateQueries(['customers']); toast.success('Customer updated') },
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => api.remove(id),
    onSuccess: () => { qc.invalidateQueries(['customers']); toast.success('Customer deleted'); setDelId(null) },
  })

  const handleEdit = (c) => { setDrawer(null); setModal(c) }

  return (
    <div className="space-y-6 font-dm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-syne text-2xl font-bold text-white">Customers</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {customers.length} customer{customers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button icon={Plus} onClick={() => setModal('new')}>Add Customer</Button>
      </div>

      <form className="flex gap-2 max-w-sm" onSubmit={e => { e.preventDefault(); setQuery(search) }}>
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or phone…"
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm
              text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
        </div>
        <Button type="submit" variant="secondary" size="md">Search</Button>
      </form>

      {error && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
        Failed to load customers: {error.message}
      </div>}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-slate-600" />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16">
          <Users size={32} className="mx-auto text-slate-700 mb-3" />
          <p className="text-slate-500 text-sm mb-3">No customers found.</p>
          <Button variant="outline" size="sm" onClick={() => setModal('new')}>Add First Customer</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {customers.map(c => (
            <div key={c.id}
              onClick={() => setDrawer(c)}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700
                transition cursor-pointer group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600
                    flex items-center justify-center text-sm font-bold text-white shadow shadow-cyan-500/20">
                    {c.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{c.name}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[c.status ?? 'ACTIVE']}`}>
                      {c.status ?? 'ACTIVE'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={e => { e.stopPropagation(); setModal(c) }}
                    className="p-1.5 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); setDelId(c.id) }}
                    className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 mb-4">
                {c.email && <div className="flex items-center gap-2 text-xs text-slate-500"><Mail size={11} />{c.email}</div>}
                {c.phone && <div className="flex items-center gap-2 text-xs text-slate-500"><Phone size={11} />{c.phone}</div>}
                {c.city  && <p className="text-xs text-slate-600">{[c.city, c.state].filter(Boolean).join(', ')}</p>}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <div className="text-center">
                  <p className="text-base font-bold text-white font-syne">{c.totalInvoices ?? 0}</p>
                  <p className="text-[10px] text-slate-500">Invoices</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 hover:text-cyan-400 transition">
                  View History <ChevronRight size={12} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {modal && (
        <CustomerModal
          customer={modal !== 'new' ? modal : null}
          onClose={() => setModal(null)}
          onSave={modal !== 'new'
            ? (d) => updateMutation.mutateAsync({ id: modal.id, d })
            : (d) => createMutation.mutateAsync(d)}
        />
      )}

      {drawer && (
        <CustomerDrawer customer={drawer} onClose={() => setDrawer(null)} onEdit={handleEdit} />
      )}

      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDelId(null)} />
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-rose-400" />
            </div>
            <h3 className="font-syne text-lg font-bold text-white text-center mb-2">Delete Customer?</h3>
            <p className="text-sm text-slate-400 text-center mb-6">This will permanently remove the customer and all associated data.</p>
            <div className="flex gap-3">
              <Button variant="danger" fullWidth onClick={() => deleteMutation.mutateAsync(delId)}>Delete</Button>
              <Button variant="ghost" fullWidth onClick={() => setDelId(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}