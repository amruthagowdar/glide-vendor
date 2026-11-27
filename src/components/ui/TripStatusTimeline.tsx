import React from 'react'
import { cn, formatDateTime } from '../../lib/utils'
import type { TripStatusHistory, TripStatus, Trip } from '../../types'
import { CheckCircle, Circle, Radio } from 'lucide-react'

interface TripStatusTimelineProps {
  trip?: Trip | null
  history?: TripStatusHistory[]
  currentStatus: TripStatus
}

export const TripStatusTimeline: React.FC<TripStatusTimelineProps> = ({
  trip,
  currentStatus,
}) => {
  const isCancelled = currentStatus === 'CANCELLED'
  const isETS = trip ? trip.serviceType === 'ETS' || String(trip.tripNo || '').startsWith('ETS-') : false

  // 6 Operational Stages defined by user:
  // 1. Trip Created
  // 2. Push to Driver
  // 3. Driver Accepted
  // 4. Driver Picked (Customer Picked for RAC / Employee Picked for ETS)
  // 5. Transiting
  // 6. Dropped (Customer Dropped for RAC / Employee Dropped for ETS)
  const stages = [
    {
      id: 'TRIP_CREATED',
      title: 'Trip Created',
      desc: 'Booking created by vendor',
      offsetMinutes: 0,
    },
    {
      id: 'PUSH_TO_DRIVER',
      title: 'Push to Driver',
      desc: 'Broadcasted to driver pool / searching for driver',
      offsetMinutes: 2,
    },
    {
      id: 'DRIVER_ACCEPTED',
      title: 'Driver Accepted',
      desc:
        trip?.driverName && !trip.driverName.toLowerCase().includes('unassigned')
          ? `Accepted by ${trip.driverName}`
          : 'Nearby driver accepted booking',
      offsetMinutes: 7,
    },
    {
      id: 'DRIVER_PICKED',
      title: isETS ? 'Employee Picked' : 'Customer Picked',
      desc: isETS ? 'Driver arrived & employee picked up' : 'Driver arrived & customer picked up',
      offsetMinutes: 20,
    },
    {
      id: 'TRANSITING',
      title: 'Transiting',
      desc: 'Vehicle en route towards destination',
      offsetMinutes: 23,
    },
    {
      id: 'DROPPED',
      title: isETS ? 'Employee Dropped' : 'Customer Dropped',
      desc: isETS ? 'Employee safely dropped at hub/destination' : 'Customer safely dropped at destination',
      offsetMinutes: 60,
    },
  ]

  // Determine active stage index
  let activeIndex = 0
  if (currentStatus === 'SEARCHING_DRIVER') {
    activeIndex = 1
  } else if (currentStatus === 'DRIVER_ASSIGNED' || currentStatus === 'CONFIRMED') {
    if (trip?.driverName && !trip.driverName.toLowerCase().includes('unassigned')) {
      activeIndex = 2
    } else {
      activeIndex = 0
    }
  } else if (currentStatus === 'EN_ROUTE' || currentStatus === 'ARRIVED') {
    activeIndex = 3
  } else if (currentStatus === 'IN_PROGRESS') {
    activeIndex = 4
  } else if (currentStatus === 'COMPLETED') {
    activeIndex = 5
  }

  // Base timestamp for sequential timeline (Not same data across stages)
  const baseTime = trip?.createdAt ? new Date(trip.createdAt).getTime() : Date.now()
  const pushedMatch = trip?.notes?.match(/\[PushedAt:\s*([^\]]+)\]/)
  const pushedTime = pushedMatch
    ? new Date(pushedMatch[1]).getTime()
    : baseTime + 2 * 60 * 1000

  return (
    <div className="space-y-1">
      {stages.map((stage, idx) => {
        const isDone = !isCancelled && (currentStatus === 'COMPLETED' ? true : idx < activeIndex)
        const isCurrent = !isCancelled && currentStatus !== 'COMPLETED' && idx === activeIndex

        // Compute distinct sequential time for this stage
        let stageTimestamp: Date
        if (idx === 0) {
          stageTimestamp = new Date(baseTime)
        } else if (idx === 1) {
          stageTimestamp = new Date(pushedTime)
        } else {
          stageTimestamp = new Date(baseTime + stage.offsetMinutes * 60 * 1000)
        }

        return (
          <div key={stage.id} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 transition-colors',
                  isDone
                    ? 'bg-emerald-500 border-emerald-500'
                    : isCurrent
                    ? 'bg-amber-500 border-amber-500 shadow-sm'
                    : 'bg-white border-slate-200'
                )}
              >
                {isDone ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : isCurrent ? (
                  <Radio className="w-4 h-4 text-white animate-pulse" />
                ) : (
                  <Circle className="w-2.5 h-2.5 text-slate-300" />
                )}
              </div>
              {idx < stages.length - 1 && (
                <div
                  className={cn(
                    'w-0.5 h-7 mt-1 transition-colors',
                    isDone ? 'bg-emerald-400' : 'bg-slate-200'
                  )}
                />
              )}
            </div>

            <div className="pb-3 flex-1">
              <div className="flex items-center justify-between">
                <p
                  className={cn(
                    'text-xs sm:text-sm font-bold',
                    isDone
                      ? 'text-slate-900'
                      : isCurrent
                      ? 'text-amber-900'
                      : 'text-slate-500'
                  )}
                >
                  {stage.title}
                </p>
                {isCurrent && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full animate-pulse">
                    Current Stage
                  </span>
                )}
                {isDone && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Completed
                  </span>
                )}
              </div>

              {/* Distinct Sequential Time Mentioned Below Every Status */}
              <p
                className={cn(
                  'text-[11px] font-medium mt-0.5',
                  isDone
                    ? 'text-emerald-700 font-semibold'
                    : isCurrent
                    ? 'text-amber-800 font-semibold'
                    : 'text-slate-400'
                )}
              >
                {formatDateTime(stageTimestamp.toISOString())}
              </p>

              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                {stage.desc}
              </p>
            </div>
          </div>
        )
      })}

      {isCancelled && (
        <div className="flex items-start gap-3 pt-1">
          <div className="w-7 h-7 rounded-full bg-red-500 border-2 border-red-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="pb-2">
            <p className="text-sm font-bold text-red-700">Trip Cancelled</p>
            <p className="text-xs text-red-500 mt-0.5">This trip was cancelled and closed.</p>
          </div>
        </div>
      )}
    </div>
  )
}
