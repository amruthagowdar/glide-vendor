import React from 'react'

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-700 rounded-full animate-spin" />
    <p className="text-slate-500 text-sm">{message}</p>
  </div>
)

interface EmptyStateProps {
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  icon?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action, icon }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    {icon || (
      <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center">
        <svg className="w-8 h-8 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
    )}
    <div className="text-center">
      <p className="font-semibold text-slate-700">{title}</p>
      {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
    </div>
    {action && (
      <button onClick={action.onClick} className="btn-primary mt-2 text-sm">
        {action.label}
      </button>
    )}
  </div>
)

export const SkeletonCard: React.FC = () => (
  <div className="card p-6 space-y-3">
    <div className="skeleton h-5 w-1/3 rounded" />
    <div className="skeleton h-8 w-1/2 rounded" />
    <div className="skeleton h-4 w-2/3 rounded" />
  </div>
)

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  colorClass?: string
  onClick?: () => void
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, colorClass = 'bg-sky-100 text-sky-700', onClick }) => (
  <div className={`card p-6 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} onClick={onClick}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
        {icon}
      </div>
    </div>
  </div>
)
