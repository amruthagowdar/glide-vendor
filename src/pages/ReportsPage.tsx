import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Download,
  FileSpreadsheet,
  Calendar,
  Search,
  Car,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { vendorApi } from '../lib/api'
import { LoadingState } from '../components/ui/LoadingState'
import { StatusBadge } from '../components/ui/StatusBadge'
import type { Trip } from '../types'

export const ReportsPage: React.FC = () => {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  // Filters for Monthly Trips section
  const [tripSearch, setTripSearch] = useState('')
  const [tripServiceFilter, setTripServiceFilter] = useState('')
  const [tripStatusFilter, setTripStatusFilter] = useState('')

  // Quick date presets
  const handleDatePreset = (preset: 'thisMonth' | 'lastMonth' | 'last30Days') => {
    const now = new Date()
    if (preset === 'thisMonth') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      setStartDate(first.toISOString().split('T')[0])
      setEndDate(now.toISOString().split('T')[0])
    } else if (preset === 'lastMonth') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const last = new Date(now.getFullYear(), now.getMonth(), 0)
      setStartDate(first.toISOString().split('T')[0])
      setEndDate(last.toISOString().split('T')[0])
    } else if (preset === 'last30Days') {
      const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      setStartDate(past.toISOString().split('T')[0])
      setEndDate(now.toISOString().split('T')[0])
    }
  }

  // Fetch Real Trips for Monthly Report Table & Export
  const { data: allTrips = [], isLoading: isTripsListLoading } = useQuery<Trip[]>({
    queryKey: ['report-monthly-trips'],
    queryFn: async () => {
      try {
        const res = await vendorApi.getTrips({ limit: '1000' })
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : []
        return list
      } catch {
        return []
      }
    },
  })

  // Filter real trips by selected date range and user filters
  const filteredTrips = useMemo(() => {
    return (allTrips || []).filter((trip) => {
      // Date range check
      const tripDate = trip.scheduledDate || (trip.createdAt ? trip.createdAt.split('T')[0] : '')
      if (startDate && tripDate && tripDate < startDate) return false
      if (endDate && tripDate && tripDate > endDate) return false

      // Service filter
      if (tripServiceFilter && trip.serviceType !== tripServiceFilter) return false

      // Status filter
      if (tripStatusFilter && trip.tripStatus !== tripStatusFilter) return false

      // Search query filter
      if (tripSearch.trim()) {
        const q = tripSearch.toLowerCase().trim()
        const matchTripNo = trip.tripNo?.toLowerCase().includes(q)
        const matchPassenger = trip.passengerName?.toLowerCase().includes(q)
        const matchPhone = trip.passengerPhone?.toLowerCase().includes(q)
        const matchDriver = trip.driverName?.toLowerCase().includes(q)
        const matchPickup = trip.pickup?.toLowerCase().includes(q)
        const matchDrop = trip.drop?.toLowerCase().includes(q)
        const matchNotes = trip.notes?.toLowerCase().includes(q)
        if (
          !matchTripNo &&
          !matchPassenger &&
          !matchPhone &&
          !matchDriver &&
          !matchPickup &&
          !matchDrop &&
          !matchNotes
        ) {
          return false
        }
      }

      return true
    })
  }, [allTrips, startDate, endDate, tripServiceFilter, tripStatusFilter, tripSearch])

  // Export real report to Excel (.xlsx)
  const handleExport = () => {
    if (filteredTrips.length === 0) {
      toast.error('No trips available to export for the selected date range.')
      return
    }

    const rows = filteredTrips.map((t, idx) => {
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
        'Fare / Billing': 'Direct Corporate Billing [Frozen]',
        'Special Notes': t.notes || '',
        'Created Date': t.createdAt ? t.createdAt.split('T')[0] : '',
      }
    })

    const baseName = `Monthly_Trips_Report_${startDate}_to_${endDate}`

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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trips Report')
    XLSX.writeFile(workbook, `${baseName}.xlsx`)
    toast.success(`Successfully exported ${rows.length} trips to Excel!`)
  }

  if (isTripsListLoading) {
    return <LoadingState message="Loading monthly trips register..." />
  }

  const completedCount = filteredTrips.filter((t) => t.tripStatus === 'COMPLETED').length
  const activeCount = filteredTrips.filter((t) =>
    ['CONFIRMED', 'IN_PROGRESS', 'DRIVER_ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'PENDING'].includes(
      t.tripStatus
    )
  ).length
  const cancelledCount = filteredTrips.filter((t) => t.tripStatus === 'CANCELLED').length

  return (
    <div className="space-y-6">
      {/* Header & Date Range Picker */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Monthly Trips Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Filter dispatch records by custom date range and download complete monthly trip statements
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick presets */}
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs shadow-2xs">
            <button
              onClick={() => handleDatePreset('thisMonth')}
              className="px-2.5 py-1 text-slate-600 hover:text-sky-900 hover:bg-sky-50 rounded transition font-medium"
            >
              This Month
            </button>
            <button
              onClick={() => handleDatePreset('lastMonth')}
              className="px-2.5 py-1 text-slate-600 hover:text-sky-900 hover:bg-sky-50 rounded transition font-medium"
            >
              Last Month
            </button>
            <button
              onClick={() => handleDatePreset('last30Days')}
              className="px-2.5 py-1 text-slate-600 hover:text-sky-900 hover:bg-sky-50 rounded transition font-medium"
            >
              30 Days
            </button>
          </div>

          {/* Date inputs */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs text-slate-700 outline-none bg-transparent"
              title="Start Date"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs text-slate-700 outline-none bg-transparent"
              title="End Date"
            />
          </div>
        </div>
      </div>

      {/* Final Monthly Trips Report Section */}
      <div className="card overflow-hidden border border-sky-200/80 shadow-sm">
        {/* Section Header */}
        <div className="p-4 sm:p-5 border-b border-sky-100 bg-gradient-to-r from-sky-50/70 via-white to-sky-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-sky-800 text-white shadow-xs">
                <Car className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                    Final Monthly Trips Report
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                    {filteredTrips.length} Trips
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Filtered trips from <span className="font-semibold text-slate-700">{startDate}</span> to{' '}
                  <span className="font-semibold text-slate-700">{endDate}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Direct Download Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
              title="Download final report as Excel (.xlsx)"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Search & Quick Filters Bar */}
        <div className="p-3.5 border-b border-sky-50 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search trip no, passenger, phone, driver, location..."
              value={tripSearch}
              onChange={(e) => setTripSearch(e.target.value)}
              className="input pl-8 text-xs py-1.5 w-full bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={tripServiceFilter}
              onChange={(e) => setTripServiceFilter(e.target.value)}
              className="input text-xs py-1.5 bg-white w-full sm:w-36"
            >
              <option value="">All Services</option>
              <option value="RAC">RAC</option>
              <option value="OUTSTATION">Outstation</option>
              <option value="PACKAGE">Package</option>
            </select>

            <select
              value={tripStatusFilter}
              onChange={(e) => setTripStatusFilter(e.target.value)}
              className="input text-xs py-1.5 bg-white w-full sm:w-36"
            >
              <option value="">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Period Summary Badges */}
        <div className="px-4 py-2.5 bg-sky-50/40 border-b border-sky-100 flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
          <span className="text-slate-500 font-medium">Monthly Summary:</span>
          <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
            Total Trips: {filteredTrips.length}
          </span>
          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Completed: {completedCount}
          </span>
          <span className="font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
            Active / Confirmed: {activeCount}
          </span>
          {cancelledCount > 0 && (
            <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              Cancelled: {cancelledCount}
            </span>
          )}
          <span className="font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            Settlement: Direct Corporate Billing [Frozen]
          </span>
        </div>

        {/* Trips Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-sky-100 bg-sky-50 text-sky-900 font-semibold">
                <th className="px-4 py-3 text-left">Trip No</th>
                <th className="px-3 py-3 text-left">Service</th>
                <th className="px-3 py-3 text-left">Date & Time</th>
                <th className="px-4 py-3 text-left">Passenger</th>
                <th className="px-4 py-3 text-left">Route (Pickup → Drop)</th>
                <th className="px-3 py-3 text-left">Vehicle Details</th>
                <th className="px-3 py-3 text-left">Driver</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Fare / Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Car className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">
                        No trips found for the selected date range
                      </p>
                      <p className="text-xs text-slate-400">
                        Adjust your start and end dates or clear filters to view trips.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTrips.map((trip) => {
                  const vehicleMatch = trip.notes?.match(/\[Vehicle:\s*([^\]]+)\]/)
                  const vehicleInfo = vehicleMatch
                    ? vehicleMatch[1]
                    : trip.vehicleRegNo || 'Sedan'

                  return (
                    <tr key={trip.id} className="hover:bg-sky-50/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-sky-900 whitespace-nowrap">
                        {trip.tripNo}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                          {trip.serviceType}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{trip.scheduledDate}</div>
                        <div className="text-[11px] text-slate-400">{trip.scheduledTime}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{trip.passengerName}</div>
                        <div className="text-[11px] text-slate-400">{trip.passengerPhone}</div>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="truncate text-slate-800 font-medium" title={trip.pickup}>
                          {trip.pickup}
                        </div>
                        <div className="truncate text-[11px] text-slate-400" title={trip.drop}>
                          → {trip.drop}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-700">
                        <span className="font-medium">{vehicleInfo}</span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-700">
                        {trip.driverName ? (
                          <span className="font-medium text-slate-800">{trip.driverName}</span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <StatusBadge status={trip.tripStatus} />
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                          [Frozen]
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
