import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Filter, Download, ArrowUpRight, ArrowDownLeft, AlertTriangle } from 'lucide-react'
import { vendorApi } from '../lib/api'
import { WalletCard } from '../components/ui/WalletCard'
import { DataTable, Pagination } from '../components/ui/DataTable'
import { TransactionBadge } from '../components/ui/StatusBadge'
import { RechargeModal } from '../components/wallet/RechargeModal'
import { WithdrawModal } from '../components/wallet/WithdrawModal'
import { EditTransactionModal } from '../components/wallet/EditTransactionModal'
import { SlideDeleteAction } from '../components/ui/SlideDeleteAction'
import { SlideDeleteModal } from '../components/ui/SlideDeleteModal'
import { formatCurrency, formatDateTime } from '../lib/utils'
import type { Wallet, WalletTransaction, Trip } from '../types'
import toast from 'react-hot-toast'

export const WalletPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [rechargeOpen, setRechargeOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [editingTx, setEditingTx] = useState<WalletTransaction | null>(null)
  const [deletingTx, setDeletingTx] = useState<WalletTransaction | null>(null)

  const handleConfirmDelete = async () => {
    if (!deletingTx) return
    try {
      await vendorApi.deleteTransaction(deletingTx.id)
      toast.success('Wallet transaction deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete transaction.')
    } finally {
      setDeletingTx(null)
    }
  }

  // Fetch Wallet Balance
  const { data: wallet, isLoading: isWalletLoading } = useQuery<Wallet>({
    queryKey: ['wallet'],
    queryFn: async () => {
      const res = await vendorApi.getWallet()
      const data = res.data?.data || res.data || {}
      return {
        ...data,
        balance: parseFloat(data.balance ?? 0),
      }
    },
  })

  // Fetch Trips to verify ongoing trip status for withdrawal eligibility
  const { data: tripsData } = useQuery<{ data: Trip[] }>({
    queryKey: ['trips', 'wallet-check'],
    queryFn: async () => {
      const res = await vendorApi.getTrips()
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : []
      return { data: list }
    },
  })

  const allTrips = tripsData?.data || []
  const ongoingTrips = allTrips.filter((t) =>
    ['PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(t.tripStatus)
  )

  // Fetch Wallet Transactions
  const { data: txData, isLoading: isTxLoading } = useQuery<{
    data: WalletTransaction[]
    total: number
    totalPages: number
  }>({
    queryKey: ['wallet-transactions', page, typeFilter],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        limit: '15',
      }
      if (typeFilter) params.type = typeFilter
      const res = await vendorApi.getTransactions(params)
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

  const transactions = Array.isArray(txData?.data) ? txData.data : (Array.isArray(txData) ? txData : [])
  const total = txData?.total || transactions.length
  const totalPages = txData?.totalPages || 1
  const balance = wallet?.balance ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vendor Wallet</h1>
          <p className="text-xs text-slate-500 mt-1">
            Prepaid balance for trip bookings and automated driver payout settlements
          </p>
        </div>
      </div>

      {/* Wallet Frozen Notice Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-950 flex items-start gap-3.5 shadow-sm">
        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-amber-950">Wallet System Frozen</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 uppercase tracking-wide">
              Module Frozen
            </span>
          </div>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
            Wallet deductions and prepaid escrow requirements are currently frozen across the portal (including Rent A Cab and ETS). All trips and corporate shifts are dispatched under direct billing without requiring advance wallet balance or prepaid escrow.
          </p>
        </div>
      </div>

      {/* Wallet Balance Hero Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <WalletCard
            balance={balance}
            threshold={1000}
            onRecharge={() => setRechargeOpen(true)}
            onWithdraw={() => setWithdrawOpen(true)}
            hasOngoingTrips={ongoingTrips.length > 0}
            ongoingTripsCount={ongoingTrips.length}
          />
        </div>

        {/* Quick Info & Security Guarantee */}
        <div className="card p-6 flex flex-col justify-between space-y-4 bg-white">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Automated Settlement</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              When a trip is created, the trip fare is atomically deducted and held in escrow.
              Driver share is disbursed upon verified completion.
            </p>
          </div>

          <div className="border-t border-sky-100 pt-3 text-xs text-slate-600 space-y-1">
            <p className="font-medium text-sky-900">Payment Gateway Support:</p>
            <p className="text-slate-500">
              UPI, Credit/Debit Cards, NetBanking via Razorpay.
            </p>
          </div>
        </div>
      </div>

      {/* Transactions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Transaction History</h2>

          {/* Filter by Type */}
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                setPage(1)
              }}
              className="input text-xs py-1.5 w-36"
            >
              <option value="">All Types</option>
              <option value="CREDIT">Credits Only</option>
              <option value="DEBIT">Debits Only</option>
            </select>
          </div>
        </div>

        <div className="card overflow-hidden">
          <DataTable<WalletTransaction>
            columns={[
              {
                key: 'createdAt',
                header: 'Date & Time',
                render: (row) => (
                  <span className="text-xs text-slate-600">
                    {formatDateTime(row.createdAt)}
                  </span>
                ),
              },
              {
                key: 'type',
                header: 'Type',
                render: (row) => (
                  <div className="flex items-center gap-1.5">
                    {row.type === 'CREDIT' ? (
                      <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />
                    )}
                    <TransactionBadge type={row.type} />
                  </div>
                ),
              },
              {
                key: 'description',
                header: 'Description',
                render: (row) => (
                  <div>
                    <p className="font-semibold text-slate-800 text-xs">{row.description}</p>
                    {row.reference && (
                      <p className="text-[10px] text-slate-400 font-mono">Ref: {row.reference}</p>
                    )}
                  </div>
                ),
              },
              {
                key: 'amount',
                header: 'Amount',
                render: (row) => (
                  <span
                    className={`font-bold text-xs ${
                      row.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {row.type === 'CREDIT' ? '+' : '-'} {formatCurrency(row.amount)}
                  </span>
                ),
              },
              {
                key: 'previousBalance',
                header: 'Prev Balance',
                render: (row) => (
                  <span className="text-xs text-slate-500">
                    {formatCurrency(row.previousBalance)}
                  </span>
                ),
              },
              {
                key: 'newBalance',
                header: 'Balance After',
                render: (row) => (
                  <span className="font-semibold text-xs text-slate-900">
                    {formatCurrency(row.newBalance)}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                className: 'text-right',
                render: (row) => (
                  <SlideDeleteAction
                    itemLabel="transaction"
                    onEdit={() => setEditingTx(row)}
                    onDelete={() => setDeletingTx(row)}
                    onSlideDelete={() => setDeletingTx(row)}
                  />
                ),
              },
            ]}
            data={transactions}
            isLoading={isTxLoading}
            keyExtractor={(tx) => tx.id}
            emptyMessage="No wallet transactions recorded"
            emptyDescription="Recharge your wallet to view credit history."
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
      </div>

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        transaction={editingTx}
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] })
          queryClient.invalidateQueries({ queryKey: ['wallet'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        }}
      />

      {/* Slide to Delete Modal */}
      <SlideDeleteModal
        isOpen={!!deletingTx}
        onClose={() => setDeletingTx(null)}
        onConfirmDelete={handleConfirmDelete}
        title="Delete Wallet Transaction"
        entityName={deletingTx ? deletingTx.description : ''}
        entityDetails={
          deletingTx
            ? `Amount: ${formatCurrency(deletingTx.amount)} • Type: ${deletingTx.type} • Ref: ${deletingTx.reference || 'N/A'}`
            : undefined
        }
      />

      {/* Recharge Modal */}
      <RechargeModal
        isOpen={rechargeOpen}
        onClose={() => setRechargeOpen(false)}
      />

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        balance={balance}
        ongoingTrips={ongoingTrips}
      />
    </div>
  )
}
