import React, { useState, useRef, useEffect } from 'react'
import { Menu, Bell, Wallet as WalletIcon, Clock, ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useWallet, useNotificationCount } from '../../hooks/useVendor'
import { formatCurrency, getWalletColor, formatDateTime } from '../../lib/utils'
import { useQuery } from '@tanstack/react-query'
import { vendorApi } from '../../lib/api'
import type { Notification } from '../../types'

interface NavbarProps {
  onMenuClick: () => void
  onOpenRechargeModal?: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, onOpenRechargeModal }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: wallet } = useWallet()
  const { data: unreadNotifications = 0 } = useNotificationCount()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: notifsData } = useQuery<{ data: Notification[] }>({
    queryKey: ['notifications', 'quick-navbar'],
    queryFn: async () => {
      const res = await vendorApi.getNotifications({ limit: '5' })
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : []
      return { data: list }
    },
    enabled: dropdownOpen,
  })

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  const balance = wallet?.balance ?? 0
  const colorState = getWalletColor(balance, 1000)

  const walletBadgeStyle = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/70',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100/70',
    red: 'bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100/70 animate-pulse',
  }[colorState]

  const quickNotifications = notifsData?.data || []

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100/90 shadow-[0_1px_10px_rgba(0,0,0,0.02)] flex items-center justify-between px-4 sm:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-slate-600 rounded-full lg:hidden hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <h1 className="text-sm font-bold text-slate-900 tracking-tight">
            Welcome back, <span className="text-blue-600">{user?.companyName || 'Partner'}</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">Fleet Operations Command</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Wallet Frozen Pill Indicator - Disabled / Cannot be opened */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-300 bg-slate-100/90 text-slate-500 text-xs font-semibold select-none cursor-not-allowed shadow-none opacity-80"
          title="Wallet is frozen and cannot be opened"
        >
          <WalletIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>Wallet: ₹0</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600 border border-slate-300">
            Frozen
          </span>
        </div>

        {/* Notifications Icon with Interactive Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="relative p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* Quick Notifications Popover */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in duration-150">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xs text-slate-800 tracking-tight">Recent Notifications</h3>
                  {unreadNotifications > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
                      {unreadNotifications} new
                    </span>
                  )}
                </div>
                <Link
                  to="/notifications"
                  onClick={() => setDropdownOpen(false)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {quickNotifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No new notifications
                  </div>
                ) : (
                  quickNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        setDropdownOpen(false)
                        navigate('/notifications')
                      }}
                      className={`p-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                        !n.isRead ? 'bg-sky-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                            !n.isRead ? 'bg-blue-600' : 'bg-transparent'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate">{n.title}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-snug">
                            {n.message}
                          </p>
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{formatDateTime(n.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-slate-100 bg-slate-50/40 text-center">
                <Link
                  to="/notifications"
                  onClick={() => setDropdownOpen(false)}
                  className="block py-1 text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors"
                >
                  Go to Full Notifications Page →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
