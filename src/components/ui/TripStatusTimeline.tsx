import React from 'react'
import { cn } from '../../lib/utils'
import { formatDateTime } from '../../lib/utils'
import { tripStatusConfig } from '../../lib/utils'
import type { TripStatusHistory, TripStatus } from '../../types'
import { CheckCircle, Circle, Clock } from 'lucide-react'

const STATUS_ORDER: TripStatus[] = [
  'PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED',
]

interface TripStatusTimelineProps {
  history: TripStatusHistory[]
  currentStatus: TripStatus
}

export const TripStatusTimeline: React.FC<TripStatusTimelineProps> = ({ history, currentStatus }) => {
  const isCancelled = currentStatus === 'CANCELLED'
  const statuses = isCancelled ? [...STATUS_ORDER] : STATUS_ORDER
  const currentIdx = statuses.indexOf(currentStatus)

  return (
    <div className="space-y-1">
      {statuses.map((status, idx) => {
        const historyEntry = history.find((h) => h.toStatus === status)
        const isDone = isCancelled ? false : idx <= currentIdx
        const isCurrent = status === currentStatus
        const config = tripStatusConfig[status]

        return (
          <div key={status} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10',
                isDone ? 'bg-emerald-500 border-emerald-500' :
                isCurrent ? 'bg-sky-700 border-sky-700' :
                'bg-white border-sky-200'
              )}>
                {isDone ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : isCurrent ? (
                  <Clock className="w-4 h-4 text-white" />
                ) : (
                  <Circle className="w-3 h-3 text-sky-200" />
                )}
              </div>
              {idx < statuses.length - 1 && (
                <div className={cn('w-0.5 h-6 mt-1', isDone ? 'bg-emerald-300' : 'bg-sky-100')} />
              )}
            </div>
            <div className="pb-2 flex-1">
              <p className={cn('text-sm font-medium', isCurrent ? 'text-sky-900' : 'text-slate-600')}>
                {config.label}
              </p>
              {historyEntry && (
                <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(historyEntry.changedAt)}</p>
              )}
              {historyEntry?.notes && (
                <p className="text-xs text-slate-500 mt-0.5 italic">{historyEntry.notes}</p>
              )}
            </div>
          </div>
        )
      })}
      {isCancelled && (
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-red-500 border-2 border-red-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="pb-2">
            <p className="text-sm font-medium text-red-700">Cancelled</p>
            {history.find(h => h.toStatus === 'CANCELLED') && (
              <p className="text-xs text-slate-400 mt-0.5">
                {formatDateTime(history.find(h => h.toStatus === 'CANCELLED')!.changedAt)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
