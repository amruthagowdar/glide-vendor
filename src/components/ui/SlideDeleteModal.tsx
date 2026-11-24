import React, { useState, useRef, useEffect } from 'react'
import { Modal } from './Modal'
import { Trash2, AlertTriangle, ArrowRight, Check } from 'lucide-react'

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
  subtitle = 'This action will remove the record and record an audit log.',
  entityName,
  entityDetails,
}) => {
  const [sliderPos, setSliderPos] = useState(0) // 0 to 100%
  const [isDragging, setIsDragging] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSliderPos(0)
      setIsDragging(false)
      setIsDeleted(false)
    }
  }, [isOpen])

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const thumbWidth = 48
    const maxDrag = rect.width - thumbWidth
    const currentX = e.clientX - rect.left - thumbWidth / 2
    const clampedX = Math.max(0, Math.min(currentX, maxDrag))
    const pct = Math.round((clampedX / maxDrag) * 100)
    setSliderPos(pct)

    if (pct >= 90) {
      setIsDragging(false)
      setIsDeleted(true)
      setTimeout(() => {
        onConfirmDelete()
        onClose()
      }, 400)
    }
  }

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false)
      if (sliderPos < 90) {
        setSliderPos(0) // Spring back if not dragged all the way
      }
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-5">
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

        {/* Slide-to-Delete Slider Track */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700 text-center">
            Slide the button to the right to confirm delete:
          </p>

          <div
            ref={trackRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative h-14 rounded-full bg-slate-200 border border-slate-300 p-1 select-none overflow-hidden touch-none"
          >
            {/* Background progress fill */}
            <div
              className={`absolute inset-0 bg-red-600 transition-all duration-75 flex items-center pl-4 ${
                sliderPos > 10 ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ width: `${Math.max(12, sliderPos)}%` }}
            />

            {/* Slider track background label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs font-bold text-slate-600 tracking-wide uppercase">
              {isDeleted ? (
                <span className="text-white flex items-center gap-1.5 font-bold">
                  <Check className="w-4 h-4" /> Deleted
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-500">
                  <span>Slide to Delete</span>
                  <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
                </span>
              )}
            </div>

            {/* Draggable thumb */}
            <div
              onPointerDown={handlePointerDown}
              className={`absolute top-1 bottom-1 w-12 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-md border-2 border-white transition-transform ${
                isDeleted ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white hover:bg-red-700'
              }`}
              style={{
                left: `calc(${sliderPos}% * (100% - 48px) / 100)`,
                touchAction: 'none',
              }}
            >
              {isDeleted ? (
                <Check className="w-5 h-5" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </div>
          </div>
        </div>

        {/* Alternative direct actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs px-4 py-2 font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmDelete()
              onClose()
            }}
            className="text-xs text-red-600 hover:text-red-800 font-semibold underline px-2"
          >
            Direct Delete without Slide
          </button>
        </div>
      </div>
    </Modal>
  )
}
