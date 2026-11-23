import React from 'react'
import { cn, serviceTypeConfig } from '../../lib/utils'
import { Plane, Siren, MapPin, Package } from 'lucide-react'
import type { ServiceType } from '../../types'

const iconMap = { Plane, Siren, MapPin, Package }

interface ServiceCardProps {
  service: ServiceType
  selected?: boolean
  onClick?: () => void
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, selected, onClick }) => {
  const config = serviceTypeConfig[service]
  const Icon = iconMap[config.icon as keyof typeof iconMap]

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 w-full',
        'hover:shadow-md hover:-translate-y-0.5',
        config.bg,
        selected
          ? `border-current shadow-lg scale-105 ring-2 ring-offset-2 ${config.color.replace('text-', 'ring-')}`
          : 'border-transparent hover:border-current'
      )}
    >
      <div className={cn(
        'w-16 h-16 rounded-2xl flex items-center justify-center',
        selected ? 'bg-white shadow-md' : 'bg-white/70'
      )}>
        <Icon className={cn('w-8 h-8', config.color)} />
      </div>
      <div className="text-center">
        <p className={cn('font-semibold text-sm', config.color)}>{config.label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{getServiceDescription(service)}</p>
      </div>
    </button>
  )
}

function getServiceDescription(service: ServiceType): string {
  const descs: Record<ServiceType, string> = {
    RAC: 'BLR Airport Pickup & Drop',
    EMERGENCY: 'Urgent/priority transport',
    OUTSTATION: 'Inter-city travel',
    PACKAGE: 'Multi-stop package',
  }
  return descs[service]
}
