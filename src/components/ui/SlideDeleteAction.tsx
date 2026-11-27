import React, { useState, useRef, useEffect } from 'react'
import { MoreVertical, Edit3, Trash2, Radio } from 'lucide-react'

interface SlideDeleteActionProps {
  onEdit?: () => void
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
      className="flex items-center justify-end gap-1.5 whitespace-nowrap"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Direct Push to Driver Action Button on the row */}
      {onPushToDriver && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onPushToDriver()
          }}
          title={
            isSearchingDriver
              ? 'Broadcasting to driver pool... Searching for nearby drivers. Click to view search timer & boost fare.'
              : 'Push trip broadcast to drivers'
          }
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            isSearchingDriver
              ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 animate-pulse shadow-2xs'
              : 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-xs'
          }`}
        >
          <Radio className={`w-3.5 h-3.5 ${isSearchingDriver ? 'text-amber-600 animate-spin' : 'text-white'}`} />
          <span>{isSearchingDriver ? 'Searching Driver...' : 'Push to Driver'}</span>
        </button>
      )}

      {/* When three dots are tapped: Pen & Delete buttons appear on the SAME line */}
      {isOpen && (
        <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-150">
          {/* Pen (Edit) Button - Only displayed if onEdit is provided */}
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(false)
                onEdit()
              }}
              title={`Edit ${itemLabel}`}
              className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 shadow-2xs flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete (Trash) Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(false)
              if (onSlideDelete) onSlideDelete()
              else onDelete()
            }}
            title={`Delete ${itemLabel}`}
            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 shadow-2xs flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Three-Dot Menu Button to toggle Pen and Delete on the same line */}
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
        title={isOpen ? 'Hide actions' : `Show actions for this ${itemLabel}`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>
    </div>
  )
}
