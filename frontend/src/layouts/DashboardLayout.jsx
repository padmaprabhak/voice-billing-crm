import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import {
  LayoutDashboard, FileText, Users, Mic, LogOut,
  Menu, X, Zap, Bell, ChevronDown, Package,
  BarChart2, Settings, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
      { to: '/voice-billing', label: 'Voice Billing',  icon: Mic,  accent: true },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/invoices',  label: 'Invoices',  icon: FileText },
      { to: '/customers', label: 'Customers', icon: Users    },
      { to: '/products',  label: 'Products',  icon: Package  },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/analytics', label: 'Analytics', icon: BarChart2 },
      { to: '/settings',  label: 'Settings',  icon: Settings  },
    ],
  },
]

export default function DashboardLayout() {
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const [profileOpen,  setProfileOpen]  = useState(false)
  const [notifOpen,    setNotifOpen]    = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  const notifications = [
    { id: 1, text: 'Voice invoice created successfully', time: 'Just now',   dot: 'bg-cyan-400' },
    { id: 2, text: 'Invoice overdue — check Invoices',   time: '1h ago',     dot: 'bg-rose-400' },
    { id: 3, text: 'New customer auto-created via voice', time: 'Yesterday', dot: 'bg-emerald-400' },
  ]

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-dm">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-60 flex flex-col
        bg-slate-900 border-r border-slate-800/80
        transform transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Zap size={16} className="text-slate-950" fill="currentColor" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white font-syne">VoiceBill</span>
            <span className="block text-[9px] text-slate-500 tracking-widest uppercase">CRM Pro</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-slate-500 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="px-3 mb-2 text-[9px] font-bold tracking-widest text-slate-600 uppercase">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon, accent }) => (
                  <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${isActive
                        ? accent
                          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
                          : 'bg-slate-800 text-slate-100 border border-slate-700/60'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'}`
                    }>
                    {({ isActive }) => (
                      <>
                        <Icon size={16} className={isActive
                          ? accent ? 'text-cyan-400' : 'text-slate-200'
                          : 'text-slate-500'} />
                        {label}
                        {isActive && !accent && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-slate-400" />
                        )}
                        {isActive && accent && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="px-3 py-3 border-t border-slate-800">
          <button onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium
              text-slate-400 hover:bg-rose-500/10 hover:text-rose-400
              border border-transparent hover:border-rose-500/20 transition-all">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── TOPBAR ── */}
        <header className="shrink-0 flex items-center gap-3 px-4 md:px-6 h-14 bg-slate-900/80 backdrop-blur border-b border-slate-800">
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <Menu size={18} />
          </button>

          <span className="hidden sm:block text-xs text-slate-600">Voice-Enabled Billing CRM</span>

          <div className="ml-auto flex items-center gap-2">

            {/* Notification bell */}
            <div className="relative">
              <button onClick={() => { setNotifOpen(v => !v); setProfileOpen(false) }}
                className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
                <Bell size={17} />
                <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-cyan-500 text-slate-950
                  text-[8px] font-bold flex items-center justify-center">
                  {notifications.length}
                </span>
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800
                    rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                      <p className="text-sm font-semibold text-slate-200">Notifications</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                        {notifications.length} new
                      </span>
                    </div>
                    <div className="divide-y divide-slate-800/60">
                      {notifications.map(n => (
                        <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-800/40 transition cursor-pointer">
                          <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.dot}`} />
                          <div>
                            <p className="text-xs text-slate-300 font-medium">{n.text}</p>
                            <p className="text-[10px] text-slate-600 mt-0.5">{n.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2.5 border-t border-slate-800">
                      <button onClick={() => setNotifOpen(false)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition font-medium">
                        Mark all as read
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile */}
            <div className="relative">
              <button onClick={() => { setProfileOpen(v => !v); setNotifOpen(false) }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition border border-transparent hover:border-slate-700">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600
                  flex items-center justify-center text-[10px] font-bold text-white">
                  {user?.name?.[0]?.toUpperCase() ?? 'A'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold text-slate-200 leading-none">{user?.name ?? 'Admin'}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">{user?.role ?? 'Admin'}</p>
                </div>
                <ChevronDown size={12} className="text-slate-500 hidden md:block" />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-2 w-44 bg-slate-900 border border-slate-800
                    rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800">
                      <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <NavLink to="/settings" onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
                      <Settings size={13} /> Settings
                    </NavLink>
                    <button onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition">
                      <LogOut size={13} /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ── PAGE ── */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}