import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { vendorApi } from '../../lib/api'
import { formatCurrency } from '../../lib/utils'
import { ShieldCheck, IndianRupee, AlertCircle } from 'lucide-react'

interface RechargeModalProps {
  isOpen: boolean
  onClose: () => void
}

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000, 25000, 100000]
const DAILY_LIMIT = 100000

function getTodayRecharged(): number {
  try {
    const today = new Date().toISOString().split('T')[0]
    const raw = localStorage.getItem('GLIDE_DAILY_RECHARGE')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.date === today) {
        return Number(parsed.total) || 0
      }
    }
  } catch {}
  return 0
}

function recordRechargeToday(addedAmount: number): void {
  try {
    const today = new Date().toISOString().split('T')[0]
    const current = getTodayRecharged()
    localStorage.setItem(
      'GLIDE_DAILY_RECHARGE',
      JSON.stringify({
        date: today,
        total: current + addedAmount,
      })
    )
  } catch {}
}

export const RechargeModal: React.FC<RechargeModalProps> = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState<number>(2500)
  const [customAmount, setCustomAmount] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  const finalAmount = customAmount ? parseFloat(customAmount) || 0 : amount
  const todayRecharged = getTodayRecharged()
  const remainingDailyLimit = Math.max(0, DAILY_LIMIT - todayRecharged)
  const isOverDailyLimit = finalAmount > remainingDailyLimit
  const isExceedingAbsoluteDaily = finalAmount > DAILY_LIMIT

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const handleRecharge = async () => {
    if (finalAmount <= 0) {
      toast.error('Please enter a valid amount greater than ₹0')
      return
    }

    if (finalAmount > DAILY_LIMIT) {
      toast.error('Maximum recharge limit is ₹1,00,000 per day')
      return
    }

    if (finalAmount > remainingDailyLimit) {
      toast.error(
        `Exceeds daily recharge limit. Remaining limit for today is ₹${remainingDailyLimit.toLocaleString('en-IN')}`
      )
      return
    }

    setIsLoading(true)
    try {
      const isScriptLoaded = await loadRazorpayScript()
      if (!isScriptLoaded) {
        toast.error('Failed to load payment gateway. Please check your internet.')
        setIsLoading(false)
        return
      }

      // Step 1: Create recharge order on server
      const { data: orderData } = await vendorApi.createRechargeOrder(finalAmount)
      const { orderId, currency, keyId } = orderData

      const options = {
        key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        amount: finalAmount * 100,
        currency: currency || 'INR',
        name: 'Chalo Vendor Portal',
        description: `Wallet Recharge: ${formatCurrency(finalAmount)}`,
        order_id: orderId,
        handler: async (response: RazorpayResponse) => {
          try {
            // Step 2: Server-side cryptographic signature verification
            await vendorApi.verifyRecharge({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              orderId,
            })

            recordRechargeToday(finalAmount)
            toast.success(`Wallet successfully recharged with ${formatCurrency(finalAmount)}!`)
            queryClient.invalidateQueries({ queryKey: ['wallet'] })
            queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
            onClose()
          } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(msg || 'Payment verification failed on server.')
          }
        },
        prefill: {
          name: 'Vendor Partner',
          email: 'vendor@chalo.com',
        },
        theme: {
          color: '#0c4a6e',
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to initiate recharge')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Recharge Vendor Wallet"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <button onClick={onClose} className="btn-secondary text-sm" disabled={isLoading}>
            Cancel
          </button>
          <button
            onClick={handleRecharge}
            disabled={isLoading || finalAmount <= 0 || isOverDailyLimit}
            className={`text-sm font-semibold whitespace-nowrap px-4 py-2 rounded-lg transition-all ${
              isOverDailyLimit
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                : 'bg-slate-800 hover:bg-slate-900 text-white shadow-sm border border-slate-700'
            }`}
          >
            {isLoading ? (
              <span>Processing...</span>
            ) : isOverDailyLimit ? (
              <span>Limit Exceeded (Max ₹1,00,000)</span>
            ) : (
              <span>Pay {formatCurrency(finalAmount)}</span>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="label text-slate-700">Select Quick Amount</label>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {PRESET_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setAmount(val)
                  setCustomAmount('')
                }}
                className={`py-2 px-3 text-sm font-medium rounded-lg border text-center transition-all ${
                  amount === val && !customAmount
                    ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                ₹{val.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label mb-0 text-slate-700">Or Enter Custom Amount (₹)</label>
            <span className="text-[11px] font-semibold text-slate-500">
              Limit: ₹1,00,000 / day {todayRecharged > 0 ? `(Remaining: ₹${remainingDailyLimit.toLocaleString('en-IN')})` : ''}
            </span>
          </div>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              ₹
            </span>
            <input
              type="number"
              min="100"
              max={remainingDailyLimit}
              step="100"
              placeholder="e.g. 15000 (Max ₹1,00,000/day)"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value)
                setAmount(0)
              }}
              className={`input pl-8 border-slate-300 ${isOverDailyLimit ? 'border-rose-400 focus:ring-rose-400' : ''}`}
            />
          </div>
          {isOverDailyLimit && (
            <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>
                {isExceedingAbsoluteDaily
                  ? 'Maximum recharge limit is ₹1,00,000 per day.'
                  : `Amount exceeds remaining daily limit of ₹${remainingDailyLimit.toLocaleString('en-IN')}.`}
              </span>
            </p>
          )}
        </div>

        <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-700 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <AlertCircle className="w-4 h-4 text-slate-500" />
            <span>Prepaid Balance Top-up (Wallet Frozen)</span>
          </div>
          <p className="text-slate-600">
            Recharged funds are credited atomically. Wallet deductions are frozen across portal bookings.
          </p>
        </div>
      </div>
    </Modal>
  )
}
