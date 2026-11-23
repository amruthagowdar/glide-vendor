import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Drawer } from '../ui/Modal'
import { StatusBadge } from '../ui/StatusBadge'
import { vendorApi } from '../../lib/api'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import type { Driver, Trip } from '../../types'
import { User, Phone, CreditCard, Car, Award, Calendar } from 'lucide-react'

interface DriverDetailDrawerProps {
  driver: Driver | null
  isOpen: boolean
  onClose: () => void
  onAssignVehicle: (driver: Driver) => void
}

export const DriverDetailDrawer: React.FC<DriverDetailDrawerProps> = ({
  driver,
  isOpen,
  onClose,
  onAssignVehicle,
}) => {
  if (!driver) return null

  const { data: driverTrips = [] } = useQuery<Trip[]>({
    queryKey: ['driver-trips', driver.id],
    queryFn: async () => {
      try {
        const res = await vendorApi.getDriverTrips(driver.id)
        return res.data?.data || res.data || []
      } catch {
        return []
      }
    },
    enabled: isOpen && !!driver.id,
  })

  const totalTrips = driverTrips.length
  const completedTrips = driverTrips.filter((t) => t.tripStatus === 'COMPLETED').length
  const totalEarned = driverTrips.reduce((acc, t) => acc + (t.driverPayable || 0), 0)

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={driver.name}>
      <div className="space-y-6">
        {/* Status bar */}
        <div className="flex items-center justify-between pb-3 border-b border-sky-100">
          <span
            className={`badge ${
              driver.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {driver.isActive ? 'Active Fleet Driver' : 'Inactive'}
          </span>
          <span className="text-xs text-slate-400">
            Registered: {formatDateTime(driver.createdAt)}
          </span>
        </div>

        {/* Contact info */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-900 uppercase">
            <User className="w-4 h-4 text-sky-700" />
            <span>Driver Identification</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{driver.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span>DL: <span className="font-semibold">{driver.licenseNo}</span></span>
            </div>
          </div>
        </div>

        {/* Vehicle Assignment */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-900 uppercase">
              <Car className="w-4 h-4 text-sky-700" />
              <span>Assigned Vehicle</span>
            </div>
            <button
              onClick={() => onAssignVehicle(driver)}
              className="text-xs text-sky-700 hover:text-sky-900 font-semibold"
            >
              {driver.vehicleRegNo ? 'Change' : 'Assign'}
            </button>
          </div>
          {driver.vehicleRegNo ? (
            <div className="text-xs text-slate-700 bg-sky-50 p-2.5 rounded-lg">
              <p className="font-bold text-slate-900">{driver.vehicleRegNo}</p>
              <p className="text-slate-500">{driver.vehicleModel || 'Fleet Vehicle'}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No vehicle assigned yet</p>
          )}
        </div>

        {/* Earnings summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="card p-3 text-center">
            <Award className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-base font-bold text-slate-800">{totalTrips}</p>
            <p className="text-[10px] text-slate-500">Total Trips</p>
          </div>
          <div className="card p-3 text-center">
            <Calendar className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
            <p className="text-base font-bold text-emerald-600">{completedTrips}</p>
            <p className="text-[10px] text-slate-500">Completed</p>
          </div>
          <div className="card p-3 text-center">
            <span className="text-xs font-bold text-sky-700 block mb-1">₹</span>
            <p className="text-sm font-bold text-sky-900 truncate">
              {formatCurrency(totalEarned)}
            </p>
            <p className="text-[10px] text-slate-500">Earned</p>
          </div>
        </div>

        {/* Recent trip history */}
        <div>
          <h4 className="text-xs font-semibold text-sky-900 uppercase mb-2">
            Trip History ({driverTrips.length})
          </h4>
          {driverTrips.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No trips assigned to this driver yet.</p>
          ) : (
            <div className="space-y-2">
              {driverTrips.slice(0, 5).map((trip) => (
                <div
                  key={trip.id}
                  className="card p-3 text-xs space-y-1 hover:border-sky-300 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-800">{trip.tripNo}</span>
                    <StatusBadge status={trip.tripStatus} />
                  </div>
                  <p className="text-slate-500 truncate">
                    {trip.pickup} → {trip.drop}
                  </p>
                  <div className="flex justify-between text-slate-400 text-[11px] pt-1 border-t">
                    <span>{trip.scheduledDate}</span>
                    <span className="font-medium text-slate-700">
                      Payable: {formatCurrency(trip.driverPayable || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  )
}
