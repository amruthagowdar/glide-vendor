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

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000, 25000]

export const RechargeModal: React.FC<RechargeModalProps> = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState<number>(2500)
  const [customAmount, setCustomAmount] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  const finalAmount = customAmount ? parseFloat(customAmount) || 0 : amount

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>256-bit Secure Razorpay Checkout</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary text-sm" disabled={isLoading}>
              Cancel
            </button>
            <button
              onClick={handleRecharge}
              disabled={isLoading || finalAmount <= 0}
              className="btn-accent text-sm flex items-center gap-1.5"
            >
              {isLoading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <IndianRupee className="w-4 h-4" />
                  <span>Pay {formatCurrency(finalAmount)}</span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="label">Select Quick Amount</label>
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
                    ? 'bg-sky-900 text-white border-sky-900 shadow-sm'
                    : 'border-sky-200 text-slate-700 hover:bg-sky-50'
                }`}
              >
                ₹{val.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Or Enter Custom Amount (₹)</label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              ₹
            </span>
            <input
              type="number"
              min="100"
              step="100"
              placeholder="e.g. 15000"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value)
                setAmount(0)
              }}
              className="input pl-8"
            />
          </div>
        </div>

        <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-800 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertCircle className="w-4 h-4 text-sky-700" />
            <span>Atomic Balance Top-up</span>
          </div>
          <p>
            Recharged funds are credited atomically upon server verification and immediately available for new trip bookings and driver payouts.
          </p>
        </div>
      </div>
    </Modal>
  )
}
