import { FileText, Plus, Search, Filter } from 'lucide-react'
import Button from '../components/ui/Button'

const invoices = [
  { id: 'INV-0041', customer: 'Apex Corp',         amount: '$3,200',  status: 'Paid',    date: 'Mar 20, 2026', due: 'Mar 27, 2026' },
  { id: 'INV-0040', customer: 'NovaTech Ltd',       amount: '$1,875',  status: 'Pending', date: 'Mar 19, 2026', due: 'Mar 26, 2026' },
  { id: 'INV-0039', customer: 'BlueWave Inc',        amount: '$5,040',  status: 'Paid',    date: 'Mar 18, 2026', due: 'Mar 25, 2026' },
  { id: 'INV-0038', customer: 'Stark Solutions',    amount: '$920',    status: 'Overdue', date: 'Mar 15, 2026', due: 'Mar 22, 2026' },
  { id: 'INV-0037', customer: 'Orion Ventures',     amount: '$2,400',  status: 'Paid',    date: 'Mar 14, 2026', due: 'Mar 21, 2026' },
  { id: 'INV-0036', customer: 'Zenith Dynamics',    amount: '$7,800',  status: 'Pending', date: 'Mar 12, 2026', due: 'Mar 19, 2026' },
  { id: 'INV-0035', customer: 'ClearPath Systems',  amount: '$1,100',  status: 'Paid',    date: 'Mar 10, 2026', due: 'Mar 17, 2026' },
]

const statusStyles = {
  Paid:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Overdue: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

export default function Invoices() {
  return (
    <div className="space-y-6 font-dm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-syne text-2xl font-bold text-white">Invoices</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage and track all billing invoices</p>
        </div>
        <Button icon={Plus} size="md">New Invoice</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search invoices…"
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60 transition"
          />
        </div>
        <Button variant="secondary" icon={Filter} size="md">Filter</Button>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
          <FileText size={16} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">All Invoices</h2>
          <span className="ml-2 px-2 py-0.5 rounded-md bg-slate-800 text-xs text-slate-400 border border-slate-700">
            {invoices.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Invoice ID', 'Customer', 'Amount', 'Status', 'Issue Date', 'Due Date', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr
                  key={inv.id}
                  className={`border-b border-slate-800/50 hover:bg-slate-800/40 transition ${
                    i === invoices.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-5 py-3.5 font-mono text-xs text-cyan-400">{inv.id}</td>
                  <td className="px-5 py-3.5 text-slate-300 font-medium">{inv.customer}</td>
                  <td className="px-5 py-3.5 text-slate-200 font-semibold">{inv.amount}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${statusStyles[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{inv.date}</td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{inv.due}</td>
                  <td className="px-5 py-3.5">
                    <Button variant="ghost" size="xs">View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}