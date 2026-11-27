import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import type { TripStatus, ServiceType } from '../types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, hh:mm a')
  } catch {
    return dateStr
  }
}

export function formatTime(timeStr: string): string {
  try {
    const [hours, minutes] = timeStr.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayHour = h % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  } catch {
    return timeStr
  }
}

export const tripStatusConfig: Record<TripStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-slate-100 text-slate-700' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700' },
  TRIP_CREATED: { label: 'Trip Created', color: 'bg-sky-50 text-sky-700 border border-sky-200' },
  SEARCHING_DRIVER: { label: 'Searching for Driver', color: 'bg-amber-100 text-amber-800 border border-amber-200' },
  DRIVER_ASSIGNED: { label: 'Driver Assigned', color: 'bg-indigo-100 text-indigo-700' },
  EN_ROUTE: { label: 'En Route', color: 'bg-cyan-100 text-cyan-700' },
  ARRIVED: { label: 'Arrived', color: 'bg-purple-100 text-purple-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
}

export const serviceTypeConfig: Record<ServiceType, { label: string; color: string; icon: string; bg: string }> = {
  RAC: { label: 'Airport Transfer', color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200', icon: 'Plane' },
  ETS: { label: 'Employee Transport', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: 'Users' },
  OUTSTATION: { label: 'Outstation', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: 'MapPin' },
  PACKAGE: { label: 'Package', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: 'Package' },
}

export function getWalletColor(balance: number, threshold: number = 1000): 'green' | 'amber' | 'red' {
  if (balance >= threshold * 2) return 'green'
  if (balance >= threshold) return 'amber'
  return 'red'
}

export function truncate(str: string, length: number = 30): string {
  return str.length > length ? str.substring(0, length) + '...' : str
}

export function generateTripNo(): string {
  return `TRP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
}
