import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { vendorApi } from '../../lib/api'
import type { Vehicle } from '../../types'

interface VehicleModalProps {
  isOpen: boolean
  onClose: () => void
  vehicle?: Vehicle | null
}

const VEHICLE_TYPES = [
  { value: 'HATCHBACK', label: 'Hatchback (Glide Go)' },
  { value: 'SEDAN', label: 'Sedan (Glide Comfort / Premier)' },
  { value: 'SUV', label: 'SUV (Glide XL)' },
  { value: 'AUTO', label: 'Auto Rickshaw' },
  { value: 'BIKE', label: 'Motorcycle / Bike' },
]

export const VehicleModal: React.FC<VehicleModalProps> = ({ isOpen, onClose, vehicle }) => {
  const queryClient = useQueryClient()
  const isEditing = !!vehicle

  const [registrationNo, setRegistrationNo] = useState('')
  const [model, setModel] = useState('')
  const [type, setType] = useState('SEDAN')
  const [capacity, setCapacity] = useState(4)

  useEffect(() => {
    if (vehicle) {
      setRegistrationNo(vehicle.registrationNo || '')
      setModel(vehicle.model || '')
      setType(vehicle.type || 'SEDAN')
      setCapacity(vehicle.capacity || 4)
    } else {
      setRegistrationNo('')
      setModel('')
      setType('SEDAN')
      setCapacity(4)
    }
  }, [vehicle, isOpen])

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        registrationNo: registrationNo.toUpperCase().trim(),
        model: model.trim(),
        type,
        capacity: Number(capacity),
      }
      if (isEditing && vehicle) {
        return (await vendorApi.updateVehicle(vehicle.id, payload)).data
      } else {
        return (await vendorApi.createVehicle(payload)).data
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Vehicle updated successfully' : 'Vehicle registered successfully')
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to save vehicle')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!registrationNo.trim() || !model.trim()) {
      toast.error('Registration plate and model are required')
      return
    }
    mutation.mutate()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Vehicle' : 'Register New Fleet Vehicle'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">License / Registration Plate *</label>
          <input
            type="text"
            required
            placeholder="e.g. KA-01-AB-1234"
            value={registrationNo}
            onChange={(e) => setRegistrationNo(e.target.value.toUpperCase())}
            className="input font-mono uppercase"
          />
        </div>

        <div>
          <label className="label">Make & Model *</label>
          <input
            type="text"
            required
            placeholder="e.g. Maruti Suzuki Dzire"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="input"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Vehicle Class *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="input bg-white"
            >
              {VEHICLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Passenger Capacity *</label>
            <input
              type="number"
              min={1}
              max={12}
              required
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
              className="input"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={mutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving...' : isEditing ? 'Update Vehicle' : 'Register Vehicle'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
