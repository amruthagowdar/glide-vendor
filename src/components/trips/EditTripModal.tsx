import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { vendorApi } from '../../lib/api'
import { logAuditEvent } from '../../lib/auditLogger'
import type { Trip, Driver, TripStatus } from '../../types'
import { User, Phone, MapPin, Calendar, Clock, DollarSign, Car, FileText, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface EditTripModalProps {
  trip: Trip | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const ALL_STATUSES: TripStatus[] = [
  'PENDING',
  'CONFIRMED',
  'DRIVER_ASSIGNED',
  'EN_ROUTE',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]

export const EditTripModal: React.FC<EditTripModalProps> = ({
  trip,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [passengerName, setPassengerName] = useState('')
  const [passengerPhone, setPassengerPhone] = useState('')
  const [pickup, setPickup] = useState('')
  const [drop, setDrop] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [tripAmount, setTripAmount] = useState<number>(0)
  const [tripStatus, setTripStatus] = useState<TripStatus>('CONFIRMED')
  const [driverName, setDriverName] = useState('')
  const [vehicleRegNo, setVehicleRegNo] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (trip) {
      setPassengerName(trip.passengerName || '')
      setPassengerPhone(trip.passengerPhone || '')
      setPickup(trip.pickup || '')
      setDrop(trip.drop || '')
      setScheduledDate(trip.scheduledDate || '')
      setScheduledTime(trip.scheduledTime || '')
      setTripAmount(trip.tripAmount || 0)
      setTripStatus(trip.tripStatus || 'CONFIRMED')
      setDriverName(trip.driverName || '')
      setVehicleRegNo(trip.vehicleRegNo || '')
      setNotes(trip.notes || '')
    }
  }, [trip])

  if (!trip) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const updatedFields: Partial<Trip> = {
        passengerName,
        passengerPhone,
        pickup,
        drop,
        scheduledDate,
        scheduledTime,
        tripAmount: Number(tripAmount),
        tripStatus,
        driverName: driverName.trim() || undefined,
        vehicleRegNo: vehicleRegNo.trim() || undefined,
        notes,
      }

      await vendorApi.updateTrip(trip.id, updatedFields)

      // Audit Log
      logAuditEvent({
        action: 'TRIP_EDITED',
        entityType: 'TRIP',
        entityId: trip.id,
        entityTitle: `Trip ${trip.tripNo} (${trip.serviceType})`,
        performedBy: 'Vendor Admin',
        summary: `Updated trip ${trip.tripNo} details for passenger ${passengerName}`,
        details: {
          previous: trip,
          updated: { ...trip, ...updatedFields },
        },
      })

      toast.success(`Trip ${trip.tripNo} updated successfully!`)
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update trip.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Trip ${trip.tripNo} (${trip.serviceType})`}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Passenger Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs font-semibold">Passenger Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                className="input text-xs pl-9"
                placeholder="Full Name"
              />
            </div>
          </div>

          <div>
            <label className="label text-xs font-semibold">Passenger Phone</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="tel"
                required
                value={passengerPhone}
                onChange={(e) => setPassengerPhone(e.target.value)}
                className="input text-xs pl-9"
                placeholder="+91 98000 00000"
              />
            </div>
          </div>
        </div>

        {/* Route Details */}
        <div className="space-y-2">
          <div>
            <label className="label text-xs font-semibold">Pickup Address</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-emerald-500 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                className="input text-xs pl-9"
                placeholder="Pickup Location"
              />
            </div>
          </div>

          <div>
            <label className="label text-xs font-semibold">Drop Address</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-rose-500 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={drop}
                onChange={(e) => setDrop(e.target.value)}
                className="input text-xs pl-9"
                placeholder="Drop Destination"
              />
            </div>
          </div>
        </div>

        {/* Schedule & Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label text-xs font-semibold">Date</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="input text-xs pl-9"
              />
            </div>
          </div>

          <div>
            <label className="label text-xs font-semibold">Time</label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="input text-xs pl-9"
                placeholder="10:00"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label text-xs font-semibold mb-0">Trip Fare (₹)</label>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-600 border border-slate-300">
                Frozen
              </span>
            </div>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                readOnly
                disabled
                value="₹0 (Frozen)"
                className="input text-xs pl-9 bg-slate-100 text-slate-500 cursor-not-allowed select-none"
              />
            </div>
          </div>
        </div>

        {/* Fleet & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label text-xs font-semibold">Driver Name</label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="input text-xs"
              placeholder="Unassigned"
            />
          </div>

          <div>
            <label className="label text-xs font-semibold">Vehicle Reg</label>
            <input
              type="text"
              value={vehicleRegNo}
              onChange={(e) => setVehicleRegNo(e.target.value)}
              className="input text-xs"
              placeholder="e.g. KA-01-MJ-5821"
            />
          </div>

          <div>
            <label className="label text-xs font-semibold">Trip Status</label>
            <select
              value={tripStatus}
              onChange={(e) => setTripStatus(e.target.value as TripStatus)}
              className="input text-xs"
            >
              {ALL_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="label text-xs font-semibold">Notes / Instructions</label>
          <div className="relative">
            <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input text-xs pl-9"
              placeholder="Optional trip notes"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs px-4 py-2 font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="btn-accent text-xs px-4 py-2 font-semibold flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
