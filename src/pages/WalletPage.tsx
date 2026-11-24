import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Filter, Download, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { vendorApi } from '../lib/api'
import { WalletCard } from '../components/ui/WalletCard'
import { DataTable, Pagination } from '../components/ui/DataTable'
import { TransactionBadge } from '../components/ui/StatusBadge'
import { RechargeModal } from '../components/wallet/RechargeModal'
import { formatCurrency, formatDateTime } from '../lib/utils'
import type { Wallet, WalletTransaction } from '../types'

export const WalletPage: React.FC = () => {
  const [rechargeOpen, setRechargeOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [page, setPage] = useState<number>(1)

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

      {/* Wallet Balance Hero Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <WalletCard
            balance={balance}
            threshold={1000}
            onRecharge={() => setRechargeOpen(true)}
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

      {/* Recharge Modal */}
      <RechargeModal
        isOpen={rechargeOpen}
        onClose={() => setRechargeOpen(false)}
      />
    </div>
  )
}
