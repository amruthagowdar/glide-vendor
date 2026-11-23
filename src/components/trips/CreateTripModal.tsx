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
  Navigation,
} from 'lucide-react'

interface CreateTripModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenRechargeModal: () => void
  initialServiceType?: ServiceType
}

const SERVICES: ServiceType[] = ['RAC', 'OUTSTATION', 'PACKAGE']

const BLR_TERMINALS = {
  T1: 'Kempegowda International Airport - Terminal 1 (T1), Devanahalli, Bengaluru, Karnataka 560300',
  T2: 'Kempegowda International Airport - Terminal 2 (T2), Devanahalli, Bengaluru, Karnataka 560300',
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

  // Step 2: Passenger, Route & Fare
  const [passengerName, setPassengerName] = useState('')
  const [passengerPhone, setPassengerPhone] = useState('')
  const [pickup, setPickup] = useState('')
  const [drop, setDrop] = useState('')
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [scheduledTime, setScheduledTime] = useState('10:00')
  const [tripAmount, setTripAmount] = useState<string>('1200')
  const [notes, setNotes] = useState('')

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

  // Platform commission calculations
  const platformRate = 0.1
  const commission = fareNum * platformRate
  const companyShare = fareNum - commission
  const driverPayable = fareNum * 0.75

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
        notes: notes || undefined,
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
    setPickup(BLR_TERMINALS.T1)
    setDrop('')
    setTripAmount('1200')
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
                      2. Select BLR Airport Terminal (Static Location) *
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

          {/* Step 2: Passenger & Route & Fare */}
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
                        Fixed Airport Location: <span className="font-semibold">Terminal {airportTerminal === 'T1' ? '1 (T1)' : '2 (T2)'}</span>
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
                  {/* Airport Pickup: Pickup is Fixed (Static), Drop is Dynamic */}
                  {airportDirection === 'PICKUP' ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="label">Pickup Location</label>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Static BLR Airport
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs font-medium text-slate-800 flex items-start gap-2 shadow-inner">
                          <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="leading-tight">{pickup}</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="label">Drop Location (Dynamic) *</label>
                          <button
                            type="button"
                            onClick={() => {
                              setMapTargetField('drop')
                              setIsMapModalOpen(true)
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Select on Map / GMap</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Enter destination address in Bengaluru"
                          value={drop}
                          onChange={(e) => setDrop(e.target.value)}
                          className="input text-xs sm:text-sm"
                          required
                        />
                      </div>
                    </>
                  ) : (
                    /* Airport Drop: Pickup is Dynamic, Drop is Fixed (Static) */
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="label">Pickup Location (Dynamic) *</label>
                          <button
                            type="button"
                            onClick={() => {
                              setMapTargetField('pickup')
                              setIsMapModalOpen(true)
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Select on Map / GMap</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Enter pickup address in Bengaluru"
                          value={pickup}
                          onChange={(e) => setPickup(e.target.value)}
                          className="input text-xs sm:text-sm"
                          required
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="label">Drop Location</label>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Static BLR Airport
                          </span>
                        </div>
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="label">Pickup Location *</label>
                      <button
                        type="button"
                        onClick={() => {
                          setMapTargetField('pickup')
                          setIsMapModalOpen(true)
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Select on Map / GMap</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Enter pickup address"
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      className="input text-xs sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="label">Drop Location *</label>
                      <button
                        type="button"
                        onClick={() => {
                          setMapTargetField('drop')
                          setIsMapModalOpen(true)
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Select on Map / GMap</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Enter destination address"
                      value={drop}
                      onChange={(e) => setDrop(e.target.value)}
                      className="input text-xs sm:text-sm"
                      required
                    />
                  </div>
                </div>
              )}

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
                <label className="label">Agreed Trip Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={tripAmount}
                  onChange={(e) => setTripAmount(e.target.value)}
                  className="input text-lg font-bold"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Full amount is debited from your vendor prepaid wallet upon booking confirmation.
                </p>
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

              {/* Financial Breakdown Preview */}
              <div className="card p-3 border-dashed text-xs space-y-1.5 bg-white">
                <p className="font-semibold text-slate-700">Financial Breakdown Preview:</p>
                <div className="flex justify-between text-slate-600">
                  <span>Trip Fare:</span>
                  <span className="font-medium">{formatCurrency(fareNum)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Platform Commission (10%):</span>
                  <span>- {formatCurrency(commission)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Estimated Driver Payout (75%):</span>
                  <span>{formatCurrency(driverPayable)}</span>
                </div>
                <div className="flex justify-between font-semibold text-sky-900 pt-1 border-t">
                  <span>Net Company Margin:</span>
                  <span>{formatCurrency(companyShare - driverPayable)}</span>
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
        onSelectLocation={(address) => {
          if (mapTargetField === 'pickup') {
            setPickup(address)
          } else {
            setDrop(address)
          }
        }}
      />
    </>
  )
}
