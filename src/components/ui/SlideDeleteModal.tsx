import React from 'react'
import { Modal } from './Modal'
import { Trash2, AlertTriangle } from 'lucide-react'

interface SlideDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmDelete: () => void
  title: string
  subtitle?: string
  entityName: string
  entityDetails?: string
}

export const SlideDeleteModal: React.FC<SlideDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  title,
  subtitle = 'This action will permanently remove the record.',
  entityName,
  entityDetails,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-red-950">Confirm Record Deletion</p>
            <p className="text-red-800 leading-relaxed">{subtitle}</p>
          </div>
        </div>

        {/* Entity Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Target Item
          </p>
          <p className="text-sm font-bold text-slate-900 mt-0.5">{entityName}</p>
          {entityDetails && (
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{entityDetails}</p>
          )}
        </div>

        {/* Static Line & Action Buttons (No sliding / dragging track) */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs px-4 py-2 font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmDelete()
              onClose()
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </Modal>
  )
}
