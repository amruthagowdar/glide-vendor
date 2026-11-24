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
  onRecharge,
  onWithdraw,
  hasOngoingTrips = false,
  ongoingTripsCount = 0,
  compact,
}) => {
  // Completely in grey for frozen wallet
  const bg = 'from-slate-700 via-slate-800 to-slate-900'
  const text = 'text-slate-300'

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold'
        )}
        title="Wallet Frozen"
      >
        <Wallet className="w-4 h-4 text-slate-400" />
        <span>{formatCurrency(balance)} (Frozen)</span>
      </div>
    )
  }

  return (
    <div className={cn('card overflow-hidden border border-slate-700/90 shadow-md')}>
      <div className={cn('bg-gradient-to-br p-6', bg)}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className={cn('text-sm font-medium', text)}>Wallet Balance</p>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700/80 text-slate-200 border border-slate-600 uppercase tracking-wider">
                Frozen
              </span>
            </div>
            <p className="text-4xl font-extrabold text-white mt-1">{formatCurrency(balance)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-700/60 border border-slate-600/50 flex items-center justify-center text-slate-200">
            <Wallet className="w-6 h-6 text-slate-200" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-slate-300 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          <span>
            Prepaid deductions frozen · Direct billing active for Rent a Cab & ETS
          </span>
        </div>
        {(onRecharge || onWithdraw) && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-700/80">
            <span className="text-slate-400 text-xs font-medium">Instant settlement & credit</span>
            <div className="flex items-center gap-2.5">
              {onWithdraw && (
                <button
                  type="button"
                  onClick={onWithdraw}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold shadow-md transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer ${
                    hasOngoingTrips
                      ? 'bg-slate-800 text-slate-400 border border-slate-700'
                      : 'bg-slate-200 text-slate-900 hover:bg-white hover:shadow-lg'
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
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 ml-0.5" />
                  )}
                </button>
              )}

              {onRecharge && (
                <button
                  type="button"
                  onClick={onRecharge}
                  className="px-4 py-2 rounded-full bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-750 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                  <span>Recharge (Frozen)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
