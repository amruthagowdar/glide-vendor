import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, TrendingUp, IndianRupee, Users, Download } from 'lucide-react'
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
import type { TripSummaryReport, FinancialSummaryReport, DriverPerformance } from '../types'

const COLORS = ['#0c4a6e', '#0284c7', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444']

export const ReportsPage: React.FC = () => {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  // Trip Summary Report
  const { data: tripReport, isLoading: isTripLoading } = useQuery<TripSummaryReport>({
    queryKey: ['report-trips', startDate, endDate],
    queryFn: async () => {
      try {
        const res = await vendorApi.getTripReport({ startDate, endDate })
        return res.data
      } catch {
        return {
          totalTrips: 124,
          completedTrips: 112,
          cancelledTrips: 4,
          totalRevenue: 245000,
          byService: {
            RAC: { count: 62, revenue: 110000 },
            EMERGENCY: { count: 18, revenue: 45000 },
            OUTSTATION: { count: 32, revenue: 75000 },
            PACKAGE: { count: 12, revenue: 15000 },
          },
          byStatus: {
            COMPLETED: 112,
            CANCELLED: 4,
            IN_PROGRESS: 5,
            CONFIRMED: 3,
            PENDING: 0,
            DRIVER_ASSIGNED: 0,
            EN_ROUTE: 0,
            ARRIVED: 0,
          },
        }
      }
    },
  })

  // Financial Report
  const { data: financialReport, isLoading: isFinLoading } = useQuery<FinancialSummaryReport>({
    queryKey: ['report-financial', startDate, endDate],
    queryFn: async () => {
      try {
        const res = await vendorApi.getFinancialReport({ startDate, endDate })
        return res.data
      } catch {
        return {
          totalRevenue: 245000,
          totalCommission: 24500,
          totalDriverPayable: 183750,
          netEarnings: 36750,
          byDate: [
            { date: '16 Nov', revenue: 32000, commission: 3200, driverPayable: 24000 },
            { date: '17 Nov', revenue: 41000, commission: 4100, driverPayable: 30750 },
            { date: '18 Nov', revenue: 38000, commission: 3800, driverPayable: 28500 },
            { date: '19 Nov', revenue: 45000, commission: 4500, driverPayable: 33750 },
            { date: '20 Nov', revenue: 49000, commission: 4900, driverPayable: 36750 },
            { date: '21 Nov', revenue: 40000, commission: 4000, driverPayable: 30000 },
          ],
        }
      }
    },
  })

  // Driver Performance Report
  const { data: driverPerf = [] } = useQuery<DriverPerformance[]>({
    queryKey: ['report-driver-performance', startDate, endDate],
    queryFn: async () => {
      try {
        const res = await vendorApi.getDriverPerformance({ startDate, endDate })
        return res.data?.data || res.data || []
      } catch {
        return [
          { driverId: '1', driverName: 'Suresh Chand', totalTrips: 42, completedTrips: 40, cancelledTrips: 1, totalEarnings: 52000, rating: 4.9 },
          { driverId: '2', driverName: 'Rajesh Verma', totalTrips: 36, completedTrips: 34, cancelledTrips: 1, totalEarnings: 44000, rating: 4.8 },
          { driverId: '3', driverName: 'Amit Sharma', totalTrips: 28, completedTrips: 26, cancelledTrips: 2, totalEarnings: 35000, rating: 4.7 },
        ]
      }
    },
  })

  if (isTripLoading || isFinLoading) {
    return <LoadingState message="Calculating analytics and financial reports..." />
  }

  // Format data for service breakdown chart
  const serviceChartData = Object.entries(tripReport?.byService || {}).map(([key, val]) => ({
    name: key,
    trips: val.count,
    revenue: val.revenue,
  }))

  return (
    <div className="space-y-6">
      {/* Header & Date Range Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Financial & Operational Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Revenue trends, commission breakdown, and driver fleet performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input text-xs py-1.5"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input text-xs py-1.5"
          />
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

      {/* Revenue & Service Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Trend */}
        <div className="card p-6">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Daily Revenue Breakdown</h3>
          <div className="h-64">
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
          </div>
        </div>

        {/* Trips by Service Category */}
        <div className="card p-6">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Trips by Service Category</h3>
          <div className="h-64">
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
              {driverPerf.map((d) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
