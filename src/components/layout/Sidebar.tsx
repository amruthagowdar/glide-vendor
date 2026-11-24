import React, { useState } from 'react'
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
import toast from 'react-hot-toast'
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = async () => {
    setShowLogoutConfirm(false)
    const displayName = user?.name || 'Harish'
    await logout()
    toast.success(`See you soon, ${displayName}!`)
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
          {navItems.map((item) =>
            item.tag === 'Frozen' ? (
              <div
                key={item.path}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-500 cursor-not-allowed select-none opacity-60 bg-white/[0.02]"
                title={`${item.name} is frozen and cannot be opened`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0 text-slate-500" />
                <span className="flex-1 tracking-tight">{item.name}</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-400 border border-slate-700">
                  Frozen
                </span>
              </div>
            ) : (
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
                {item.badge && unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-600 text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </NavLink>
            )
          )}
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
            onClick={handleLogoutClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-600/20 transition-all border border-rose-500/20 active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-100 z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center mb-4 text-3xl shadow-inner">
              😢
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              You are leaving me, {user?.name || 'Harish'}?
            </h3>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              You are leaving me? plz come back soon <span className="font-bold text-slate-900">{user?.name || 'Harish'}</span>!
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold shadow-sm transition"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
