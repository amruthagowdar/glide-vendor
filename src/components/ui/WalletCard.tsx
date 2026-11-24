import React from 'react'
import { cn, formatCurrency, getWalletColor } from '../../lib/utils'
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, Plus, ArrowDownToLine } from 'lucide-react'

interface WalletCardProps {
  balance: number
  threshold?: number
  onRecharge?: () => void
  onWithdraw?: () => void
  hasOngoingTrips?: boolean
  ongoingTripsCount?: number
  compact?: boolean
}

export const WalletCard: React.FC<WalletCardProps> = ({
  balance,
  threshold = 1000,
  onRecharge,
  onWithdraw,
  hasOngoingTrips = false,
  ongoingTripsCount = 0,
  compact,
}) => {
  const colorState = getWalletColor(balance, threshold)
  const colorMap = {
    green: { bg: 'from-emerald-600 to-emerald-700', text: 'text-emerald-100', icon: TrendingUp },
    amber: { bg: 'from-amber-500 to-amber-600', text: 'text-amber-100', icon: AlertTriangle },
    red: { bg: 'from-red-600 to-red-700', text: 'text-red-100', icon: TrendingDown },
  }
  const { bg, text, icon: Icon } = colorMap[colorState]

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r cursor-pointer',
          bg,
          'text-white text-sm font-semibold hover:opacity-90 transition-opacity'
        )}
        onClick={onRecharge}
        title="Wallet Balance — click to recharge"
      >
        <Wallet className="w-4 h-4" />
        <span>{formatCurrency(balance)}</span>
      </div>
    )
  }

  return (
    <div className={cn('card overflow-hidden')}>
      <div className={cn('bg-gradient-to-br p-6', bg)}>
        <div className="flex items-start justify-between">
          <div>
            <p className={cn('text-sm font-medium', text)}>Wallet Balance</p>
            <p className="text-4xl font-bold text-white mt-1">{formatCurrency(balance)}</p>
          </div>
          <div className={cn('w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center')}>
            <Wallet className="w-6 h-6 text-white" />
          </div>
        </div>
        {colorState !== 'green' && (
          <div className="mt-4 flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
            <Icon className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-medium">
              {colorState === 'red'
                ? 'Critical: Insufficient balance for new trips'
                : `Low balance — below ₹${threshold.toLocaleString('en-IN')}`}
            </span>
          </div>
        )}
        {(onRecharge || onWithdraw) && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/20">
            <span className="text-white/80 text-xs font-medium">Instant settlement & credit</span>
            <div className="flex items-center gap-2.5">
              {onWithdraw && (
                <button
                  type="button"
                  onClick={onWithdraw}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold shadow-md transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer ${
                    hasOngoingTrips
                      ? 'bg-white/25 text-white hover:bg-white/35 backdrop-blur-sm border border-white/20'
                      : 'bg-white/90 text-slate-900 hover:bg-white hover:shadow-lg'
                  }`}
                  title={
                    hasOngoingTrips
                      ? `Withdrawal locked: ${ongoingTripsCount} ongoing trips active`
                      : 'Withdraw available funds'
                  }
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>Withdraw</span>
                  {hasOngoingTrips && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300 ml-0.5 animate-pulse" />
                  )}
                </button>
              )}

              {onRecharge && (
                <button
                  type="button"
                  onClick={onRecharge}
                  className="px-4 py-2 rounded-full bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Recharge Wallet</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
