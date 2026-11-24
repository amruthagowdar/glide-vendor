import React, { useState, useRef } from 'react'
import { Trash2 } from 'lucide-react'

interface SlideToDeleteItemProps {
  children: React.ReactNode
  onDelete: () => void
  onSlideTrigger?: () => void
  className?: string
}

export const SlideToDeleteItem: React.FC<SlideToDeleteItemProps> = ({
  children,
  onDelete,
  className = '',
}) => {
  const [dragOffset, setDragOffset] = useState(0) // 0 to -80px
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const currentOffsetRef = useRef(0)

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag on primary mouse button or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return
    // Don't drag if clicking buttons, inputs or menus
    if ((e.target as HTMLElement).closest('button, input, select, a, [role="button"]')) {
      return
    }

    setIsDragging(true)
    startXRef.current = e.clientX
    currentOffsetRef.current = dragOffset
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const deltaX = e.clientX - startXRef.current
    // Only allow dragging to the left (negative X)
    const newOffset = Math.min(0, Math.max(-100, currentOffsetRef.current + deltaX))
    setDragOffset(newOffset)
  }

  const handlePointerUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    // Snap to open (-80px) if dragged past -35px, else snap back to 0
    if (dragOffset < -35) {
      setDragOffset(-80)
    } else {
      setDragOffset(0)
    }
  }

  return (
    <div className={`relative overflow-hidden group select-none ${className}`}>
      {/* Background Red Delete Button */}
      <div className="absolute inset-y-0 right-0 w-20 bg-red-600 flex items-center justify-center z-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setDragOffset(0)
            onDelete()
          }}
          className="w-full h-full flex flex-col items-center justify-center text-white hover:bg-red-700 transition-colors p-1"
          title="Delete this record"
        >
          <Trash2 className="w-4 h-4 animate-bounce" />
          <span className="text-[10px] font-bold mt-0.5">Delete</span>
        </button>
      </div>

      {/* Foreground Sliding Content */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative bg-white z-10 transition-transform duration-150 ease-out flex items-center w-full"
        style={{
          transform: `translateX(${dragOffset}px)`,
          touchAction: 'pan-y',
        }}
      >
        <div className="w-full">{children}</div>
      </div>
    </div>
  )
}
