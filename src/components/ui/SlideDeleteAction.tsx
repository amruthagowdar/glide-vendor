import React, { useState, useRef, useEffect } from 'react'
import { MoreVertical, Edit3, Trash2, SlidersHorizontal, Radio } from 'lucide-react'

interface SlideDeleteActionProps {
  onEdit: () => void
  onDelete: () => void
  onSlideDelete?: () => void
  onPushToDriver?: () => void
  isSearchingDriver?: boolean
  itemLabel?: string
}

export const SlideDeleteAction: React.FC<SlideDeleteActionProps> = ({
  onEdit,
  onDelete,
  onSlideDelete,
  onPushToDriver,
  isSearchingDriver = false,
  itemLabel = 'item',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div
      ref={menuRef}
      className="relative flex items-center justify-end gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Quick Slide Delete Pill Trigger */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (onSlideDelete) onSlideDelete()
          else onDelete()
        }}
        title={`Slide to delete this ${itemLabel}`}
        className="opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 shadow-2xs whitespace-nowrap"
      >
        <SlidersHorizontal className="w-3 h-3 text-red-600" />
        <span>Slide Delete</span>
      </button>

      {/* Three-Dot Menu Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen((prev) => !prev)
        }}
        className={`p-1.5 rounded-lg border transition-colors ${
          isOpen
            ? 'bg-slate-200 text-slate-900 border-slate-300'
            : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-200'
        }`}
        title="More Actions (Edit / Delete)"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-white border border-slate-200 shadow-xl z-50 py-1.5 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
          {onPushToDriver && (
            <div className="py-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(false)
                  onPushToDriver()
                }}
                disabled={isSearchingDriver}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 hover:text-amber-900 transition-colors text-left disabled:opacity-60 cursor-pointer"
              >
                <Radio className={`w-3.5 h-3.5 text-amber-600 ${isSearchingDriver ? 'animate-pulse' : ''}`} />
                <span>{isSearchingDriver ? 'Searching Driver...' : 'Push to Driver'}</span>
              </button>
            </div>
          )}

          <div className="py-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(false)
                onEdit()
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-900 transition-colors text-left"
            >
              <Edit3 className="w-3.5 h-3.5 text-sky-600" />
              <span>Edit Details</span>
            </button>
          </div>

          <div className="py-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(false)
                if (onSlideDelete) onSlideDelete()
                else onDelete()
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-left"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-red-600" />
              <span>Slide to Delete</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(false)
                onDelete()
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-left"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Delete Record</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
