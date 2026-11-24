import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  TrendingUp,
  IndianRupee,
  Users,
  Download,
  FileSpreadsheet,
  Calendar,
  Search,
  Car,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { vendorApi } from '../lib/api'
import { formatCurrency } from '../lib/utils'
import { StatCard, LoadingState } from '../components/ui/LoadingState'
import { StatusBadge } from '../components/ui/StatusBadge'
import type { TripSummaryReport, FinancialSummaryReport, DriverPerformance, Trip } from '../types'

const COLORS = ['#0c4a6e', '#0284c7', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444']

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

  // Export real report to Excel (.xlsx) or CSV (.csv)
  const handleExport = (format: 'xlsx' | 'csv') => {
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

    if (format === 'xlsx') {
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
    } else {
      const worksheet = XLSX.utils.json_to_sheet(rows)
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet)
      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${baseName}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
      toast.success(`Successfully exported ${rows.length} trips to CSV!`)
    }
  }

  // Real Trip Summary Report
  const { data: tripReport, isLoading: isTripLoading } = useQuery<TripSummaryReport>({
    queryKey: ['report-trips', startDate, endDate],
    queryFn: async () => {
      try {
        const res = await vendorApi.getTripReport({ startDate, endDate })
        return res.data?.data || res.data || {
          totalTrips: 0,
          completedTrips: 0,
          cancelledTrips: 0,
          totalRevenue: 0,
          byService: {
            RAC: { count: 0, revenue: 0 },
            EMERGENCY: { count: 0, revenue: 0 },
            OUTSTATION: { count: 0, revenue: 0 },
            PACKAGE: { count: 0, revenue: 0 },
          },
          byStatus: {
            COMPLETED: 0,
            CANCELLED: 0,
            IN_PROGRESS: 0,
            CONFIRMED: 0,
            PENDING: 0,
            DRIVER_ASSIGNED: 0,
            EN_ROUTE: 0,
            ARRIVED: 0,
          },
        }
      } catch {
        return {
          totalTrips: 0,
          completedTrips: 0,
          cancelledTrips: 0,
          totalRevenue: 0,
          byService: {
            RAC: { count: 0, revenue: 0 },
            EMERGENCY: { count: 0, revenue: 0 },
            OUTSTATION: { count: 0, revenue: 0 },
            PACKAGE: { count: 0, revenue: 0 },
          },
          byStatus: {
            COMPLETED: 0,
            CANCELLED: 0,
            IN_PROGRESS: 0,
            CONFIRMED: 0,
            PENDING: 0,
            DRIVER_ASSIGNED: 0,
            EN_ROUTE: 0,
            ARRIVED: 0,
          },
        }
      }
    },
  })

  // Real Financial Report
  const { data: financialReport, isLoading: isFinLoading } = useQuery<FinancialSummaryReport>({
    queryKey: ['report-financial', startDate, endDate],
    queryFn: async () => {
      try {
        const res = await vendorApi.getFinancialReport({ startDate, endDate })
        return res.data?.data || res.data || {
          totalRevenue: 0,
          totalCommission: 0,
          totalDriverPayable: 0,
          netEarnings: 0,
          byDate: [],
        }
      } catch {
        return {
          totalRevenue: 0,
          totalCommission: 0,
          totalDriverPayable: 0,
          netEarnings: 0,
          byDate: [],
        }
      }
    },
  })

  // Real Driver Performance Report
  const { data: driverPerf = [] } = useQuery<DriverPerformance[]>({
    queryKey: ['report-driver-performance', startDate, endDate],
    queryFn: async () => {
      try {
        const res = await vendorApi.getDriverPerformance({ startDate, endDate })
        return res.data?.data || res.data || []
      } catch {
        return []
      }
    },
  })

  if (isTripLoading || isFinLoading || isTripsListLoading) {
    return <LoadingState message="Loading real operational reports and trips..." />
  }

  // Format real data for service breakdown chart
  const serviceChartData = Object.entries(tripReport?.byService || {}).map(([key, val]) => ({
    name: key,
    trips: val.count,
    revenue: val.revenue,
  }))

  const totalServiceTrips = serviceChartData.reduce((acc, curr) => acc + curr.trips, 0)
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
            Financial & Operational Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Revenue trends, commission breakdown, driver fleet performance, and monthly trips export
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

          {/* Export Monthly Report Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleExport('xlsx')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
              title="Download monthly trips report as Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>Install Report (.xlsx)</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 border border-slate-200 shadow-2xs transition"
              title="Download as CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Gross Revenue"
          value={formatCurrency(financialReport?.totalRevenue || 0)}
          subtitle="All completed trips"
          icon={<IndianRupee className="w-5 h-5" />}
          colorClass="bg-sky-100 text-sky-800"
        />
        <StatCard
          title="Platform Commission"
          value={formatCurrency(financialReport?.totalCommission || 0)}
          subtitle="Standard 10% platform fee"
          icon={<TrendingUp className="w-5 h-5" />}
          colorClass="bg-amber-100 text-amber-800"
        />
        <StatCard
          title="Driver Payables"
          value={formatCurrency(financialReport?.totalDriverPayable || 0)}
          subtitle="Disbursed to driver fleet"
          icon={<Users className="w-5 h-5" />}
          colorClass="bg-indigo-100 text-indigo-800"
        />
        <StatCard
          title="Net Vendor Margin"
          value={formatCurrency(financialReport?.netEarnings || 0)}
          subtitle="Net company profit"
          icon={<BarChart3 className="w-5 h-5" />}
          colorClass="bg-emerald-100 text-emerald-800"
        />
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

          {/* Direct Download Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('xlsx')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
              title="Download final report as Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel Report (.xlsx)</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 shadow-2xs transition"
              title="Download as CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
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
              <option value="EMERGENCY">Emergency</option>
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

      {/* Revenue & Service Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Trend */}
        <div className="card p-6">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Daily Revenue Breakdown</h3>
          <div className="h-64">
            {(financialReport?.byDate || []).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No revenue data for this date range</p>
                <p className="text-[11px] text-slate-400">Revenue activity will show here once trips are completed.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialReport?.byDate || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: number) => formatCurrency(val)}
                    contentStyle={{ backgroundColor: '#0c4a6e', color: '#fff', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Total Revenue" fill="#0369a1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="driverPayable" name="Driver Payable" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Trips by Service Category */}
        <div className="card p-6">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Trips by Service Category</h3>
          <div className="h-64">
            {totalServiceTrips === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Car className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No trip categories recorded</p>
                <p className="text-[11px] text-slate-400">Category split will appear once trips are scheduled.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceChartData}
                    dataKey="trips"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {serviceChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Driver Fleet Performance Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-sky-100">
          <h3 className="font-bold text-slate-800 text-sm">Driver Fleet Performance</h3>
          <p className="text-xs text-slate-500">Trip execution metrics and total driver payouts</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-sky-100 bg-sky-50 text-sky-900 font-semibold">
                <th className="px-4 py-3 text-left">Driver Name</th>
                <th className="px-4 py-3 text-center">Total Trips</th>
                <th className="px-4 py-3 text-center">Completed</th>
                <th className="px-4 py-3 text-center">Cancelled</th>
                <th className="px-4 py-3 text-right">Total Earnings Disbursed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {driverPerf.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    <p className="text-xs font-semibold text-slate-600">No driver activity in this period</p>
                    <p className="text-[11px] text-slate-400">Driver metrics appear when trips are assigned and completed.</p>
                  </td>
                </tr>
              ) : (
                driverPerf.map((d) => (
                  <tr key={d.driverId} className="hover:bg-sky-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{d.driverName}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{d.totalTrips}</td>
                    <td className="px-4 py-3 text-center text-emerald-600 font-medium">
                      {d.completedTrips}
                    </td>
                    <td className="px-4 py-3 text-center text-red-500 font-medium">
                      {d.cancelledTrips}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-sky-900">
                      {formatCurrency(d.totalEarnings)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
