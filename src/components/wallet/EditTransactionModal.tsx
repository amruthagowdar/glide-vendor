import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { vendorApi } from '../../lib/api'
import { logAuditEvent } from '../../lib/auditLogger'
import type { WalletTransaction, TransactionType } from '../../types'
import { FileText, DollarSign, CheckCircle2, Hash, ArrowUpDown } from 'lucide-react'
import toast from 'react-hot-toast'

interface EditTransactionModalProps {
  transaction: WalletTransaction | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [description, setDescription] = useState('')
  const [reference, setReference] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [type, setType] = useState<TransactionType>('DEBIT')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description || '')
      setReference(transaction.reference || '')
      setAmount(transaction.amount || 0)
      setType(transaction.type || 'DEBIT')
    }
  }, [transaction])

  if (!transaction) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const updatedFields: Partial<WalletTransaction> = {
        description,
        reference,
        amount: Number(amount),
        type,
      }

      await vendorApi.updateTransaction(transaction.id, updatedFields)

      // Audit Log
      logAuditEvent({
        action: 'WALLET_TX_EDITED',
        entityType: 'WALLET_TRANSACTION',
        entityId: transaction.id,
        entityTitle: `Transaction ${transaction.reference || transaction.id}`,
        performedBy: 'Vendor Admin',
        summary: `Updated wallet transaction: ${description} (₹${amount})`,
        details: {
          previous: transaction,
          updated: { ...transaction, ...updatedFields },
        },
      })

      toast.success('Transaction updated successfully!')
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update transaction.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Wallet Transaction"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label text-xs font-semibold">Description</label>
          <div className="relative">
            <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input text-xs pl-9"
              placeholder="e.g. Advance Escrow for TRP-780454"
            />
          </div>
        </div>

        <div>
          <label className="label text-xs font-semibold">Reference ID</label>
          <div className="relative">
            <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="input text-xs pl-9 font-mono"
              placeholder="e.g. TRP-780454 or WTH-123456"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label text-xs font-semibold">Amount (₹)</label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="number"
                min="0"
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="input text-xs pl-9"
              />
            </div>
          </div>

          <div>
            <label className="label text-xs font-semibold">Transaction Type</label>
            <div className="relative">
              <ArrowUpDown className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className="input text-xs pl-9"
              >
                <option value="DEBIT">Debit (-)</option>
                <option value="CREDIT">Credit (+)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs px-4 py-2 font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="btn-accent text-xs px-4 py-2 font-semibold flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
