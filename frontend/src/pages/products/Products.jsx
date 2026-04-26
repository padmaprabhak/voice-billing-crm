import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package, Plus, Search, Edit2, Trash2, Loader2,
  ChevronUp, ChevronDown, Tag, AlertCircle
} from 'lucide-react'
import Button from '../../components/ui/Button'
import backendClient from '../../api/axios'
import toast from 'react-hot-toast'

// ── API helpers ───────────────────────────────────────────────────────
const api = {
  list:   (q) => backendClient.get(`/products?${q}`).then(r => r.data?.data),
  create: (d) => backendClient.post('/products', d).then(r => r.data?.data),
  update: (id, d) => backendClient.put(`/products/${id}`, d).then(r => r.data?.data),
  remove: (id) => backendClient.delete(`/products/${id}`),
}

// ── Currency formatter ────────────────────────────────────────────────
const inr = (v) => '₹' + Number(v ?? 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
})

// ── Product Form Modal ────────────────────────────────────────────────
function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState({
    name:          product?.name          ?? '',
    description:   product?.description   ?? '',
    price:         product?.price         ?? '',
    gstPercentage: product?.gstPercentage ?? '18',
    sku:           product?.sku           ?? '',
    unit:          product?.unit          ?? 'unit',
    status:        product?.status        ?? 'ACTIVE',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.price) { toast.error('Name and price are required'); return }
    setSaving(true)
    try {
      await onSave({ ...form, price: parseFloat(form.price), gstPercentage: parseFloat(form.gstPercentage) })
      onClose()
    } catch { /* handled by interceptor */ }
    finally { setSaving(false) }
  }

  const field = (label, key, type = 'text', opts = {}) => (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide">{label}</label>
      <input
        type={type} value={form[key]} {...opts}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm
          text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2
          focus:ring-cyan-500/40 focus:border-cyan-500/40 transition"
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <h2 className="font-syne text-lg font-bold text-white mb-5">
          {product ? 'Edit Product' : 'Add New Product'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {field('Product Name *', 'name', 'text', { placeholder: 'e.g. Laptop' })}
          <div className="grid grid-cols-2 gap-3">
            {field('Price (₹) *', 'price', 'number', { placeholder: '0.00', min: '0', step: '0.01' })}
            {field('GST %', 'gstPercentage', 'number', { placeholder: '18', min: '0', max: '100' })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('SKU / Code', 'sku', 'text', { placeholder: 'ELEC-001' })}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide">Unit</label>
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40">
                {['unit', 'piece', 'pair', 'kg', 'gram', 'litre', 'hour', 'day', 'month', 'pack', 'box', 'dozen', 'ream'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide">Description</label>
            <textarea value={form.description} rows={2}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional product description"
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm
                text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2
                focus:ring-cyan-500/40 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide">Status</label>
            <div className="flex gap-2">
              {['ACTIVE', 'INACTIVE'].map(s => (
                <button key={s} type="button"
                  onClick={() => setForm(f => ({ ...f, status: s }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                    form.status === s
                      ? s === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-700 text-slate-300 border-slate-600'
                      : 'bg-transparent text-slate-500 border-slate-800 hover:border-slate-700'
                  }`}>{s}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={saving} fullWidth>
              {product ? 'Update Product' : 'Add Product'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} fullWidth>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete Confirm ────────────────────────────────────────────────────
function DeleteConfirm({ product, onConfirm, onCancel }) {
  const [deleting, setDeleting] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={20} className="text-rose-400" />
        </div>
        <h3 className="font-syne text-lg font-bold text-white text-center mb-2">Delete Product?</h3>
        <p className="text-sm text-slate-400 text-center mb-6">
          "<span className="text-slate-200">{product.name}</span>" will be permanently removed.
        </p>
        <div className="flex gap-3">
          <Button variant="danger" fullWidth loading={deleting}
            onClick={async () => { setDeleting(true); await onConfirm(); setDeleting(false) }}>
            Delete
          </Button>
          <Button variant="ghost" fullWidth onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────
export default function Products() {
  const [search,    setSearch]    = useState('')
  const [query,     setQuery]     = useState('')
  const [status,    setStatus]    = useState('')
  const [sortBy,    setSortBy]    = useState('name')
  const [sortDir,   setSortDir]   = useState('asc')
  const [modal,     setModal]     = useState(null)    // null | 'add' | product obj
  const [delTarget, setDelTarget] = useState(null)

  const qc = useQueryClient()

  const params = new URLSearchParams({
    page: 0, size: 100, sortBy, sortDir,
    ...(query  && { search: query }),
    ...(status && { status }),
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', query, status, sortBy, sortDir],
    queryFn: () => api.list(params.toString()),
    staleTime: 30_000,
  })

  const products = data?.content ?? []

  const createMutation = useMutation({
    mutationFn: (d) => api.create(d),
    onSuccess: () => { qc.invalidateQueries(['products']); toast.success('Product added') },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['products']); toast.success('Product updated') },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.remove(id),
    onSuccess: () => { qc.invalidateQueries(['products']); toast.success('Product deleted'); setDelTarget(null) },
  })

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const SortIcon = ({ col }) => sortBy === col
    ? sortDir === 'asc' ? <ChevronUp size={12} className="inline ml-1" />
                        : <ChevronDown size={12} className="inline ml-1" />
    : null

  return (
    <div className="space-y-6 font-dm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-syne text-2xl font-bold text-white">Products</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your product catalogue and pricing</p>
        </div>
        <Button icon={Plus} onClick={() => setModal('add')}>Add Product</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <form className="flex gap-2 flex-1 min-w-52"
          onSubmit={e => { e.preventDefault(); setQuery(search) }}>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or SKU…"
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800
                text-sm text-slate-200 placeholder-slate-600 focus:outline-none
                focus:ring-2 focus:ring-cyan-500/40 transition" />
          </div>
          <Button type="submit" variant="secondary" size="md">Search</Button>
        </form>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300 focus:outline-none">
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Products', value: products.length },
          { label: 'Active',  value: products.filter(p => p.status === 'ACTIVE').length,   color: 'text-emerald-400' },
          { label: 'Inactive', value: products.filter(p => p.status === 'INACTIVE').length, color: 'text-slate-500' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <p className={`text-2xl font-bold font-syne ${s.color ?? 'text-white'}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
        Failed to load products: {error.message}
      </div>}

      {/* Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
          <Package size={16} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">Product Catalogue</h2>
          <span className="ml-2 px-2 py-0.5 rounded-md bg-slate-800 text-xs text-slate-400 border border-slate-700">
            {products.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-slate-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Package size={32} className="mx-auto text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm">No products yet.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setModal('add')}>Add First Product</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {[
                    { key: 'name',  label: 'Product' },
                    { key: 'sku',   label: 'SKU' },
                    { key: 'price', label: 'Price (₹)', align: 'right' },
                    { key: 'gst',   label: 'GST %',     align: 'right' },
                    { key: 'unit',  label: 'Unit' },
                    { key: 'status',label: 'Status' },
                    { key: null,    label: 'Actions', align: 'right' },
                  ].map(col => (
                    <th key={col.label}
                      onClick={col.key ? () => handleSort(col.key) : undefined}
                      className={`px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider
                        ${col.align === 'right' ? 'text-right' : ''}
                        ${col.key ? 'cursor-pointer hover:text-slate-300 select-none' : ''}`}>
                      {col.label}<SortIcon col={col.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.id} className={`border-b border-slate-800/50 hover:bg-slate-800/40 transition ${
                    i === products.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-slate-200 font-medium">{p.name}</p>
                        {p.description && <p className="text-xs text-slate-500 truncate max-w-48">{p.description}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{p.sku ?? '—'}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-200">{inr(p.price)}</td>
                    <td className="px-5 py-3.5 text-right text-slate-400">{p.gstPercentage}%</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{p.unit ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                        p.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-700/50 text-slate-500 border-slate-700'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setModal(p)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setDelTarget(p)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal && (
        <ProductModal
          product={modal !== 'add' ? modal : null}
          onClose={() => setModal(null)}
          onSave={modal !== 'add'
            ? (d) => updateMutation.mutateAsync({ id: modal.id, data: d })
            : (d) => createMutation.mutateAsync(d)}
        />
      )}
      {delTarget && (
        <DeleteConfirm
          product={delTarget}
          onConfirm={() => deleteMutation.mutateAsync(delTarget.id)}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </div>
  )
}