import React, { useState, useRef, useEffect } from 'react'
import { MoreVertical, Edit3, Trash2, Radio } from 'lucide-react'

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
      className="relative flex items-center justify-end gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Visible Push to Driver Button directly on row */}
      {onPushToDriver && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (!isSearchingDriver) {
              onPushToDriver()
            }
          }}
          disabled={isSearchingDriver}
          title={
            isSearchingDriver
              ? 'Broadcasting to driver pool... Searching for nearby drivers'
              : 'Push trip broadcast to drivers'
          }
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            isSearchingDriver
              ? 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse cursor-not-allowed shadow-2xs'
              : 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-xs'
          }`}
        >
          <Radio className={`w-3.5 h-3.5 ${isSearchingDriver ? 'text-amber-600 animate-spin' : 'text-white'}`} />
          <span>{isSearchingDriver ? 'Searching Driver...' : 'Push to Driver'}</span>
        </button>
      )}

      {/* Three-Dot Menu Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen((prev) => !prev)
        }}
        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
          isOpen
            ? 'bg-slate-200 text-slate-900 border-slate-300'
            : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-200'
        }`}
        title={`More actions for this ${itemLabel}`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-white border border-slate-200 shadow-xl z-50 py-1 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
          <div className="py-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(false)
                onEdit()
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-900 transition-colors text-left cursor-pointer"
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
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-left cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
