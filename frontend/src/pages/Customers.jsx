import { Users, Plus, Search, Mail, Phone } from 'lucide-react'
import Button from '../components/ui/Button'

const customers = [
  { id: 1, name: 'Apex Corp',          email: 'billing@apexcorp.com',       phone: '+1 (555) 001-0001', status: 'Active',   invoices: 12, total: '$38,400' },
  { id: 2, name: 'NovaTech Ltd',        email: 'accounts@novatech.io',        phone: '+1 (555) 002-0002', status: 'Active',   invoices: 8,  total: '$15,000' },
  { id: 3, name: 'BlueWave Inc',         email: 'finance@bluewave.co',         phone: '+1 (555) 003-0003', status: 'Active',   invoices: 20, total: '$64,200' },
  { id: 4, name: 'Stark Solutions',     email: 'pay@starksolutions.net',      phone: '+1 (555) 004-0004', status: 'Inactive', invoices: 3,  total: '$4,840'  },
  { id: 5, name: 'Orion Ventures',      email: 'admin@orionventures.com',     phone: '+1 (555) 005-0005', status: 'Active',   invoices: 15, total: '$29,500' },
  { id: 6, name: 'Zenith Dynamics',     email: 'billing@zenithdyn.com',       phone: '+1 (555) 006-0006', status: 'Active',   invoices: 7,  total: '$21,900' },
]

export default function Customers() {
  return (
    <div className="space-y-6 font-dm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-syne text-2xl font-bold text-white">Customers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your client relationships</p>
        </div>
        <Button icon={Plus} size="md">Add Customer</Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search customers…"
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60 transition"
        />
      </div>

      {/* Grid cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {customers.map((c) => (
          <div key={c.id} className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow shadow-cyan-500/20">
                  {c.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{c.name}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    c.status === 'Active'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-slate-700 text-slate-500'
                  }`}>
                    {c.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Mail size={12} />
                <span className="truncate">{c.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Phone size={12} />
                <span>{c.phone}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="text-center">
                <p className="text-lg font-bold text-white font-syne">{c.invoices}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Invoices</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-cyan-400 font-syne">{c.total}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total Billed</p>
              </div>
              <Button variant="outline" size="xs">View</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}