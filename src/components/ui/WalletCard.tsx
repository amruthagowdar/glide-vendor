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
  const bg = {
    green: 'from-emerald-600 to-teal-700',
    amber: 'from-amber-500 to-orange-600',
    red: 'from-rose-600 to-red-700',
  }[colorState]
  const text = {
    green: 'text-emerald-100',
    amber: 'text-amber-100',
    red: 'text-rose-100',
  }[colorState]

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/90 border border-slate-200 text-slate-800 text-sm font-semibold shadow-xs'
        )}
        title="Wallet Active"
      >
        <Wallet className="w-4 h-4 text-emerald-600" />
        <span>{formatCurrency(balance)}</span>
      </div>
    )
  }

  return (
    <div className={cn('card overflow-hidden border-0 shadow-lg')}>
      <div className={cn('bg-gradient-to-br p-6', bg)}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className={cn('text-sm font-medium', text)}>Wallet Balance</p>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white uppercase tracking-wider">
                Active
              </span>
            </div>
            <p className="text-4xl font-extrabold text-white mt-1">{formatCurrency(balance)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
            <Wallet className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 bg-black/10 rounded-lg px-3 py-2 text-white/90 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            Automated prepaid escrow holds and instant trip payouts are fully active.
          </span>
        </div>
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
                      ? 'bg-white/20 text-white/60 cursor-not-allowed'
                      : 'bg-white text-slate-900 hover:bg-slate-50 hover:shadow-lg'
                  }`}
                  title={
                    hasOngoingTrips
                      ? `Withdrawal locked: ${ongoingTripsCount} ongoing trips active`
                      : 'Withdraw available funds'
                  }
                  disabled={hasOngoingTrips}
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>Withdraw</span>
                  {hasOngoingTrips && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5" />
                  )}
                </button>
              )}

              {onRecharge && (
                <button
                  type="button"
                  onClick={onRecharge}
                  className="px-4 py-2 rounded-full bg-white text-slate-900 hover:bg-slate-50 text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-900" />
                  <span>Recharge</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
