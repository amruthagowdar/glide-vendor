import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PlusCircle, Filter, Download, Building2, Car, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
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

const SERVICES: ServiceType[] = ['ETS', 'RAC', 'OUTSTATION', 'PACKAGE', 'EMERGENCY']
const STATUSES: TripStatus[] = [
  'TRIP_CREATED',
  'SEARCHING_DRIVER',
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

  const handlePushToDriver = async (trip: Trip) => {
    try {
      await vendorApi.updateTrip(trip.id, { tripStatus: 'SEARCHING_DRIVER' })
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(`Trip ${trip.tripNo} pushed to driver pool. Searching for nearby drivers...`, {
        icon: '📡',
        duration: 4000,
      })
    } catch (err) {
      console.error('Failed to push to driver:', err)
      toast.error('Could not push to driver. Please try again.')
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
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
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

  const handleExportTrips = () => {
    if (!trips || trips.length === 0) {
      toast.error('No trips available to export.')
      return
    }

    const rows = trips.map((t, idx) => {
      const vehicleMatch = t.notes?.match(/\[Vehicle:\s*([^\]]+)\]/)
      const vehicleInfo = vehicleMatch
        ? vehicleMatch[1]
        : t.vehicleRegNo
          ? `${t.vehicleRegNo}`
          : 'Sedan'

      return {
        'Sl No': idx + 1,
        'Trip ID': t.tripNo || t.id,
        'Service Type': t.serviceType,
        'Scheduled Date': t.scheduledDate || '',
        'Scheduled Time': t.scheduledTime || '',
        'Passenger Name': t.passengerName || 'N/A',
        'Passenger Contact': t.passengerPhone || 'N/A',
        'Pickup Location': t.pickup || '',
        'Drop Location': t.drop || 'As Directed',
        'Vehicle Category / Type': vehicleInfo,
        'Driver Assigned': t.driverName || 'Unassigned',
        'Trip Status': t.tripStatus,
        'Fare / Billing': formatCurrency(t.tripAmount || 0),
        'Special Notes': t.notes || '',
        'Created Date': t.createdAt ? t.createdAt.split('T')[0] : '',
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    worksheet['!cols'] = [
      { wch: 8 },  // Sl No
      { wch: 15 }, // Trip ID
      { wch: 14 }, // Service Type
      { wch: 14 }, // Scheduled Date
      { wch: 12 }, // Scheduled Time
      { wch: 22 }, // Passenger Name
      { wch: 18 }, // Passenger Contact
      { wch: 34 }, // Pickup Location
      { wch: 34 }, // Drop Location
      { wch: 24 }, // Vehicle Category / Type
      { wch: 20 }, // Driver Assigned
      { wch: 16 }, // Trip Status
      { wch: 28 }, // Fare / Billing
      { wch: 36 }, // Special Notes
      { wch: 15 }, // Created Date
    ]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trips')
    const filename = `Trips_Export_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, filename)
    toast.success(`Exported ${rows.length} trips to Excel!`)
  }

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
          <button
            onClick={() => navigate('/ets')}
            className="btn-secondary text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-2xs"
            title="Go to ETS Command"
          >
            <Building2 className="w-4 h-4 text-slate-700" />
            <span>ETS Command</span>
          </button>
          <button
            onClick={handleExportTrips}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-2xs transition"
            title="Export trips to Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Report</span>
          </button>
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
              render: (row) => {
                const isETS = row.serviceType === 'ETS' || String(row.tripNo || '').startsWith('ETS-')
                return (
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      isETS
                        ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                        : 'bg-sky-50 text-sky-800 border border-sky-200'
                    }`}
                  >
                    {isETS ? 'ETS' : row.serviceType}
                  </span>
                )
              },
            },
            {
              key: 'passengerName',
              header: 'Passenger / Employee',
              render: (row) => {
                const isETS = row.serviceType === 'ETS' || String(row.tripNo || '').startsWith('ETS-')
                return (
                  <div>
                    <p className="font-medium text-slate-800 text-xs">{row.passengerName}</p>
                    <p className="text-[11px] text-slate-400">
                      {isETS ? 'Employee' : 'Customer'} • {row.passengerPhone}
                    </p>
                  </div>
                )
              },
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
              render: (row) => <PaymentBadge status={row.paymentStatus} />,
            },
            {
              key: 'tripAmount',
              header: 'Amount',
              render: (row) => (
                <span className="font-semibold text-slate-800">
                  {formatCurrency(row.tripAmount || 0)}
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
                  onPushToDriver={() => handlePushToDriver(row)}
                  isSearchingDriver={row.tripStatus === 'SEARCHING_DRIVER'}
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
