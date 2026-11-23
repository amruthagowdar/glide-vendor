import React from 'react'
import { cn, tripStatusConfig } from '../../lib/utils'
import type { TripStatus } from '../../types'

interface StatusBadgeProps {
  status: TripStatus | string
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = tripStatusConfig[status as TripStatus] || { label: status, color: 'bg-slate-100 text-slate-700' }
  return (
    <span className={cn('badge', config.color, className)}>
      {config.label}
    </span>
  )
}

interface TransactionBadgeProps {
  type: 'CREDIT' | 'DEBIT'
}
export const TransactionBadge: React.FC<TransactionBadgeProps> = ({ type }) => (
  <span className={cn('badge', type === 'CREDIT' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
    {type}
  </span>
)

interface PaymentBadgeProps {
  status: string
}
export const PaymentBadge: React.FC<PaymentBadgeProps> = ({ status }) => {
  const colors: Record<string, string> = {
    PAID: 'bg-emerald-100 text-emerald-700',
    PENDING: 'bg-amber-100 text-amber-700',
    FAILED: 'bg-red-100 text-red-700',
    REFUNDED: 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={cn('badge', colors[status] || 'bg-slate-100 text-slate-700')}>
      {status}
    </span>
  )
}
