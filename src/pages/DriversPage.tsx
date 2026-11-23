import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { UserPlus, Car, Phone, Eye, Edit2, Ban, CheckCircle } from 'lucide-react'
import { vendorApi } from '../lib/api'
import { DataTable } from '../components/ui/DataTable'
import { DriverModal } from '../components/drivers/DriverModal'
import { DriverDetailDrawer } from '../components/drivers/DriverDetailDrawer'
import { AssignVehicleModal } from '../components/drivers/AssignVehicleModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import type { Driver } from '../types'

export const DriversPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [viewingDriver, setViewingDriver] = useState<Driver | null>(null)
  const [assigningDriver, setAssigningDriver] = useState<Driver | null>(null)
  const [deactivatingDriver, setDeactivatingDriver] = useState<Driver | null>(null)

  const { data: drivers = [], isLoading } = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await vendorApi.getDrivers()
      return res.data?.data || res.data || []
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async (driver: Driver) => {
      return (
        await vendorApi.updateDriver(driver.id, {
          isActive: !driver.isActive,
        })
      ).data
    },
    onSuccess: (_, driver) => {
      toast.success(
        driver.isActive ? 'Driver deactivated' : 'Driver activated successfully'
      )
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setDeactivatingDriver(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to update driver status')
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Driver Fleet</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your company's drivers, licenses, and assigned vehicles
          </p>
        </div>
        <button
          onClick={() => {
            setEditingDriver(null)
            setIsModalOpen(true)
          }}
          className="btn-accent text-sm font-semibold flex items-center gap-1.5 shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Fleet Driver</span>
        </button>
      </div>

      {/* Drivers Table Card */}
      <div className="card overflow-hidden">
        <DataTable<Driver>
          columns={[
            {
              key: 'name',
              header: 'Driver Name',
              render: (row) => (
                <div>
                  <p className="font-semibold text-sky-900">{row.name}</p>
                  <p className="text-[11px] text-slate-400">License: {row.licenseNo}</p>
                </div>
              ),
            },
            {
              key: 'phone',
              header: 'Phone Number',
              render: (row) => (
                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{row.phone}</span>
                </div>
              ),
            },
            {
              key: 'vehicleRegNo',
              header: 'Vehicle Assigned',
              render: (row) =>
                row.vehicleRegNo ? (
                  <span className="font-medium text-xs text-slate-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {row.vehicleRegNo}
                  </span>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setAssigningDriver(row)
                    }}
                    className="text-xs text-amber-600 hover:text-amber-800 font-medium underline flex items-center gap-1"
                  >
                    <Car className="w-3 h-3" />
                    <span>Assign Vehicle</span>
                  </button>
                ),
            },
            {
              key: 'isActive',
              header: 'Status',
              render: (row) => (
                <span
                  className={`badge ${
                    row.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {row.isActive ? 'Active' : 'Inactive'}
                </span>
              ),
            },
            {
              key: 'activeTrips',
              header: 'Active Trips',
              render: (row) => (
                <span className="text-xs font-semibold text-slate-700">
                  {row.activeTrips ?? 0}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setViewingDriver(row)}
                    title="View Driver Details"
                    className="p-1.5 text-slate-400 hover:text-sky-800 hover:bg-sky-50 rounded"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingDriver(row)
                      setIsModalOpen(true)
                    }}
                    title="Edit Driver"
                    className="p-1.5 text-slate-400 hover:text-sky-800 hover:bg-sky-50 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setAssigningDriver(row)}
                    title="Assign Vehicle"
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                  >
                    <Car className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeactivatingDriver(row)}
                    title={row.isActive ? 'Deactivate Driver' : 'Activate Driver'}
                    className={`p-1.5 rounded ${
                      row.isActive
                        ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                        : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    {row.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </button>
                </div>
              ),
            },
          ]}
          data={drivers}
          isLoading={isLoading}
          keyExtractor={(d) => d.id}
          onRowClick={(d) => setViewingDriver(d)}
          emptyMessage="No fleet drivers found"
          emptyDescription="Register your company's drivers to start assigning trips."
        />
      </div>

      {/* Driver Add/Edit Modal */}
      <DriverModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingDriver(null)
        }}
        driver={editingDriver}
      />

      {/* Driver Detail Drawer */}
      <DriverDetailDrawer
        driver={viewingDriver}
        isOpen={!!viewingDriver}
        onClose={() => setViewingDriver(null)}
        onAssignVehicle={(d) => {
          setViewingDriver(null)
          setAssigningDriver(d)
        }}
      />

      {/* Assign Vehicle Modal */}
      <AssignVehicleModal
        isOpen={!!assigningDriver}
        onClose={() => setAssigningDriver(null)}
        driver={assigningDriver}
      />

      {/* Toggle status confirmation dialog */}
      <ConfirmDialog
        isOpen={!!deactivatingDriver}
        onClose={() => setDeactivatingDriver(null)}
        onConfirm={() => {
          if (deactivatingDriver) toggleStatusMutation.mutate(deactivatingDriver)
        }}
        title={deactivatingDriver?.isActive ? 'Deactivate Driver' : 'Activate Driver'}
        message={
          deactivatingDriver?.isActive
            ? `Are you sure you want to deactivate ${deactivatingDriver?.name}? They will not be able to log in to the driver mobile app or be assigned to new trips.`
            : `Reactivate ${deactivatingDriver?.name} to receive trips?`
        }
        confirmLabel={deactivatingDriver?.isActive ? 'Deactivate' : 'Activate'}
        variant={deactivatingDriver?.isActive ? 'danger' : 'primary'}
        isLoading={toggleStatusMutation.isPending}
      />
    </div>
  )
}
