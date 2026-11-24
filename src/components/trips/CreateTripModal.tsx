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
} from 'lucide-react'

interface CreateTripModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenRechargeModal: () => void
  initialServiceType?: ServiceType
}

const SERVICES: ServiceType[] = ['RAC', 'OUTSTATION', 'PACKAGE']

const VEHICLE_TYPES = [
  'Mini 4+1 Seats',
  'Sedan 4+1',
  'Prime Sedan 4+1',
  'SUV 6+1',
  'Prime SUV 7+1',
] as const

type VehicleTypeOption = (typeof VEHICLE_TYPES)[number]

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
  initialServiceType = 'RAC',
}) => {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: Service
  const [serviceType, setServiceType] = useState<ServiceType>(initialServiceType)

  // Airport Transfer specific options
  const [airportDirection, setAirportDirection] = useState<'PICKUP' | 'DROP'>('PICKUP')
  const [airportTerminal, setAirportTerminal] = useState<'T1' | 'T2'>('T1')

  // Map Picker Modal state
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [mapTargetField, setMapTargetField] = useState<'pickup' | 'drop'>('drop')

  // Step 2: Passenger, Vehicle, Route & Fare
  const [passengerName, setPassengerName] = useState('')
  const [passengerPhone, setPassengerPhone] = useState('')
  const [vehicleType, setVehicleType] = useState<VehicleTypeOption>('Sedan 4+1')
  const [pickup, setPickup] = useState('')
  const [drop, setDrop] = useState('')
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [scheduledTime, setScheduledTime] = useState('10:00')
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

  // Synchronize Airport Transfer Static/Dynamic Locations
  useEffect(() => {
    if (serviceType === 'RAC') {
      if (airportDirection === 'PICKUP') {
        setPickup(BLR_TERMINALS[airportTerminal])
        if (drop.includes('Kempegowda')) setDrop('')
      } else {
        setDrop(BLR_TERMINALS[airportTerminal])
        if (pickup.includes('Kempegowda')) setPickup('')
      }
    }
  }, [serviceType, airportDirection, airportTerminal])

  // Data fetching
  const { data: wallet } = useQuery<Wallet>({
    queryKey: ['wallet'],
    queryFn: async () => (await vendorApi.getWallet()).data,
  })

  const fareNum = parseFloat(tripAmount) || 0
  const walletBalance = wallet?.balance ?? 0
  const isBalanceSufficient = walletBalance >= fareNum

  // Financial Breakdown calculations
  // Platform fee: ₹10 fixed on any trip
  // Convenience fee: 15% on trip fare
  // Driver payout: the rest (Trip Fare - Platform Fee - Convenience Fee)
  // No net company margin
  const platformFee = 10
  const convenienceFee = Math.round(fareNum * 0.15)
  const driverPayable = Math.max(0, fareNum - platformFee - convenienceFee)

  const createTripMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        serviceType,
        passengerName,
        passengerPhone,
        pickup,
        drop,
        scheduledDate,
        scheduledTime,
        tripAmount: fareNum,
        notes: `[Vehicle: ${vehicleType}] ${notes}`.trim(),
      }
      return (await vendorApi.createTrip(payload)).data
    },
    onSuccess: () => {
      toast.success('Trip created successfully! Wallet debited.')
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
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
    setServiceType('RAC')
    setAirportDirection('PICKUP')
    setAirportTerminal('T1')
    setPassengerName('')
    setPassengerPhone('')
    setVehicleType('Sedan 4+1')
    setPickup(BLR_TERMINALS.T1)
    setDrop('')
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
    if (!pickup.trim() || !drop.trim()) {
      toast.error('Please enter both pickup and drop locations')
      return false
    }
    if (serviceType === 'RAC' && fareNum < 1200) {
      toast.error('Airport Transfer fare cannot be less than ₹1,200 (fixed minimum)')
      return false
    }
    if (fareNum <= 0) {
      toast.error('Trip amount must be greater than ₹0')
      return false
    }
    return true
  }

  const handleNext = () => {
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
        : serviceType

    return (
      `*Glide Trip Booking Confirmation*\n` +
      `--------------------------------\n` +
      `*Service:* ${serviceName}\n` +
      `*Vehicle Type:* ${vehicleType}\n` +
      `*Passenger:* ${passengerName} (${passengerPhone})\n` +
      `*Pickup:* ${pickup}\n` +
      `*Drop:* ${drop}\n` +
      `*Schedule:* ${scheduledDate} at ${scheduledTime}\n` +
      `*Trip Fare:* ₹${fareNum.toLocaleString('en-IN')}\n` +
      `*Platform Fee:* ₹10\n` +
      `*Convenience Fee (15%):* ₹${convenienceFee.toLocaleString('en-IN')}\n` +
      `*Driver Payout:* ₹${driverPayable.toLocaleString('en-IN')}\n` +
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

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Rent A Cab"
        size="lg"
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
                  onClick={handleNext}
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!isBalanceSufficient || createTripMutation.isPending}
                  onClick={() => createTripMutation.mutate()}
                  className="btn-accent text-sm flex items-center gap-1.5 font-semibold"
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
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      isDone
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-sky-900 text-white ring-4 ring-sky-100'
                        : 'bg-white border-2 border-sky-200 text-slate-400'
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span
                    className={`text-[11px] mt-1 hidden sm:block ${
                      isCurrent ? 'font-semibold text-sky-900' : 'text-slate-400'
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
                    onClick={() => setServiceType(s)}
                  />
                ))}
              </div>

              {/* Airport Transfer Specific Configuration */}
              {serviceType === 'RAC' && (
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/90 space-y-4 animate-in fade-in duration-200">
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
                        className={`p-3.5 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${
                          airportDirection === 'PICKUP'
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
                        className={`p-3.5 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${
                          airportDirection === 'DROP'
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
                    <label className="text-xs font-bold text-slate-700 block mb-2">
                      2. Select BLR Airport Terminal *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAirportTerminal('T1')}
                        className={`p-3 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${
                          airportTerminal === 'T1'
                            ? 'border-sky-600 bg-white shadow-md ring-2 ring-sky-600/20'
                            : 'border-slate-200/80 bg-white/70 hover:bg-white text-slate-600'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center flex-shrink-0">
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
                        className={`p-3 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${
                          airportTerminal === 'T2'
                            ? 'border-sky-600 bg-white shadow-md ring-2 ring-sky-600/20'
                            : 'border-slate-200/80 bg-white/70 hover:bg-white text-slate-600'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center flex-shrink-0">
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
                </div>
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
                        Airport Location: <span className="font-semibold">{BLR_TERMINALS[airportTerminal]}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setAirportTerminal('T1')}
                      className={`px-2.5 py-1 text-[11px] rounded-lg font-bold transition-all ${
                        airportTerminal === 'T1'
                          ? 'bg-sky-700 text-white shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      Terminal 1
                    </button>
                    <button
                      type="button"
                      onClick={() => setAirportTerminal('T2')}
                      className={`px-2.5 py-1 text-[11px] rounded-lg font-bold transition-all ${
                        airportTerminal === 'T2'
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
                    <label className="label">Drop Location *</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter destination address"
                        value={drop}
                        onChange={(e) => setDrop(e.target.value)}
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
                </div>
              )}

              {/* Vehicle Type Selection */}
              <div>
                <label className="label">Vehicle Type *</label>
                <div className="relative">
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleTypeOption)}
                    className="input appearance-none pr-10 cursor-pointer font-semibold text-slate-800 bg-white"
                    required
                  >
                    {VEHICLE_TYPES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Vehicle Type Selection */}
              <div>
                <label className="label">Vehicle Type *</label>
                <div className="relative">
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleTypeOption)}
                    className="input appearance-none pr-10 cursor-pointer font-semibold text-slate-800 bg-white"
                    required
                  >
                    {VEHICLE_TYPES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Scheduled Date *</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Scheduled Time *</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="input"
                    required
                  />
                </div>
              </div>

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
                    Full amount is debited from your vendor prepaid wallet upon booking confirmation.
                  </p>
                )}
              </div>

              {/* Wallet Validation Banner */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isBalanceSufficient
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <div>
                  <p className="font-semibold text-xs sm:text-sm">
                    {isBalanceSufficient ? 'Wallet Balance Sufficient' : 'Insufficient Wallet Balance'}
                  </p>
                  <p className="text-[11px] mt-0.5">
                    Current Balance: {formatCurrency(walletBalance)} · Required: {formatCurrency(fareNum)}
                  </p>
                </div>
                {!isBalanceSufficient && (
                  <button
                    type="button"
                    onClick={onOpenRechargeModal}
                    className="btn-accent text-xs font-semibold px-3 py-1.5"
                  >
                    Recharge Wallet
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
                <div className="flex justify-between border-b border-sky-100 pb-2">
                  <span className="text-slate-500">Pickup:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[280px] truncate">
                    {pickup}
                  </span>
                </div>
                <div className="flex justify-between border-b border-sky-100 pb-2">
                  <span className="text-slate-500">Drop:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[280px] truncate">
                    {drop}
                  </span>
                </div>
                <div className="flex justify-between border-b border-sky-100 pb-2">
                  <span className="text-slate-500">Schedule:</span>
                  <span className="font-semibold text-slate-800">
                    {scheduledDate} at {scheduledTime}
                  </span>
                </div>
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

              {/* Financial Breakdown Preview */}
              <div className="card p-3 border-dashed text-xs space-y-1.5 bg-white">
                <p className="font-semibold text-slate-700">Financial Breakdown Preview:</p>
                <div className="flex justify-between text-slate-600">
                  <span>Trip Fare:</span>
                  <span className="font-medium">{formatCurrency(fareNum)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Platform Fee:</span>
                  <span>- {formatCurrency(platformFee)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Convenience Fee (15%):</span>
                  <span>- {formatCurrency(convenienceFee)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700 pt-1 border-t">
                  <span>Driver Payout (Rest):</span>
                  <span>{formatCurrency(driverPayable)}</span>
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
