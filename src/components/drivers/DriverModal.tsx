import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { vendorApi } from '../../lib/api'
import type { Driver } from '../../types'

interface DriverModalProps {
  isOpen: boolean
  onClose: () => void
  driver?: Driver | null
}

export const DriverModal: React.FC<DriverModalProps> = ({ isOpen, onClose, driver }) => {
  const queryClient = useQueryClient()
  const isEditing = !!driver

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [licenseNo, setLicenseNo] = useState('')

  useEffect(() => {
    if (driver) {
      setName(driver.name || '')
      setPhone(driver.phone || '')
      setLicenseNo(driver.licenseNo || '')
    } else {
      setName('')
      setPhone('')
      setLicenseNo('')
    }
  }, [driver, isOpen])

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEditing && driver) {
        return (await vendorApi.updateDriver(driver.id, { name, phone, licenseNo })).data
      } else {
        return (await vendorApi.createDriver({ name, phone, licenseNo })).data
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Driver updated successfully' : 'Driver registered successfully')
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to save driver')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim() || !licenseNo.trim()) {
      toast.error('All fields are required')
      return
    }
    mutation.mutate()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Driver' : 'Add New Fleet Driver'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Driver Full Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Suresh Chand"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label className="label">Phone Number *</label>
          <input
            type="tel"
            required
            placeholder="+91 9811002233"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            This phone is used for the driver mobile app login.
          </p>
        </div>

        <div>
          <label className="label">Commercial Driving License No *</label>
          <input
            type="text"
            required
            placeholder="DL-0420110099999"
            value={licenseNo}
            onChange={(e) => setLicenseNo(e.target.value)}
            className="input uppercase"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-sky-100">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary text-sm font-semibold"
          >
            {mutation.isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Register Driver'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
