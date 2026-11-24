import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowDownToLine,
  AlertTriangle,
  Lock,
  Building2,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  X,
} from 'lucide-react'
import { Modal } from '../ui/Modal'
import { vendorApi } from '../../lib/api'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import type { Trip } from '../../types'

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
  balance: number
  ongoingTrips: Trip[]
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  balance,
  ongoingTrips,
}) => {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState<string>('')
  const [method, setMethod] = useState<'BANK' | 'UPI'>('BANK')
  const [bankName, setBankName] = useState('HDFC Bank')
  const [accountNumber, setAccountNumber] = useState('50200084920192')
  const [ifsc, setIfsc] = useState('HDFC0000240')
  const [accountHolder, setAccountHolder] = useState('Atharva Travels')
  const [upiId, setUpiId] = useState('atharva.travels@okaxis')

  const hasOngoingTrips = ongoingTrips.length > 0
  const withdrawAmount = parseFloat(amount) || 0
  const isValidAmount = withdrawAmount >= 100 && withdrawAmount <= balance

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        amount: withdrawAmount,
        method,
        details:
          method === 'BANK'
            ? { bankName, accountNumber, ifsc, accountHolder }
            : { upiId },
      }
      return (await vendorApi.withdrawWallet(payload)).data
    },
    onSuccess: () => {
      toast.success(`${formatCurrency(withdrawAmount)} withdrawal requested successfully!`)
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setAmount('')
      onClose()
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to process withdrawal request.'
      toast.error(msg)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (hasOngoingTrips) {
      toast.error('Withdrawals are locked while trips are currently ongoing.')
      return
    }
    if (!isValidAmount) {
      toast.error(`Please enter a valid amount between ₹100 and ${formatCurrency(balance)}`)
      return
    }
    withdrawMutation.mutate()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Withdraw Wallet Funds" size="md">
      <div className="space-y-5">
        {/* State A: Ongoing Trips Warning (Withdrawal Locked) */}
        {hasOngoingTrips ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-amber-950">
                  Withdrawal Locked: Active Ongoing Trips
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Withdrawals can only be initiated when there are <strong>no ongoing trips</strong>. 
                  Currently, you have <strong>{ongoingTrips.length} active trip(s)</strong> in progress.
                  Wallet balance is held in advance escrow to guarantee driver payouts upon completion.
                </p>
              </div>
            </div>

            {/* List of active ongoing trips */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Active Ongoing Trips ({ongoingTrips.length})
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Escrow Required
                </span>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white p-1">
                {ongoingTrips.map((t) => (
                  <div key={t.id} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{t.tripNo}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          {t.tripStatus}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] truncate mt-0.5">
                        {t.passengerName} · {t.pickup} → {t.drop}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-bold text-slate-900">{formatCurrency(t.tripAmount)}</span>
                      <p className="text-[10px] text-slate-400">Escrow Held</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span>Once these ongoing trips are completed, you will be able to withdraw all settled funds.</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-xs sm:text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* State B: No Ongoing Trips — Withdrawal Allowed */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Available Balance Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-100 font-medium">Withdrawable Balance</p>
                <p className="text-2xl sm:text-3xl font-extrabold mt-0.5">{formatCurrency(balance)}</p>
                <p className="text-[11px] text-emerald-200 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> No active trips · 100% available for payout
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <ArrowDownToLine className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Withdrawal Amount Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Withdrawal Amount (₹) *</label>
                <button
                  type="button"
                  onClick={() => setAmount(String(balance))}
                  className="text-xs font-bold text-sky-700 hover:text-sky-900 cursor-pointer"
                >
                  Withdraw All ({formatCurrency(balance)})
                </button>
              </div>
              <input
                type="number"
                min="100"
                max={balance}
                step="10"
                placeholder="Enter amount to withdraw (Min ₹100)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input text-lg font-bold"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Settlement arrives directly to your registered account within 15–30 minutes via IMPS / UPI.
              </p>
            </div>

            {/* Payout Method Selection */}
            <div>
              <label className="label">Settlement Destination *</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setMethod('BANK')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    method === 'BANK'
                      ? 'border-sky-600 bg-sky-50 text-sky-950 ring-1 ring-sky-600'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Bank Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('UPI')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    method === 'UPI'
                      ? 'border-sky-600 bg-sky-50 text-sky-950 ring-1 ring-sky-600'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>UPI ID</span>
                </button>
              </div>

              {method === 'BANK' ? (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account Holder:</span>
                    <span className="font-semibold text-slate-800">{accountHolder}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bank Name:</span>
                    <span className="font-semibold text-slate-800">{bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account Number:</span>
                    <span className="font-mono font-semibold text-slate-800">{accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">IFSC Code:</span>
                    <span className="font-mono font-semibold text-slate-800">{ifsc}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Registered UPI ID:</span>
                    <span className="font-mono font-bold text-slate-800">{upiId}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Verified Atharva Travels Merchant VPA
                  </p>
                </div>
              )}
            </div>

            {/* Booking Notice Reminder */}
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200/80 text-[11px] text-sky-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-700 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Important Policy:</strong> To book any future trips, sufficient wallet balance must be present.
                If you withdraw all funds, you will need to recharge before confirming new customer bookings.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-xs sm:text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValidAmount || withdrawMutation.isPending}
                className="btn-accent text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>
                  {withdrawMutation.isPending
                    ? 'Processing...'
                    : `Confirm Withdrawal (${formatCurrency(withdrawAmount)})`}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
