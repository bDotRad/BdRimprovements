import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Settings, BarChart3, Upload, Menu, X } from 'lucide-react'
import { useState } from 'react'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/problems', label: 'Problems', icon: ClipboardList },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/setup', label: 'Setup', icon: Settings },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex lg:flex-col`}>
        <div className="flex items-center justify-between h-16 px-6 bg-slate-800">
          <span className="text-lg font-bold tracking-wide">BDR Improvements</span>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-slate-700 text-xs text-slate-400">
          Engineering Lifecycle System
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-8 gap-4">
          <button className="lg:hidden p-2 rounded-md hover:bg-gray-100" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-gray-800">Engineering Lifecycle & Audit System</h1>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
