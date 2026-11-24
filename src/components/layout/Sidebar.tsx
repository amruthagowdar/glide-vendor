import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Navigation,
  Wallet,
  Bell,
  BarChart3,
  LogOut,
  X,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNotificationCount } from '../../hooks/useVendor'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navItems: Array<{
  name: string
  path: string
  icon: React.ComponentType<{ className?: string }>
  badge?: boolean
  tag?: string
}> = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'ETS Command', path: '/ets', icon: Building2, tag: 'Frozen' },
  { name: 'Trips', path: '/trips', icon: Navigation },
  { name: 'Wallet', path: '/wallet', icon: Wallet, tag: 'Frozen' },
  { name: 'Notifications', path: '/notifications', icon: Bell, badge: true },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
]

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { data: unreadCount = 0 } = useNotificationCount()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-[#09090b] text-white border-r border-slate-800/80 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-slate-800/60 bg-[#09090b]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white shadow-lg p-1.5 flex-shrink-0">
              <img src="/logo.png" alt="Glide Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-tight text-xl text-white">Glide</span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                  Vendor
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[130px]">
                {user?.companyName || 'Fleet Partner'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full lg:hidden text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <div className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 tracking-tight">{item.name}</span>
              {item.tag && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {item.tag}
                </span>
              )}
              {item.badge && unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-600 text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* User profile & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-[#09090b]/80">
          <div className="flex items-center justify-between gap-3 mb-3 px-2">
            <div className="truncate">
              <p className="text-sm font-semibold text-white truncate">
                {user?.name || 'Vendor Admin'}
              </p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-600/20 transition-all border border-rose-500/20 active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
