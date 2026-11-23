import React from 'react'
import { Menu, Bell, Wallet as WalletIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useWallet, useNotificationCount } from '../../hooks/useVendor'
import { formatCurrency, getWalletColor } from '../../lib/utils'

interface NavbarProps {
  onMenuClick: () => void
  onOpenRechargeModal?: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, onOpenRechargeModal }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: wallet } = useWallet()
  const { data: unreadNotifications = 0 } = useNotificationCount()

  const balance = wallet?.balance ?? 0
  const colorState = getWalletColor(balance, 1000)

  const walletBadgeStyle = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/70',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100/70',
    red: 'bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100/70 animate-pulse',
  }[colorState]

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
        {/* Unified Wallet Balance Pill with + Recharge Symbol */}
        <button
          onClick={onOpenRechargeModal || (() => navigate('/wallet'))}
          className={`flex items-center gap-2 pl-3.5 pr-1.5 py-1.5 rounded-full border text-xs sm:text-sm font-bold shadow-sm transition-all duration-200 active:scale-[0.98] cursor-pointer ${walletBadgeStyle}`}
          title="Recharge Wallet via Razorpay"
        >
          <WalletIcon className="w-4 h-4 flex-shrink-0" />
          <span>{formatCurrency(balance)}</span>
          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-sm ml-0.5 hover:bg-emerald-700 transition-colors">
            +
          </span>
        </button>

        {/* Notifications Icon */}
        <Link
          to="/notifications"
          className="relative p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadNotifications > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" />
          )}
        </Link>
      </div>
    </header>
  )
}
