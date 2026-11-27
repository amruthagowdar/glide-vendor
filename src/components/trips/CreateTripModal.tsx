import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { ServiceCard } from '../ui/ServiceCard'
import { LocationMapModal } from './LocationMapModal'
import { vendorApi } from '../../lib/api'
import { formatCurrency } from '../../lib/utils'
import type { ServiceType, Wallet } from '../../types'
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  MapPin,
  Download,
  Share2,
  ChevronDown,
  Navigation,
  Building2,
  Mail,
  MessageCircle,
} from 'lucide-react'

interface CreateTripModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenRechargeModal: () => void
  initialServiceType?: ServiceType
}

const SERVICES: ServiceType[] = ['RAC', 'OUTSTATION', 'PACKAGE']

const VEHICLE_CATEGORIES = [
  'Mini 4+1',
  'Sedan',
  'SUV',
  'Prime Sedan',
  'Prime SUV',
] as const

type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number]

const VEHICLE_CATEGORY_TYPES: Record<VehicleCategory, string[]> = {
  'Mini 4+1': ['Mini', 'CNG'],
  'Sedan': ['Sedan', 'Sedan CNG'],
  'SUV': ['SUV', 'SUV CNG'],
  'Prime Sedan': ['EV', 'Petrol'],
  'Prime SUV': ['EV', 'Petrol'],
}

const PACKAGE_TYPES = ['4 hrs', '8 hrs', '12 hrs', '24 hrs'] as const
type PackageType = (typeof PACKAGE_TYPES)[number]

const TRIP_TYPES = ['One Way', 'Round Trip'] as const
type TripType = (typeof TRIP_TYPES)[number]

const BLR_TERMINALS = {
  T1: 'Kempegowda Intl Airport - Terminal 1 (T1)',
  T2: 'Kempegowda Intl Airport - Terminal 2 (T2)',
}

const BLR_AIRPORT_COORDS = { lat: 13.1986, lng: 77.7066 }

function calculateBLRDistanceKm(lat: number, lng: number): number {
  const R = 6371
  const dLat = ((lat - BLR_AIRPORT_COORDS.lat) * Math.PI) / 180
  const dLng = ((lng - BLR_AIRPORT_COORDS.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((BLR_AIRPORT_COORDS.lat * Math.PI) / 180) *
    Math.cos((lat * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.max(1, Math.round(R * c * 1.25))
}

function calculateAirportFare(distanceKm: number): number {
  const BASE_FARE = 1200
  const BASE_KM = 30
  const EXTRA_RATE_PER_KM = 28

  if (distanceKm <= BASE_KM) {
    return BASE_FARE
  }
  const extraKm = distanceKm - BASE_KM
  return Math.round(BASE_FARE + extraKm * EXTRA_RATE_PER_KM)
}

function estimateDistanceFromName(text: string): number | null {
  const lower = text.toLowerCase()
  if (lower.includes('electronic city') || lower.includes('ecity')) return 52
  if (lower.includes('whitefield') || lower.includes('itpl')) return 44
  if (lower.includes('hsr')) return 45
  if (lower.includes('bellandur') || lower.includes('ecospace')) return 43
  if (lower.includes('sarjapur')) return 48
  if (lower.includes('koramangala')) return 42
  if (lower.includes('indiranagar')) return 38
  if (lower.includes('mg road') || lower.includes('brigade')) return 35
  if (lower.includes('jayanagar') || lower.includes('jp nagar')) return 42
  if (lower.includes('btm') || lower.includes('bannerghatta')) return 45
  if (lower.includes('rajajinagar') || lower.includes('malleshwaram')) return 33
  if (lower.includes('manyata')) return 26
  if (lower.includes('hebbal')) return 28
  if (lower.includes('yelahanka')) return 18
  if (lower.includes('devanahalli')) return 12
  return null
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  isOpen,
  onClose,
  onOpenRechargeModal,
  initialServiceType,
}) => {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: Service (null until clicked)
  const [serviceType, setServiceType] = useState<ServiceType | null>(initialServiceType || null)

  // Airport Transfer specific options
  const [airportDirection, setAirportDirection] = useState<'PICKUP' | 'DROP'>('PICKUP')
  const [airportTerminal, setAirportTerminal] = useState<'T1' | 'T2' | null>(null)

  // Map Picker Modal state
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [mapTargetField, setMapTargetField] = useState<'pickup' | 'drop'>('drop')

  // Step 2: Passenger, Vehicle, Route & Fare
  const [passengerName, setPassengerName] = useState('')
  const [passengerPhone, setPassengerPhone] = useState('')
  const [passengerEmail, setPassengerEmail] = useState('')
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory>('Sedan')
  const [vehicleType, setVehicleType] = useState<string>('Sedan')
  const [packageType, setPackageType] = useState<PackageType>('4 hrs')
  const [tripType, setTripType] = useState<TripType>('One Way')
  const [pickup, setPickup] = useState('')
  const [drop, setDrop] = useState('')
  const [createdDate, setCreatedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [fromDate, setFromDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [fromTime, setFromTime] = useState('10:00')
  const [toDate, setToDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [toTime, setToTime] = useState('18:00')
  const [tripAmount, setTripAmount] = useState<string>('1200')
  const [estimatedKm, setEstimatedKm] = useState<number | null>(null)
  const [notes, setNotes] = useState('')

  const handleLocationInput = (val: string, field: 'pickup' | 'drop') => {
    if (field === 'pickup') {
      setPickup(val)
    } else {
      setDrop(val)
    }
    if (serviceType === 'RAC') {
      const km = estimateDistanceFromName(val)
      if (km !== null) {
        setEstimatedKm(km)
        setTripAmount(String(calculateAirportFare(km)))
      } else if (!val.trim()) {
        setEstimatedKm(null)
        setTripAmount('1200')
      }
    }
  }

  // Reset state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setServiceType(initialServiceType || null)
      setAirportTerminal(null)
      if (initialServiceType === 'RAC' && airportTerminal) {
        setPickup(BLR_TERMINALS[airportTerminal])
      }
    }
  }, [isOpen, initialServiceType])

  // Synchronize Airport Transfer Static/Dynamic Locations
  useEffect(() => {
    if (serviceType === 'RAC' && airportTerminal) {
      const terminalLocation = BLR_TERMINALS[airportTerminal]
      if (airportDirection === 'PICKUP') {
        setPickup(terminalLocation)
        if (drop.includes('Kempegowda')) setDrop('')
      } else {
        setDrop(terminalLocation)
        if (pickup.includes('Kempegowda')) setPickup('')
      }
    }
  }, [serviceType, airportDirection, airportTerminal])

  // Data fetching
  const { data: wallet } = useQuery<Wallet>({
    queryKey: ['wallet'],
    queryFn: async () => {
      const res = await vendorApi.getWallet()
      const data = res.data?.data || res.data || {}
      return {
        ...data,
        balance: parseFloat(data.balance ?? 0),
      }
    },
  })

  const fareNum = parseFloat(tripAmount) || 0
  const walletBalance = wallet?.balance ?? 0
  // Strict Prepaid Wallet: Wallet balance must be greater than or equal to total trip fare
  const platformFee = 5
  const convenienceFee = Math.round(fareNum * 0.06)
  const totalTripFare = fareNum + platformFee + convenienceFee
  const isBalanceSufficient = totalTripFare <= 0 || walletBalance >= totalTripFare

  const createTripMutation = useMutation({
    mutationFn: async () => {
      const finalDrop =
        (serviceType === 'PACKAGE' || serviceType === 'OUTSTATION') && !drop.trim()
          ? 'As Directed'
          : drop

      const vehicleDesc = `${vehicleCategory} (${vehicleType})`
      const scheduleNotes =
        serviceType === 'RAC'
          ? `[Created: ${createdDate}] [Booking: ${fromDate} ${fromTime}] [Vehicle: ${vehicleDesc}]${passengerEmail ? ` [Email: ${passengerEmail}]` : ''} ${notes}`.trim()
          : serviceType === 'PACKAGE'
            ? `[Date: ${fromDate} ${fromTime}] [Package: ${packageType}] [Vehicle: ${vehicleDesc}]${passengerEmail ? ` [Email: ${passengerEmail}]` : ''} ${notes}`.trim()
            : `[Trip Type: ${tripType}] [From: ${fromDate} ${fromTime} | To: ${toDate} ${toTime}] [Vehicle: ${vehicleDesc}]${passengerEmail ? ` [Email: ${passengerEmail}]` : ''} ${notes}`.trim()

      const payload = {
        serviceType,
        passengerName,
        passengerPhone,
        pickup,
        drop: finalDrop,
        scheduledDate: fromDate,
        scheduledTime: fromTime,
        tripAmount: totalTripFare,
        notes: `${scheduleNotes} [Agreed Base Fare: ₹${fareNum}] [Platform Fee: +₹${platformFee}] [Convenience Fee (6%): +₹${convenienceFee}] [Total Fare: ₹${totalTripFare}]`.trim(),
      }
      return (await vendorApi.createTrip(payload)).data
    },
    onSuccess: () => {
      toast.success('Trip created and confirmed successfully!')
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] })
      resetForm()
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to create trip')
    },
  })

  const resetForm = () => {
    setStep(1)
    setServiceType(initialServiceType || null)
    setAirportDirection('PICKUP')
    setAirportTerminal(null)
    setPassengerName('')
    setPassengerPhone('')
    setPassengerEmail('')
    setVehicleCategory('Sedan')
    setVehicleType('Sedan')
    setPackageType('4 hrs')
    setTripType('One Way')
    setPickup('')
    setDrop('')
    setCreatedDate(new Date().toISOString().split('T')[0])
    setFromDate(new Date().toISOString().split('T')[0])
    setFromTime('10:00')
    setToDate(new Date().toISOString().split('T')[0])
    setToTime('18:00')
    setTripAmount('1200')
    setEstimatedKm(null)
    setNotes('')
  }

  const validateStep2 = () => {
    if (!passengerName.trim()) {
      toast.error('Please enter passenger name')
      return false
    }
    if (!passengerPhone.trim()) {
      toast.error('Please enter passenger phone number')
      return false
    }
    if (!passengerEmail.trim()) {
      toast.error('Please enter passenger email address')
      return false
    }
    if (!pickup.trim()) {
      toast.error('Please enter pickup location')
      return false
    }
    if (serviceType !== 'PACKAGE' && serviceType !== 'OUTSTATION' && !drop.trim()) {
      toast.error('Please enter drop location')
      return false
    }
    if (fareNum <= 0) {
      toast.error('Trip amount must be greater than ₹0')
      return false
    }
    if (walletBalance < totalTripFare) {
      toast.error(`Insufficient wallet balance (${formatCurrency(walletBalance)}). You need at least ${formatCurrency(totalTripFare)} to book this trip. Please add funds.`)
      return false
    }
    return true
  }

  const handleNext = () => {
    if (step === 1) {
      if (!serviceType) {
        toast.error('Please select a service type to continue')
        return
      }
      if (serviceType === 'RAC' && !airportTerminal) {
        toast.error('Please select Kempegowda Airport Terminal 1 or Terminal 2 to continue')
        return
      }
    }
    if (step === 2 && !validateStep2()) return
    setStep((prev) => Math.min(prev + 1, 3) as 1 | 2 | 3)
  }

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1) as 1 | 2 | 3)
  }

  const getShareText = () => {
    const serviceName =
      serviceType === 'RAC'
        ? `Airport Transfer (${airportDirection === 'PICKUP' ? 'Pickup' : 'Drop'} - Terminal ${airportTerminal})`
        : serviceType === 'OUTSTATION'
          ? `Outstation (${tripType})`
          : serviceType

    return (
      `*Glide Trip Booking Confirmation*\n` +
      `--------------------------------\n` +
      `*Service:* ${serviceName}\n` +
      (serviceType === 'RAC' ? `*Created Date:* ${createdDate}\n` : '') +
      `*Vehicle Category:* ${vehicleCategory}\n` +
      `*Vehicle Type:* ${vehicleType}\n` +
      `*Passenger:* ${passengerName} (${passengerPhone})${passengerEmail ? `\n*Email:* ${passengerEmail}` : ''}\n` +
      `*Pickup:* ${pickup}\n` +
      `*Drop:* ${drop || ((serviceType === 'PACKAGE' || serviceType === 'OUTSTATION') ? 'As Directed' : '')}\n` +
      (serviceType === 'RAC'
        ? `*Booking Date & Time:* ${fromDate} at ${fromTime}\n`
        : serviceType === 'PACKAGE'
          ? `*Date & Time:* ${fromDate} at ${fromTime}\n*Package Type:* ${packageType}\n`
          : `*Trip Type:* ${tripType}\n*From:* ${fromDate} at ${fromTime}\n*To:* ${toDate} at ${toTime}\n`) +
      (fareNum > 0
        ? `*Agreed Base Fare:* ₹${fareNum.toLocaleString('en-IN')}\n` +
          `*Platform Fee:* + ₹${platformFee}\n` +
          `*Convenience Fee (6%):* + ₹${convenienceFee.toLocaleString('en-IN')}\n` +
          `*Total Trip Fare:* ₹${totalTripFare.toLocaleString('en-IN')}\n`
        : '') +
      (notes ? `*Notes:* ${notes}\n` : '') +
      `--------------------------------\n` +
      `Booked via Atharva Travels / Glide`
    )
  }

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getShareText())
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
  }

  const handleShareGmail = () => {
    const subject = encodeURIComponent(`Trip Booking Confirmation - ${passengerName}`)
    const body = encodeURIComponent(getShareText())
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, '_blank')
  }

  const handleDownloadSummary = () => {
    const text = getShareText().replace(/\*/g, '')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Trip-Summary-${passengerName.replace(/\s+/g, '_') || 'booking'}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success('Trip summary downloaded!')
  }

  const getStrictMobileNumber = (phoneStr: string): string | null => {
    const digits = phoneStr.replace(/\D/g, '')
    if (digits.length === 10) return digits
    if (digits.length > 10 && digits.startsWith('91')) return digits.slice(2, 12)
    if (digits.length > 10 && digits.startsWith('0')) return digits.slice(1, 11)
    return null
  }

  const handleWhatsAppLocationRequest = () => {
    const validDigits = getStrictMobileNumber(passengerPhone)
    if (!validDigits) {
      toast.error('Please enter a valid 10-digit mobile number for the passenger first.')
      return
    }

    const name = passengerName.trim() || 'Passenger'
    const serviceTitle =
      serviceType === 'RAC'
        ? `Airport Transfer (${airportDirection === 'PICKUP' ? 'Pickup' : 'Drop'})`
        : serviceType === 'OUTSTATION'
          ? `Outstation (${tripType})`
          : 'Hourly Rental Package'

    const shareLink = `${window.location.origin}/share-location?name=${encodeURIComponent(name)}&tripDate=${encodeURIComponent(fromDate)}&pickup=${encodeURIComponent(fromTime)}&type=${encodeURIComponent(serviceTitle)}`

    const msg = encodeURIComponent(
      `Hi ${name}, please share your live pickup location with Atharva Travels for your upcoming ${serviceTitle} booking on ${fromDate} at ${fromTime}.\n\nReply with your Google Maps location or tap here to auto-detect and share in 1-click:\n${shareLink}`
    )
    window.open(`https://wa.me/91${validDigits}?text=${msg}`, '_blank')
    toast.success(`WhatsApp location request opened for +91 ${validDigits}`)
  }

  const handleSMSLocationRequest = () => {
    const validDigits = getStrictMobileNumber(passengerPhone)
    if (!validDigits) {
      toast.error('Please enter a valid 10-digit mobile number for the passenger first.')
      return
    }

    const name = passengerName.trim() || 'Passenger'
    const serviceTitle =
      serviceType === 'RAC'
        ? 'Airport Transfer'
        : serviceType === 'OUTSTATION'
          ? 'Outstation'
          : 'Package'

    const shareLink = `${window.location.origin}/share-location?name=${encodeURIComponent(name)}&tripDate=${encodeURIComponent(fromDate)}&pickup=${encodeURIComponent(fromTime)}`

    const msg = `Hi ${name}, please share your pickup location with Atharva Travels for your upcoming ${serviceTitle} booking on ${fromDate} at ${fromTime}.\n\nTap here to share in 1-click: ${shareLink}`

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const smsUrl = isIOS
      ? `sms:+91${validDigits}&body=${encodeURIComponent(msg)}`
      : `sms:+91${validDigits}?body=${encodeURIComponent(msg)}`

    window.open(smsUrl, '_blank')
    toast.success(`SMS location request opened for +91 ${validDigits}`)
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Rent A Cab"
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="btn-secondary text-sm flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  onClose()
                }}
                className="text-sm text-slate-500 hover:text-slate-700 font-medium"
              >
                Cancel
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  disabled={
                    step === 1 &&
                    (!serviceType || (serviceType === 'RAC' && !airportTerminal))
                  }
                  onClick={handleNext}
                  className="btn-accent text-sm flex items-center gap-1.5 font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>
                    {step === 1
                      ? !serviceType
                        ? 'Select a Service to Continue'
                        : serviceType === 'RAC'
                          ? !airportTerminal
                            ? 'Select Terminal 1 or 2 to Continue'
                            : 'Continue with Airport Transfer'
                          : `Continue with ${serviceType === 'OUTSTATION' ? 'Outstation' : 'Package'}`
                      : 'Continue'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={createTripMutation.isPending || !isBalanceSufficient}
                  onClick={() => {
                    if (!isBalanceSufficient) {
                      toast.error('Insufficient wallet balance. Please add funds to book this trip.')
                      return
                    }
                    createTripMutation.mutate()
                  }}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-sm flex items-center gap-1.5 font-semibold py-2 px-4 rounded-xl shadow-sm border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createTripMutation.isPending ? (
                    <span>Creating Trip...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm & Book Trip</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Step Progress Bar - 3 Steps */}
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-sky-100 -translate-y-1/2 z-0" />
            {[
              { num: 1, label: 'Service' },
              { num: 2, label: 'Passenger & Route' },
              { num: 3, label: 'Review & Confirm' },
            ].map((s) => {
              const isDone = step > s.num
              const isCurrent = step === s.num
              return (
                <div key={s.num} className="flex flex-col items-center relative z-10">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${isDone
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                        ? 'bg-sky-900 text-white ring-4 ring-sky-100'
                        : 'bg-white border-2 border-sky-200 text-slate-400'
                      }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span
                    className={`text-[11px] mt-1 hidden sm:block ${isCurrent ? 'font-semibold text-sky-900' : 'text-slate-400'
                      }`}
                  >
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Step 1: Service Selection */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Select Rent A Cab Service
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose between Airport Transfer, Outstation, or Package rental
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SERVICES.map((s) => (
                  <ServiceCard
                    key={s}
                    service={s}
                    selected={serviceType === s}
                    onClick={() => {
                      setServiceType(s)
                      if (s === 'RAC') {
                        setAirportTerminal(null)
                        setTripAmount('0')
                      }
                    }}
                  />
                ))}
              </div>

              {/* Airport Transfer Specific Configuration (Appears ONLY after clicking Airport Transfer) */}
              {serviceType === 'RAC' && (
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/90 space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
                  <div className="flex items-center justify-between pb-2 border-b border-sky-200/60">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                        <Plane className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-sky-950">Kempegowda International Airport (BLR)</h4>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-200 text-sky-800">
                      Airport Transfer
                    </span>
                  </div>

                  {/* Sub-Option 1: Direction (Pickup vs Drop) */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-2">
                      1. Select Transfer Type *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAirportDirection('PICKUP')}
                        className={`p-3.5 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${airportDirection === 'PICKUP'
                          ? 'border-sky-600 bg-white shadow-md ring-2 ring-sky-600/20'
                          : 'border-slate-200/80 bg-white/70 hover:bg-white text-slate-600'
                          }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700 flex-shrink-0">
                          <PlaneLanding className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-xs sm:text-sm text-slate-900">Airport Pickup</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">BLR Airport → City Destination</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAirportDirection('DROP')}
                        className={`p-3.5 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${airportDirection === 'DROP'
                          ? 'border-sky-600 bg-white shadow-md ring-2 ring-sky-600/20'
                          : 'border-slate-200/80 bg-white/70 hover:bg-white text-slate-600'
                          }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700 flex-shrink-0">
                          <PlaneTakeoff className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-xs sm:text-sm text-slate-900">Airport Drop</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">City Pickup → BLR Airport</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Sub-Option 2: Terminal 1 vs Terminal 2 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-700">
                        2. Select BLR Airport Terminal *
                      </label>
                      {!airportTerminal ? (
                        <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full animate-pulse">
                          Required: Select Terminal
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {airportTerminal === 'T1' ? 'Terminal 1 Selected' : 'Terminal 2 Selected'}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAirportTerminal('T1')}
                        className={`p-3 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${airportTerminal === 'T1'
                          ? 'border-sky-600 bg-white shadow-md ring-2 ring-sky-600/20'
                          : 'border-slate-200/80 bg-white/70 hover:bg-white hover:border-slate-300 text-slate-600'
                          }`}
                      >
                        <div className={`w-8 h-8 rounded-lg font-extrabold text-xs flex items-center justify-center flex-shrink-0 ${
                          airportTerminal === 'T1' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          T1
                        </div>
                        <div>
                          <p className="font-bold text-xs sm:text-sm text-slate-900">Terminal 1 (T1)</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Domestic & Select Flights</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAirportTerminal('T2')}
                        className={`p-3 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${airportTerminal === 'T2'
                          ? 'border-sky-600 bg-white shadow-md ring-2 ring-sky-600/20'
                          : 'border-slate-200/80 bg-white/70 hover:bg-white hover:border-slate-300 text-slate-600'
                          }`}
                      >
                        <div className={`w-8 h-8 rounded-lg font-extrabold text-xs flex items-center justify-center flex-shrink-0 ${
                          airportTerminal === 'T2' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          T2
                        </div>
                        <div>
                          <p className="font-bold text-xs sm:text-sm text-slate-900">Terminal 2 (T2)</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Garden Terminal - Intl & Domestic</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Passenger, Vehicle & Route & Fare */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Passenger Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Passenger Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={passengerPhone}
                    onChange={(e) => setPassengerPhone(e.target.value)}
                    className="input"
                    required
                  />
                  {/* WhatsApp & SMS Location Request Buttons */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={handleWhatsAppLocationRequest}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title={
                        passengerPhone.trim()
                          ? `Send WhatsApp location request to ${passengerPhone}`
                          : 'Enter passenger mobile number above to send WhatsApp request'
                      }
                    >
                      <MessageCircle className="w-3 h-3 text-emerald-600" />
                      <span>WhatsApp Request</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSMSLocationRequest}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title={
                        passengerPhone.trim()
                          ? `Send SMS location request to ${passengerPhone}`
                          : 'Enter passenger mobile number above to send SMS request'
                      }
                    >
                      <Mail className="w-3 h-3 text-blue-600" />
                      <span>SMS Request</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Passenger Email ID Input Box */}
              <div>
                <label className="label">Passenger Email ID *</label>
                <input
                  type="email"
                  placeholder="e.g. passenger@company.com"
                  value={passengerEmail}
                  onChange={(e) => setPassengerEmail(e.target.value)}
                  className="input"
                  required
                />
              </div>

              {/* Airport Transfer Mode Banner with Terminal Switcher */}
              {serviceType === 'RAC' && (
                <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                      <Plane className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-sky-950">
                        {airportDirection === 'PICKUP' ? 'BLR Airport Pickup' : 'BLR Airport Drop'}
                      </p>
                      <p className="text-[11px] text-sky-800">
                        Airport Location: <span className="font-semibold">{airportTerminal ? BLR_TERMINALS[airportTerminal] : 'Terminal Not Selected'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setAirportTerminal('T1')}
                      className={`px-2.5 py-1 text-[11px] rounded-lg font-bold transition-all ${airportTerminal === 'T1'
                        ? 'bg-sky-700 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                    >
                      Terminal 1
                    </button>
                    <button
                      type="button"
                      onClick={() => setAirportTerminal('T2')}
                      className={`px-2.5 py-1 text-[11px] rounded-lg font-bold transition-all ${airportTerminal === 'T2'
                        ? 'bg-sky-700 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                    >
                      Terminal 2
                    </button>
                  </div>
                </div>
              )}

              {/* Pickup & Drop Inputs */}
              {serviceType === 'RAC' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Airport Pickup: Pickup is Fixed Airport, Drop is Dynamic */}
                  {airportDirection === 'PICKUP' ? (
                    <>
                      <div>
                        <label className="label">Pickup Location</label>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs font-medium text-slate-800 flex items-start gap-2 shadow-inner">
                          <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="leading-tight">{pickup}</span>
                        </div>
                      </div>

                      <div>
                        <label className="label">Drop Location *</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Enter destination address in Bengaluru"
                            value={drop}
                            onChange={(e) => handleLocationInput(e.target.value, 'drop')}
                            className="input text-xs sm:text-sm pr-9"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setMapTargetField('drop')
                              setIsMapModalOpen(true)
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-sky-600 hover:text-sky-800 hover:bg-sky-50 transition-colors"
                            title="Select location on Map"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Airport Drop: Pickup is Dynamic, Drop is Fixed Airport */
                    <>
                      <div>
                        <label className="label">Pickup Location *</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Enter pickup address in Bengaluru"
                            value={pickup}
                            onChange={(e) => handleLocationInput(e.target.value, 'pickup')}
                            className="input text-xs sm:text-sm pr-9"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setMapTargetField('pickup')
                              setIsMapModalOpen(true)
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-sky-600 hover:text-sky-800 hover:bg-sky-50 transition-colors"
                            title="Select location on Map"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="label">Drop Location</label>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs font-medium text-slate-800 flex items-start gap-2 shadow-inner">
                          <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="leading-tight">{drop}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Standard Non-Airport Route Inputs */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Pickup Location *</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter pickup address"
                        value={pickup}
                        onChange={(e) => setPickup(e.target.value)}
                        className="input text-xs sm:text-sm pr-9"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setMapTargetField('pickup')
                          setIsMapModalOpen(true)
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-sky-600 hover:text-sky-800 hover:bg-sky-50 transition-colors"
                        title="Select location on Map"
                      >
                        <MapPin className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="label">
                      {serviceType === 'PACKAGE' || serviceType === 'OUTSTATION'
                        ? 'Drop Location (Optional)'
                        : 'Drop Location *'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={
                          serviceType === 'PACKAGE' || serviceType === 'OUTSTATION'
                            ? 'Enter destination address (optional - as directed)'
                            : 'Enter destination address'
                        }
                        value={drop}
                        onChange={(e) => setDrop(e.target.value)}
                        className="input text-xs sm:text-sm pr-9"
                        required={serviceType !== 'PACKAGE' && serviceType !== 'OUTSTATION'}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setMapTargetField('drop')
                          setIsMapModalOpen(true)
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-sky-600 hover:text-sky-800 hover:bg-sky-50 transition-colors"
                        title="Select location on Map"
                      >
                        <MapPin className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Vehicle Category & Dependent Vehicle Type Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Vehicle Category *</label>
                  <div className="relative">
                    <select
                      value={vehicleCategory}
                      onChange={(e) => {
                        const newCat = e.target.value as VehicleCategory
                        setVehicleCategory(newCat)
                        setVehicleType(VEHICLE_CATEGORY_TYPES[newCat][0])
                      }}
                      className="input appearance-none pr-10 cursor-pointer font-semibold text-slate-800 bg-white"
                      required
                    >
                      {VEHICLE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="label">Vehicle Type *</label>
                  <div className="relative">
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="input appearance-none pr-10 cursor-pointer font-semibold text-slate-800 bg-white"
                      required
                    >
                      {VEHICLE_CATEGORY_TYPES[vehicleCategory].map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* For Airport Transfer: Created Date (calendar format), Booking Date & Time (replacing From Date & Time), and Remove To Date & Time */}
              {serviceType === 'RAC' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Created Date *</label>
                    <input
                      type="date"
                      value={createdDate}
                      onChange={(e) => setCreatedDate(e.target.value)}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Booking Date & Time *</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="input flex-1 min-w-0"
                        required
                      />
                      <input
                        type="time"
                        value={fromTime}
                        onChange={(e) => setFromTime(e.target.value)}
                        className="input w-28 sm:w-32 flex-shrink-0"
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : serviceType === 'PACKAGE' ? (
                /* For Package: Date & Time (replacing From Date & Time), and Package Type (replacing To Date & Time) */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Date & Time *</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="input flex-1 min-w-0"
                        required
                      />
                      <input
                        type="time"
                        value={fromTime}
                        onChange={(e) => setFromTime(e.target.value)}
                        className="input w-28 sm:w-32 flex-shrink-0"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Package Type *</label>
                    <div className="relative">
                      <select
                        value={packageType}
                        onChange={(e) => setPackageType(e.target.value as PackageType)}
                        className="input appearance-none pr-10 cursor-pointer font-semibold text-slate-800 bg-white"
                        required
                      >
                        {PACKAGE_TYPES.map((pkg) => (
                          <option key={pkg} value={pkg}>
                            {pkg}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              ) : (
                /* Outstation: Trip Type dropdown (One Way / Round Trip), From Date & Time and To Date & Time */
                <div className="space-y-4">
                  <div>
                    <label className="label">Trip Type *</label>
                    <div className="relative">
                      <select
                        value={tripType}
                        onChange={(e) => setTripType(e.target.value as TripType)}
                        className="input appearance-none pr-10 cursor-pointer font-semibold text-slate-800 bg-white"
                        required
                      >
                        {TRIP_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">From Date & Time *</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className="input flex-1 min-w-0"
                          required
                        />
                        <input
                          type="time"
                          value={fromTime}
                          onChange={(e) => setFromTime(e.target.value)}
                          className="input w-28 sm:w-32 flex-shrink-0"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label">To Date & Time *</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className="input flex-1 min-w-0"
                          required
                        />
                        <input
                          type="time"
                          value={toTime}
                          onChange={(e) => setToTime(e.target.value)}
                          className="input w-28 sm:w-32 flex-shrink-0"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Agreed Fare Section: Rendered across all trip types (RAC, OUTSTATION, PACKAGE) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Agreed Trip Amount (₹) *</label>
                  {serviceType === 'RAC' && estimatedKm !== null && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        estimatedKm <= 30
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      ~{estimatedKm} km from BLR Airport
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min={serviceType === 'RAC' ? 1200 : 1}
                  step="10"
                  value={tripAmount}
                  onChange={(e) => setTripAmount(e.target.value)}
                  onBlur={() => {
                    if (serviceType === 'RAC' && (parseFloat(tripAmount) || 0) < 1200) {
                      setTripAmount('1200')
                      toast.error('Airport Transfer fare cannot be less than ₹1,200 (fixed minimum)')
                    }
                  }}
                  className="input text-lg font-bold"
                  required
                />
                {serviceType === 'RAC' ? (
                  <div className="text-[11px] mt-1 space-y-0.5">
                    <p className="text-slate-500">
                      ₹1,200 fixed up to 30 km radius from BLR Airport; beyond 30 km charged at ₹28/km. Minimum fare is ₹1,200.
                    </p>
                    {estimatedKm !== null && (
                      <p className={`font-semibold ${estimatedKm <= 30 ? 'text-emerald-700' : 'text-amber-800'}`}>
                        {estimatedKm <= 30
                          ? '✓ Within 30 km airport radius: Standard ₹1,200 fixed fare applied.'
                          : `✓ Exceeds 30 km (~${estimatedKm} km): ₹1,200 base (30 km) + ${estimatedKm - 30} km extra @ ₹28/km = ₹${fareNum}.`}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Agreed trip fare for direct corporate billing.
                  </p>
                )}
              </div>

              {/* Wallet Balance Status Banner */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isBalanceSufficient
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <div>
                  <p className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isBalanceSufficient ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'
                      }`}
                    />
                    {isBalanceSufficient
                      ? `Available Wallet Balance: ${formatCurrency(walletBalance)}`
                      : 'Insufficient Wallet Balance'}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${isBalanceSufficient ? 'text-emerald-700' : 'text-red-700'}`}>
                    {isBalanceSufficient
                      ? `${formatCurrency(totalTripFare)} will be debited upon booking confirmation.`
                      : `Your wallet balance is ${formatCurrency(walletBalance)}. You need at least ${formatCurrency(totalTripFare)} to book this trip.`}
                  </p>
                  {!isBalanceSufficient && (
                    <p className="text-[11px] text-red-800 font-semibold mt-1">
                      ⚠️ Please recharge with at least {formatCurrency(totalTripFare - walletBalance)} to continue.
                    </p>
                  )}
                </div>
                {onOpenRechargeModal && (
                  <button
                    type="button"
                    onClick={onOpenRechargeModal}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0 ml-2 shadow-xs transition-all ${
                      isBalanceSufficient
                        ? 'bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    + Add Funds
                  </button>
                )}
              </div>

              <div>
                <label className="label">Passenger Notes / Special Instructions</label>
                <textarea
                  placeholder="Flight number, flight arrival/departure time, luggage count, notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input h-16 resize-none text-xs"
                />
              </div>
            </div>
          )}

          {/* Step 3: Review & Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="card p-4 space-y-2.5 text-xs bg-slate-50">
                <div className="flex justify-between border-b border-sky-100 pb-2">
                  <span className="text-slate-500">Service Category:</span>
                  <span className="font-bold text-sky-950">
                    {serviceType === 'RAC'
                      ? `Airport Transfer (${airportDirection === 'PICKUP' ? 'Pickup' : 'Drop'} - Terminal ${airportTerminal})`
                      : serviceType}
                  </span>
                </div>
                <div className="flex justify-between border-b border-sky-100 pb-2">
                  <span className="text-slate-500">Vehicle Category:</span>
                  <span className="font-semibold text-slate-800">
                    {vehicleCategory}
                  </span>
                </div>
                <div className="flex justify-between border-b border-sky-100 pb-2">
                  <span className="text-slate-500">Vehicle Type:</span>
                  <span className="font-semibold text-slate-800">
                    {vehicleType}
                  </span>
                </div>
                <div className="flex justify-between border-b border-sky-100 pb-2">
                  <span className="text-slate-500">Passenger:</span>
                  <span className="font-semibold text-slate-800">
                    {passengerName} ({passengerPhone})
                  </span>
                </div>
                {passengerEmail && (
                  <div className="flex justify-between border-b border-sky-100 pb-2">
                    <span className="text-slate-500">Email ID:</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {passengerEmail}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-b border-sky-100 pb-2">
                  <span className="text-slate-500">Pickup:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[280px] truncate">
                    {pickup}
                  </span>
                </div>
                <div className="flex justify-between border-b border-sky-100 pb-2">
                  <span className="text-slate-500">Drop:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[280px] truncate">
                    {drop || (serviceType === 'PACKAGE' || serviceType === 'OUTSTATION' ? 'As Directed' : '-')}
                  </span>
                </div>
                {serviceType === 'RAC' ? (
                  <>
                    <div className="flex justify-between border-b border-sky-100 pb-2">
                      <span className="text-slate-500">Created Date:</span>
                      <span className="font-semibold text-slate-800">
                        {createdDate}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-sky-100 pb-2">
                      <span className="text-slate-500">Booking Date & Time:</span>
                      <span className="font-semibold text-slate-800">
                        {fromDate} at {fromTime}
                      </span>
                    </div>
                  </>
                ) : serviceType === 'PACKAGE' ? (
                  <>
                    <div className="flex justify-between border-b border-sky-100 pb-2">
                      <span className="text-slate-500">Date & Time:</span>
                      <span className="font-semibold text-slate-800">
                        {fromDate} at {fromTime}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-sky-100 pb-2">
                      <span className="text-slate-500">Package Type:</span>
                      <span className="font-bold text-sky-900 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        {packageType}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between border-b border-sky-100 pb-2">
                      <span className="text-slate-500">Trip Type:</span>
                      <span className="font-bold text-sky-900 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        {tripType}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-sky-100 pb-2">
                      <span className="text-slate-500">From:</span>
                      <span className="font-semibold text-slate-800">
                        {fromDate} at {fromTime}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-sky-100 pb-2">
                      <span className="text-slate-500">To:</span>
                      <span className="font-semibold text-slate-800">
                        {toDate} at {toTime}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-b border-sky-100 pb-2">
                  <span className="text-slate-500">Agreed Fare:</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {formatCurrency(fareNum)}
                  </span>
                </div>
                {notes && (
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">Notes:</span>
                    <span className="font-medium text-slate-700 italic text-right max-w-[280px]">
                      {notes}
                    </span>
                  </div>
                )}
              </div>

              {/* Financial Breakdown Preview */}
              <div className="card p-3 border-dashed text-xs space-y-1.5 bg-white">
                <p className="font-semibold text-slate-700">Financial Breakdown Preview:</p>
                <div className="flex justify-between text-slate-600">
                  <span>Agreed Base Fare:</span>
                  <span className="font-medium">{formatCurrency(fareNum)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1">
                    Platform Fee:
                    <span className="text-[10px] text-slate-400 font-normal">(fixed)</span>
                  </span>
                  <span className="font-medium">+ {formatCurrency(platformFee)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1">
                    Convenience Fee (6%):
                    <span className="text-[10px] text-slate-400 font-normal">(6% of base)</span>
                  </span>
                  <span className="font-medium">+ {formatCurrency(convenienceFee)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700 pt-1.5 border-t border-slate-200 text-sm">
                  <span>Total Trip Fare:</span>
                  <span className="text-emerald-700 font-extrabold">{formatCurrency(totalTripFare)}</span>
                </div>
              </div>

              {/* Wallet Balance Status */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isBalanceSufficient
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <div>
                  <p className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isBalanceSufficient ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'
                      }`}
                    />
                    {isBalanceSufficient
                      ? `Wallet Balance: ${formatCurrency(walletBalance)}`
                      : 'Insufficient Wallet Balance'}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${isBalanceSufficient ? 'text-emerald-700' : 'text-red-700'}`}>
                    {isBalanceSufficient
                      ? `Available: ${formatCurrency(walletBalance)} · Total Fare: ${formatCurrency(totalTripFare)}`
                      : `Available: ${formatCurrency(walletBalance)} · Required: ${formatCurrency(totalTripFare)}. Please recharge ${formatCurrency(totalTripFare - walletBalance)} to dispatch.`}
                  </p>
                </div>
                {onOpenRechargeModal && (
                  <button
                    type="button"
                    onClick={onOpenRechargeModal}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0 ml-2 shadow-xs transition-all ${
                      isBalanceSufficient
                        ? 'bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    + Add Funds
                  </button>
                )}
              </div>

              {/* Action Toolbar: Download & Share */}
              <div className="flex items-center justify-between gap-2 pt-0.5 pb-0.5">
                <span className="text-[11px] font-semibold text-slate-500">Trip Summary Actions</span>
                <div className="flex items-center gap-2">
                  {/* Download Button */}
                  <button
                    type="button"
                    onClick={handleDownloadSummary}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
                    title="Download Trip Summary"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Download</span>
                  </button>

                  {/* Share Button with Hover Dropdown */}
                  <div className="relative group">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Share2 className="w-3.5 h-3.5 text-sky-700" />
                      <span>Share</span>
                      <ChevronDown className="w-3 h-3 text-sky-600 transition-transform group-hover:rotate-180" />
                    </button>

                    {/* Hover Dropdown Menu */}
                    <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 hidden group-hover:block hover:block transition-all animate-in fade-in zoom-in-95">
                      <button
                        type="button"
                        onClick={handleShareWhatsApp}
                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 transition-colors"
                      >
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-black">
                          W
                        </div>
                        <span>WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleShareGmail}
                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-800 flex items-center gap-2.5 transition-colors"
                      >
                        <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-black">
                          M
                        </div>
                        <span>Gmail / Mail</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Interactive Map Picker Modal */}
      <LocationMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        title={`Select ${mapTargetField === 'pickup' ? 'Pickup' : 'Drop'} Location in Bengaluru`}
        initialAddress={mapTargetField === 'pickup' ? pickup : drop}
        onSelectLocation={(address, lat, lng) => {
          if (mapTargetField === 'pickup') {
            setPickup(address)
          } else {
            setDrop(address)
          }
          if (serviceType === 'RAC' && lat && lng) {
            const km = calculateBLRDistanceKm(lat, lng)
            setEstimatedKm(km)
            const fare = calculateAirportFare(km)
            setTripAmount(String(fare))
          }
        }}
      />
    </>
  )
}
