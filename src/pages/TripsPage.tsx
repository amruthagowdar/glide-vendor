import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PlusCircle, Filter, Download, Building2, Car } from 'lucide-react'
import { vendorApi } from '../lib/api'
import { DataTable, Pagination } from '../components/ui/DataTable'
import { StatusBadge, PaymentBadge } from '../components/ui/StatusBadge'
import { CreateTripModal } from '../components/trips/CreateTripModal'
import { EditTripModal } from '../components/trips/EditTripModal'
import { RechargeModal } from '../components/wallet/RechargeModal'
import { TripDetailDrawer } from '../components/trips/TripDetailDrawer'
import { SlideDeleteAction } from '../components/ui/SlideDeleteAction'
import { SlideDeleteModal } from '../components/ui/SlideDeleteModal'
import { formatCurrency, formatDateTime } from '../lib/utils'
import type { Trip, ServiceType, TripStatus, Driver } from '../types'
import toast from 'react-hot-toast'

const SERVICES: ServiceType[] = ['RAC', 'EMERGENCY', 'OUTSTATION', 'PACKAGE']
const STATUSES: TripStatus[] = [
  'PENDING',
  'CONFIRMED',
  'DRIVER_ASSIGNED',
  'EN_ROUTE',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]

export const TripsPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [createModalOpen, setCreateModalOpen] = useState(
    searchParams.get('action') === 'create'
  )
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [serviceFilter, setServiceFilter] = useState<string>('')
  const [driverFilter, setDriverFilter] = useState<string>('')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [page, setPage] = useState<number>(1)

  const handleConfirmDelete = async () => {
    if (!deletingTrip) return
    try {
      await vendorApi.deleteTrip(deletingTrip.id)
      toast.success(`Trip ${deletingTrip.tripNo} deleted successfully`)
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete trip.')
    } finally {
      setDeletingTrip(null)
    }
  }

  // Fetch Drivers for dropdown filter
  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ['drivers-filter'],
    queryFn: async () => {
      const res = await vendorApi.getDrivers()
      return res.data?.data || res.data || []
    },
  })

  // Fetch Trips
  const { data, isLoading } = useQuery<{ data: Trip[]; total: number; totalPages: number }>({
    queryKey: ['trips', page, statusFilter, serviceFilter, driverFilter, dateFilter],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        limit: '15',
      }
      if (statusFilter) params.status = statusFilter
      if (serviceFilter) params.serviceType = serviceFilter
      if (driverFilter) params.driverId = driverFilter
      if (dateFilter) params.date = dateFilter

      const res = await vendorApi.getTrips(params)
      if (Array.isArray(res.data)) {
        return { data: res.data, total: res.data.length, totalPages: 1 }
      }
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : []
      return {
        data: list,
        total: res.data?.total || list.length,
        totalPages: res.data?.totalPages || 1,
      }
    },
  })

  const trips = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
  const total = data?.total || trips.length
  const totalPages = data?.totalPages || 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Trip Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch, track, and monitor all vendor fleet bookings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-100 text-slate-500 text-xs sm:text-sm font-semibold flex items-center gap-1.5 select-none cursor-not-allowed opacity-80 shadow-none"
            title="ETS module is frozen and cannot be opened"
          >
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>ETS</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600 border border-slate-300">
              Frozen
            </span>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn-accent text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Car className="w-4 h-4" />
            <span>Rent A Cab</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-700">
          <Filter className="w-3.5 h-3.5 text-sky-800" />
          <span>Filters & Search</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="input text-xs"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={serviceFilter}
              onChange={(e) => {
                setServiceFilter(e.target.value)
                setPage(1)
              }}
              className="input text-xs"
            >
              <option value="">All Service Types</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={driverFilter}
              onChange={(e) => {
                setDriverFilter(e.target.value)
                setPage(1)
              }}
              className="input text-xs"
            >
              <option value="">All Drivers</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value)
                setPage(1)
              }}
              className="input text-xs"
            />
          </div>
        </div>
      </div>

      {/* Trips Table Card */}
      <div className="card overflow-hidden">
        <DataTable<Trip>
          columns={[
            {
              key: 'tripNo',
              header: 'Trip No',
              render: (row) => (
                <span className="font-semibold text-sky-900 hover:underline">
                  {row.tripNo}
                </span>
              ),
            },
            {
              key: 'serviceType',
              header: 'Service',
              render: (row) => (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                  {row.serviceType}
                </span>
              ),
            },
            {
              key: 'passengerName',
              header: 'Passenger',
              render: (row) => (
                <div>
                  <p className="font-medium text-slate-800 text-xs">{row.passengerName}</p>
                  <p className="text-[11px] text-slate-400">{row.passengerPhone}</p>
                </div>
              ),
            },
            {
              key: 'pickup',
              header: 'Pickup & Drop',
              render: (row) => (
                <div className="text-xs max-w-[200px] truncate">
                  <p className="text-slate-800 truncate" title={row.pickup}>
                    📍 {row.pickup}
                  </p>
                  <p className="text-slate-400 truncate mt-0.5" title={row.drop}>
                    🏁 {row.drop}
                  </p>
                </div>
              ),
            },
            {
              key: 'scheduledDate',
              header: 'Date & Time',
              render: (row) => (
                <div className="text-xs">
                  <p className="font-medium text-slate-800">{row.scheduledDate}</p>
                  <p className="text-slate-400 text-[11px]">{row.scheduledTime}</p>
                </div>
              ),
            },
            {
              key: 'driverName',
              header: 'Driver',
              render: (row) => (
                <span className="text-xs text-slate-700">
                  {row.driverName || (
                    <span className="text-amber-600 font-medium">Unassigned</span>
                  )}
                </span>
              ),
            },
            {
              key: 'tripStatus',
              header: 'Status',
              render: (row) => <StatusBadge status={row.tripStatus} />,
            },
            {
              key: 'paymentStatus',
              header: 'Payment',
              render: () => (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                  Frozen
                </span>
              ),
            },
            {
              key: 'tripAmount',
              header: 'Amount',
              render: () => (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                  Frozen
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              className: 'text-right',
              render: (row) => (
                <SlideDeleteAction
                  itemLabel="trip"
                  onEdit={() => setEditingTrip(row)}
                  onDelete={() => setDeletingTrip(row)}
                  onSlideDelete={() => setDeletingTrip(row)}
                />
              ),
            },
          ]}
          data={trips}
          isLoading={isLoading}
          keyExtractor={(t) => t.id}
          onRowClick={(t) => setSelectedTrip(t)}
          emptyMessage="No trips found"
          emptyDescription="Try clearing filters or click 'Create New Trip'."
        />

        {total > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={15}
            onPageChange={(p) => setPage(p)}
          />
        )}
      </div>

      {/* Modals & Drawer */}
      <CreateTripModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false)
          searchParams.delete('action')
          setSearchParams(searchParams)
        }}
        onOpenRechargeModal={() => {
          setCreateModalOpen(false)
          setRechargeModalOpen(true)
        }}
      />

      <EditTripModal
        trip={editingTrip}
        isOpen={!!editingTrip}
        onClose={() => setEditingTrip(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['trips'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        }}
      />

      <SlideDeleteModal
        isOpen={!!deletingTrip}
        onClose={() => setDeletingTrip(null)}
        onConfirmDelete={handleConfirmDelete}
        title="Delete Trip"
        entityName={deletingTrip ? `Trip ${deletingTrip.tripNo}` : ''}
        entityDetails={
          deletingTrip
            ? `${deletingTrip.passengerName} (${deletingTrip.serviceType}) • ${deletingTrip.pickup} → ${deletingTrip.drop}`
            : undefined
        }
      />

      <RechargeModal
        isOpen={rechargeModalOpen}
        onClose={() => setRechargeModalOpen(false)}
      />

      <TripDetailDrawer
        trip={selectedTrip}
        isOpen={!!selectedTrip}
        onClose={() => setSelectedTrip(null)}
        onDelete={(t) => {
          setSelectedTrip(null)
          setDeletingTrip(t)
        }}
      />
    </div>
  )
}
