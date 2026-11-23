import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { PlusCircle, Edit2, Ban, CheckCircle, UserCheck, XCircle } from 'lucide-react'
import { vendorApi } from '../lib/api'
import { DataTable } from '../components/ui/DataTable'
import { VehicleModal } from '../components/vehicles/VehicleModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import type { Vehicle } from '../types'

export const VehiclesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [deactivatingVehicle, setDeactivatingVehicle] = useState<Vehicle | null>(null)
  const [unassigningVehicle, setUnassigningVehicle] = useState<Vehicle | null>(null)

  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await vendorApi.getVehicles()
      return res.data?.data || res.data || []
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async (vehicle: Vehicle) => {
      return (
        await vendorApi.updateVehicle(vehicle.id, {
          isActive: !vehicle.isActive,
        })
      ).data
    },
    onSuccess: (_, vehicle) => {
      toast.success(
        vehicle.isActive ? 'Vehicle marked inactive' : 'Vehicle activated successfully'
      )
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setDeactivatingVehicle(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to update vehicle status')
    },
  })

  const unassignMutation = useMutation({
    mutationFn: async (vehicleId: string) => {
      return (await vendorApi.unassignDriver(vehicleId)).data
    },
    onSuccess: () => {
      toast.success('Driver unassigned from vehicle')
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
      setUnassigningVehicle(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to unassign driver')
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fleet Vehicles</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your company's registered cabs, capacity, and driver allocations
          </p>
        </div>
        <button
          onClick={() => {
            setEditingVehicle(null)
            setIsModalOpen(true)
          }}
          className="btn-accent text-sm font-semibold flex items-center gap-1.5 shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Fleet Vehicle</span>
        </button>
      </div>

      {/* Vehicles Table Card */}
      <div className="card overflow-hidden">
        <DataTable<Vehicle>
          columns={[
            {
              key: 'registrationNo',
              header: 'Registration No',
              render: (row) => (
                <span className="font-bold text-sky-900 tracking-wide">
                  {row.registrationNo}
                </span>
              ),
            },
            {
              key: 'model',
              header: 'Make & Model',
              render: (row) => (
                <div>
                  <p className="font-semibold text-slate-800 text-xs">{row.model}</p>
                  <span className="text-[10px] uppercase font-bold text-slate-500 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                    {row.type}
                  </span>
                </div>
              ),
            },
            {
              key: 'capacity',
              header: 'Capacity',
              render: (row) => (
                <span className="text-xs text-slate-700 font-medium">
                  {row.capacity} Passengers
                </span>
              ),
            },
            {
              key: 'driverName',
              header: 'Assigned Driver',
              render: (row) =>
                row.driverName ? (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs text-slate-800 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      {row.driverName}
                    </span>
                    <button
                      onClick={() => setUnassigningVehicle(row)}
                      title="Unassign Driver"
                      className="text-slate-400 hover:text-red-500"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">Unassigned</span>
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
                  {row.isActive ? 'Active Fleet' : 'Inactive'}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingVehicle(row)
                      setIsModalOpen(true)
                    }}
                    title="Edit Vehicle"
                    className="p-1.5 text-slate-400 hover:text-sky-800 hover:bg-sky-50 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeactivatingVehicle(row)}
                    title={row.isActive ? 'Deactivate Vehicle' : 'Activate Vehicle'}
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
          data={vehicles}
          isLoading={isLoading}
          keyExtractor={(v) => v.id}
          emptyMessage="No vehicles found in fleet"
          emptyDescription="Register your vehicles with registration plate and model."
        />
      </div>

      {/* Add/Edit Modal */}
      <VehicleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingVehicle(null)
        }}
        vehicle={editingVehicle}
      />

      {/* Toggle status confirmation */}
      <ConfirmDialog
        isOpen={!!deactivatingVehicle}
        onClose={() => setDeactivatingVehicle(null)}
        onConfirm={() => {
          if (deactivatingVehicle) toggleStatusMutation.mutate(deactivatingVehicle)
        }}
        title={deactivatingVehicle?.isActive ? 'Deactivate Vehicle' : 'Activate Vehicle'}
        message={
          deactivatingVehicle?.isActive
            ? `Mark vehicle ${deactivatingVehicle?.registrationNo} as inactive? It cannot be selected for new trips.`
            : `Activate vehicle ${deactivatingVehicle?.registrationNo} for trip dispatch?`
        }
        confirmLabel={deactivatingVehicle?.isActive ? 'Deactivate' : 'Activate'}
        variant={deactivatingVehicle?.isActive ? 'danger' : 'primary'}
        isLoading={toggleStatusMutation.isPending}
      />

      {/* Unassign Driver Confirmation */}
      <ConfirmDialog
        isOpen={!!unassigningVehicle}
        onClose={() => setUnassigningVehicle(null)}
        onConfirm={() => {
          if (unassigningVehicle) unassignMutation.mutate(unassigningVehicle.id)
        }}
        title="Unassign Driver"
        message={`Are you sure you want to unassign ${unassigningVehicle?.driverName} from vehicle ${unassigningVehicle?.registrationNo}?`}
        confirmLabel="Unassign"
        variant="danger"
        isLoading={unassignMutation.isPending}
      />
    </div>
  )
}
