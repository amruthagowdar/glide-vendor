import React from 'react'
import { Drawer } from '../ui/Modal'
import { StatusBadge, PaymentBadge } from '../ui/StatusBadge'
import { TripStatusTimeline } from '../ui/TripStatusTimeline'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import type { Trip } from '../../types'
import {
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Car,
  Receipt,
  FileText,
} from 'lucide-react'

interface TripDetailDrawerProps {
  trip: Trip | null
  isOpen: boolean
  onClose: () => void
}

export const TripDetailDrawer: React.FC<TripDetailDrawerProps> = ({
  trip,
  isOpen,
  onClose,
}) => {
  if (!trip) return null

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Trip ${trip.tripNo}`}>
      <div className="space-y-6">
        {/* Header Badges */}
        <div className="flex items-center justify-between pb-4 border-b border-sky-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-sky-100 text-sky-800">
              {trip.serviceType}
            </span>
            <StatusBadge status={trip.tripStatus} />
          </div>
          <PaymentBadge status={trip.paymentStatus} />
        </div>

        {/* Passenger Information */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-900 uppercase tracking-wider">
            <User className="w-4 h-4 text-sky-700" />
            <span>Passenger Details</span>
          </div>
          <p className="font-semibold text-slate-800 text-base">{trip.passengerName}</p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <a href={`tel:${trip.passengerPhone}`} className="hover:text-sky-800 underline">
              {trip.passengerPhone}
            </a>
          </div>
        </div>

        {/* Route Details */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-900 uppercase tracking-wider">
            <MapPin className="w-4 h-4 text-sky-700" />
            <span>Pickup & Drop Route</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-500">Pickup</p>
                <p className="text-slate-800 text-sm font-semibold">{trip.pickup}</p>
              </div>
            </div>
            <div className="w-0.5 h-4 bg-sky-200 ml-1" />
            <div className="flex items-start gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-500">Drop</p>
                <p className="text-slate-800 text-sm font-semibold">{trip.drop}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-900 uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-sky-700" />
            <span>Schedule</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-700">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{trip.scheduledDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{trip.scheduledTime}</span>
            </div>
          </div>
        </div>

        {/* Driver & Vehicle */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-900 uppercase tracking-wider">
            <Car className="w-4 h-4 text-sky-700" />
            <span>Assigned Fleet</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-slate-500">Driver:</p>
              <p className="font-semibold text-slate-800">
                {trip.driverName || 'Not Assigned'}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Vehicle:</p>
              <p className="font-semibold text-slate-800">
                {trip.vehicleRegNo || 'Not Assigned'}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="card p-4 space-y-2.5 bg-sky-50/50">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-900 uppercase tracking-wider">
            <Receipt className="w-4 h-4 text-sky-700" />
            <span>Financial Breakdown</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Total Trip Amount:</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(trip.tripAmount)}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Platform Commission ({trip.commissionRate || 10}%):</span>
              <span>- {formatCurrency(trip.commissionAmount || 0)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Driver Payable:</span>
              <span>{formatCurrency(trip.driverPayable || 0)}</span>
            </div>
            <div className="flex justify-between text-sky-900 font-bold border-t border-sky-200 pt-1.5">
              <span>Vendor Retained Margin:</span>
              <span>
                {formatCurrency(
                  trip.tripAmount - (trip.commissionAmount || 0) - (trip.driverPayable || 0)
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {trip.notes && (
          <div className="card p-4 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-600">
              <FileText className="w-3.5 h-3.5" />
              <span>Notes</span>
            </div>
            <p className="text-slate-600 italic">{trip.notes}</p>
          </div>
        )}

        {/* Status Timeline */}
        <div className="card p-4 space-y-3">
          <h4 className="text-xs font-semibold text-sky-900 uppercase tracking-wider">
            Status History Timeline
          </h4>
          <TripStatusTimeline
            history={trip.statusHistory || []}
            currentStatus={trip.tripStatus}
          />
        </div>

        <p className="text-[11px] text-slate-400 text-center">
          Created on {formatDateTime(trip.createdAt)}
        </p>
      </div>
    </Drawer>
  )
}
