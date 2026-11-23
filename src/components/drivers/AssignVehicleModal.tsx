import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { vendorApi } from '../../lib/api'
import type { Driver, Vehicle } from '../../types'

interface AssignVehicleModalProps {
  isOpen: boolean
  onClose: () => void
  driver: Driver | null
}

export const AssignVehicleModal: React.FC<AssignVehicleModalProps> = ({
  isOpen,
  onClose,
  driver,
}) => {
  const queryClient = useQueryClient()
  const [vehicleId, setVehicleId] = useState('')

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles-active'],
    queryFn: async () => {
      const res = await vendorApi.getVehicles({ isActive: 'true' })
      return res.data?.data || res.data || []
    },
    enabled: isOpen,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (!driver || !vehicleId) return
      return (await vendorApi.assignVehicle(driver.id, vehicleId)).data
    },
    onSuccess: () => {
      toast.success('Vehicle assigned to driver successfully')
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to assign vehicle')
    },
  })

  if (!driver) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Vehicle to ${driver.name}`}
      size="sm"
    >
      <div className="space-y-4">
        <div>
          <label className="label">Select Vehicle from Fleet</label>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="input"
          >
            <option value="">-- Choose a Vehicle --</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registrationNo} — {v.model} ({v.type})
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-sky-100">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={!vehicleId || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="btn-primary text-sm font-semibold"
          >
            {mutation.isPending ? 'Assigning...' : 'Assign Vehicle'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
