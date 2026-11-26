import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Navigation,
  Users,
  Wallet,
  Clock,
  Car,
  Building2,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react'
import { vendorApi } from '../lib/api'
import { StatCard, LoadingState } from '../components/ui/LoadingState'
import { StatusBadge, TransactionBadge } from '../components/ui/StatusBadge'
import { DataTable } from '../components/ui/DataTable'
import { CreateTripModal } from '../components/trips/CreateTripModal'
import { RechargeModal } from '../components/wallet/RechargeModal'
import { DriverModal } from '../components/drivers/DriverModal'
import { TripDetailDrawer } from '../components/trips/TripDetailDrawer'
import { SlideDeleteAction } from '../components/ui/SlideDeleteAction'
import { SlideDeleteModal } from '../components/ui/SlideDeleteModal'
import { SlideToDeleteItem } from '../components/ui/SlideToDeleteItem'
import { EditTripModal } from '../components/trips/EditTripModal'
import { EditTransactionModal } from '../components/wallet/EditTransactionModal'
import { formatCurrency, formatDateTime, getWalletColor } from '../lib/utils'
import type { DashboardData, Trip, WalletTransaction, ServiceType } from '../types'
import toast from 'react-hot-toast'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [createTripOpen, setCreateTripOpen] = useState(false)
  const [rechargeOpen, setRechargeOpen] = useState(false)
  const [addDriverOpen, setAddDriverOpen] = useState(false)
  const [tripServiceType, setTripServiceType] = useState<ServiceType | undefined>(undefined)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)

  // Edit & Slide Delete States
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [editingTx, setEditingTx] = useState<WalletTransaction | null>(null)
  const [deletingItem, setDeletingItem] = useState<{
    type: 'TRIP' | 'TRANSACTION'
    id: string
    title: string
    details?: string
  } | null>(null)

  const handleConfirmDelete = async () => {
    if (!deletingItem) return
    try {
      if (deletingItem.type === 'TRIP') {
        await vendorApi.deleteTrip(deletingItem.id)
        toast.success(`${deletingItem.title} deleted successfully`)
      } else {
        await vendorApi.deleteTransaction(deletingItem.id)
        toast.success(`Transaction deleted successfully`)
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] })
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete record')
    } finally {
      setDeletingItem(null)
    }
  }

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
    queryFn: async () => {
      try {
        const res = await vendorApi.getDashboard()
        const raw = res.data?.data || res.data || {}
        return {
          todayTrips: raw.todayTrips || {
            total: raw.totalTrips ?? 0,
            pending: 0,
            confirmed: raw.activeTrips ?? 0,
            inProgress: raw.activeTrips ?? 0,
            completed: Math.max(0, (raw.totalTrips ?? 0) - (raw.activeTrips ?? 0)),
            cancelled: 0,
          },
          walletBalance: parseFloat(raw.walletBalance ?? 0),
          lowBalanceThreshold: raw.lowBalanceThreshold ?? 1000,
          activeDrivers: raw.activeDrivers ?? raw.totalDrivers ?? 0,
          totalDrivers: raw.totalDrivers ?? 0,
          upcomingTrips: raw.upcomingTrips || [],
          recentTrips: raw.recentTrips || [],
          recentTransactions: raw.recentTransactions || [],
        }
      } catch {
        return {
          todayTrips: {
            total: 0,
            pending: 0,
            confirmed: 0,
            inProgress: 0,
            completed: 0,
            cancelled: 0,
          },
          walletBalance: 0,
          lowBalanceThreshold: 1000,
          activeDrivers: 0,
          totalDrivers: 0,
          upcomingTrips: [],
          recentTrips: [],
          recentTransactions: [],
        }
      }
    },
  })

  const { data: txQuery } = useQuery<{ data: WalletTransaction[] }>({
    queryKey: ['dashboard-transactions'],
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      try {
        const res = await vendorApi.getTransactions({ limit: '6' })
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : []
        return { data: list }
      } catch {
        return { data: [] }
      }
    },
  })

  const recentTransactions: WalletTransaction[] =
    txQuery?.data && txQuery.data.length > 0
      ? txQuery.data
      : (data?.recentTransactions || [])

  if (isLoading) {
    return <LoadingState message="Loading vendor operations dashboard..." />
  }

  const walletBalance = data?.walletBalance ?? 0
  const threshold = data?.lowBalanceThreshold ?? 1000
  const colorState = getWalletColor(walletBalance, threshold)
  const todayTrips = data?.todayTrips || {
    total: 0,
    pending: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  }

  return (
    <div className="space-y-6">
      {/* Low Balance Warning Banner */}
      {colorState !== 'green' && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${colorState === 'red'
            ? 'bg-red-50 border-red-200 text-red-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">
                {colorState === 'red'
                  ? 'Critical: Wallet balance is below minimum threshold'
                  : 'Low Wallet Balance Notice'}
              </p>
              <p className="text-xs mt-0.5">
                Current balance is {formatCurrency(walletBalance)}. Minimum recommended is{' '}
                {formatCurrency(threshold)}. Top up now to prevent booking disruptions.
              </p>
            </div>
          </div>
          <button
            onClick={() => setRechargeOpen(true)}
            className="btn-accent text-xs font-semibold px-4 py-2 flex-shrink-0"
          >
            Recharge Now
          </button>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Operations Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time fleet status, driver availability, and today's schedule
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTripServiceType(undefined)
              setCreateTripOpen(true)
            }}
            className="btn-accent text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Car className="w-4 h-4" />
            <span>Rent A Cab</span>
          </button>
          <button
            onClick={() => navigate('/ets')}
            className="btn-secondary text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-2xs"
          >
            <Building2 className="w-4 h-4 text-slate-700" />
            <span>ETS Command</span>
          </button>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Trips"
          value={todayTrips.total}
          subtitle={`${todayTrips.inProgress} active · ${todayTrips.completed} completed`}
          icon={<Navigation className="w-5 h-5" />}
          colorClass="bg-sky-100 text-sky-800"
          onClick={() => navigate('/trips')}
        />
        <StatCard
          title="Wallet Balance"
          value={formatCurrency(walletBalance)}
          subtitle={walletBalance > 1000 ? 'Active Wallet Balance' : 'Click to Top Up'}
          icon={<Wallet className="w-5 h-5 text-emerald-600" />}
          colorClass="bg-emerald-50 text-emerald-700 border border-emerald-200"
          onClick={() => setRechargeOpen(true)}
        />
        <StatCard
          title="Active Trips"
          value={todayTrips.inProgress}
          subtitle="Trips currently active & on road"
          icon={<Car className="w-5 h-5" />}
          colorClass="bg-indigo-100 text-indigo-800"
          onClick={() => navigate('/trips')}
        />
        <StatCard
          title="Upcoming Trips"
          value={data?.upcomingTrips?.length ?? 0}
          subtitle="Trips scheduled for departure"
          icon={<Clock className="w-5 h-5" />}
          colorClass="bg-purple-100 text-purple-800"
          onClick={() => navigate('/trips')}
        />
      </div>

      {/* Two Column Section: Upcoming Trips & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Recent Trips */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="p-4 sm:px-6 border-b border-sky-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Trips</h2>
              <p className="text-xs text-slate-500">Last 10 scheduled or executed trips</p>
            </div>
            <button
              onClick={() => navigate('/trips')}
              className="text-xs text-sky-700 hover:text-sky-900 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <DataTable<Trip>
            columns={[
              {
                key: 'tripNo',
                header: 'Trip No',
                render: (row) => <span className="font-semibold text-sky-900">{row.tripNo}</span>,
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
                    <p className="font-medium text-slate-800">{row.passengerName}</p>
                    <p className="text-[11px] text-slate-400">{row.passengerPhone}</p>
                  </div>
                ),
              },
              {
                key: 'route',
                header: 'Route',
                render: (row) => (
                  <p className="text-xs max-w-[160px] truncate" title={`${row.pickup} → ${row.drop}`}>
                    {row.pickup} → {row.drop}
                  </p>
                ),
              },
              {
                key: 'driverName',
                header: 'Driver',
                render: (row) => (
                  <span className="text-xs text-slate-600">
                    {row.driverName || 'Unassigned'}
                  </span>
                ),
              },
              {
                key: 'tripStatus',
                header: 'Status',
                render: (row) => <StatusBadge status={row.tripStatus} />,
              },
              {
                key: 'tripAmount',
                header: 'Fare',
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
                    onDelete={() =>
                      setDeletingItem({
                        type: 'TRIP',
                        id: row.id,
                        title: `Trip ${row.tripNo}`,
                        details: `${row.passengerName} (${row.serviceType}) • ${row.pickup} → ${row.drop}`,
                      })
                    }
                    onSlideDelete={() =>
                      setDeletingItem({
                        type: 'TRIP',
                        id: row.id,
                        title: `Trip ${row.tripNo}`,
                        details: `${row.passengerName} (${row.serviceType}) • ${row.pickup} → ${row.drop}`,
                      })
                    }
                  />
                ),
              },
            ]}
            data={data?.recentTrips || []}
            keyExtractor={(t) => t.id}
            onRowClick={(t) => setSelectedTrip(t)}
            emptyMessage="No recent trips found"
            emptyDescription="Create your first fleet trip using the button above."
          />
        </div>

        {/* Right 1 col: Recent Wallet Transactions */}
        <div className="card overflow-hidden flex flex-col">
          <div className="p-4 border-b border-sky-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Wallet Activity</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500">Recent credits & debits</p>
            </div>
            <button
              onClick={() => navigate('/wallet')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 divide-y divide-sky-50 overflow-y-auto max-h-[380px]">
            {recentTransactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                  <Wallet className="w-5 h-5" />
                </div>
                No recent transactions recorded.
              </div>
            ) : (
              recentTransactions.slice(0, 6).map((tx: WalletTransaction) => (
                <SlideToDeleteItem
                  key={tx.id}
                  onDelete={() =>
                    setDeletingItem({
                      type: 'TRANSACTION',
                      id: tx.id,
                      title: tx.description,
                      details: `Amount: ${formatCurrency(tx.amount)} • Ref: ${tx.reference || 'N/A'}`,
                    })
                  }
                >
                  <div className="p-3 text-xs flex items-center justify-between w-full group">
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-slate-800 truncate">{tx.description}</p>
                      <p className="text-[11px] text-slate-400">{formatDateTime(tx.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <span
                          className={`font-semibold text-xs ${
                            tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {tx.type === 'CREDIT' ? '+' : '-'} {formatCurrency(tx.amount)}
                        </span>
                        <div className="mt-0.5">
                          <TransactionBadge type={tx.type} />
                        </div>
                      </div>
                      <SlideDeleteAction
                        itemLabel="transaction"
                        onEdit={() => setEditingTx(tx)}
                        onDelete={() =>
                          setDeletingItem({
                            type: 'TRANSACTION',
                            id: tx.id,
                            title: tx.description,
                            details: `Amount: ${formatCurrency(tx.amount)} • Ref: ${tx.reference || 'N/A'}`,
                          })
                        }
                        onSlideDelete={() =>
                          setDeletingItem({
                            type: 'TRANSACTION',
                            id: tx.id,
                            title: tx.description,
                            details: `Amount: ${formatCurrency(tx.amount)} • Ref: ${tx.reference || 'N/A'}`,
                          })
                        }
                      />
                    </div>
                  </div>
                </SlideToDeleteItem>
              ))
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Prepaid & Corporate Wallet Online
            </span>
            <button
              onClick={() => setRechargeOpen(true)}
              className="text-xs text-sky-700 hover:text-sky-900 font-semibold"
            >
              + Recharge
            </button>
          </div>
        </div>
      </div>

      {/* Modals & Drawers */}
      <CreateTripModal
        isOpen={createTripOpen}
        initialServiceType={tripServiceType}
        onClose={() => setCreateTripOpen(false)}
        onOpenRechargeModal={() => {
          setCreateTripOpen(false)
          setRechargeOpen(true)
        }}
      />

      <RechargeModal
        isOpen={rechargeOpen}
        onClose={() => setRechargeOpen(false)}
      />

      <DriverModal
        isOpen={addDriverOpen}
        onClose={() => setAddDriverOpen(false)}
      />

      <TripDetailDrawer
        trip={selectedTrip}
        isOpen={!!selectedTrip}
        onClose={() => setSelectedTrip(null)}
        onDelete={(t) => {
          setSelectedTrip(null)
          setDeletingItem({
            type: 'TRIP',
            id: t.id,
            title: `Trip ${t.tripNo}`,
            details: `${t.passengerName} (${t.serviceType}) • ${t.pickup} → ${t.drop}`,
          })
        }}
      />

      {/* Edit Trip Modal */}
      <EditTripModal
        trip={editingTrip}
        isOpen={!!editingTrip}
        onClose={() => setEditingTrip(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
          queryClient.invalidateQueries({ queryKey: ['trips'] })
        }}
      />

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        transaction={editingTx}
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
          queryClient.invalidateQueries({ queryKey: ['wallet'] })
          queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] })
        }}
      />

      {/* Slide to Delete Modal */}
      <SlideDeleteModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirmDelete={handleConfirmDelete}
        title={`Delete ${deletingItem?.type === 'TRIP' ? 'Trip' : 'Transaction'}`}
        entityName={deletingItem?.title || ''}
        entityDetails={deletingItem?.details}
      />
    </div>
  )
}
