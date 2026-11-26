import React, { useState, useEffect, useRef } from 'react'
import {
  Car,
  Users,
  MapPin,
  Calendar,
  Clock,
  Building2,
  Check,
  Search,
  MessageCircle,
  Mail,
  Compass,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
} from 'lucide-react'
import { LocationMapModal } from './LocationMapModal'
import { sortStopsFarthestFirst, type LiveShiftCab } from '../../lib/routing'
import { formatCurrency } from '../../lib/utils'
import toast from 'react-hot-toast'

export interface CorporateOffice {
  id: string
  name: string
  address: string
  lat: number
  lng: number
}

export const CORPORATE_OFFICES: CorporateOffice[] = [
  {
    id: 'off-1',
    name: 'Atharva Tech Hub (Electronic City)',
    address: 'Phase 1, Electronic City, Bengaluru, Karnataka 560100',
    lat: 12.8399,
    lng: 77.677,
  },
  {
    id: 'off-2',
    name: 'Bellandur EcoSpace Campus',
    address: 'Outer Ring Rd, Bellandur, Bengaluru, Karnataka 560103',
    lat: 12.926,
    lng: 77.6762,
  },
  {
    id: 'off-3',
    name: 'Whitefield ITPL Gateway',
    address: 'ITPB, Whitefield Main Rd, Bengaluru, Karnataka 560066',
    lat: 12.9863,
    lng: 77.7318,
  },
  {
    id: 'off-4',
    name: 'Manyata Tech Park (Hebbal)',
    address: 'Nagavara, Outer Ring Rd, Bengaluru, Karnataka 560045',
    lat: 13.0475,
    lng: 77.6202,
  },
]

export interface EmployeeSlot {
  name: string
  phone: string
  address: string
  lat: string
  lng: string
}

export interface CorporateEmployee {
  id: string
  name: string
  phone: string
  company: string
  address: string
  lat: number
  lng: number
  department?: string
}

interface CreateETSTripViewProps {
  onBack: () => void
  onTripCreated?: (newShift: LiveShiftCab) => void
}

export const CreateETSTripView: React.FC<CreateETSTripViewProps> = ({
  onBack,
  onTripCreated,
}) => {
  // Vehicle Selection: SEDAN (3 employees) or SUV (6 employees)
  const [vehicleChoice, setVehicleChoice] = useState<'SEDAN' | 'SUV'>('SEDAN')

  // Trip Date & Timing
  const [tripDate, setTripDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [shiftTiming, setShiftTiming] = useState('08:30 AM')
  const [tripType, setTripType] = useState<'Login' | 'Logout'>('Login')
  const [companyName, setCompanyName] = useState('Atharva Tech Hub')

  // Employee Slots: 3 for Sedan, 6 for SUV
  const [employees, setEmployees] = useState<EmployeeSlot[]>([
    { name: '', phone: '', address: '', lat: '', lng: '' },
    { name: '', phone: '', address: '', lat: '', lng: '' },
    { name: '', phone: '', address: '', lat: '', lng: '' },
  ])

  // Map Picker Modal state for pinpointing coordinates
  const [mapPickerSlotIndex, setMapPickerSlotIndex] = useState<number | null>(null)

  // Autocomplete search state per slot
  const [activeSearchSlot, setActiveSearchSlot] = useState<number | null>(null)
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({})

  // Saved corporate employee directory
  const [directory, setDirectory] = useState<CorporateEmployee[]>(() => {
    try {
      const saved = localStorage.getItem('ETS_SAVED_EMPLOYEES')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {}
    return [
      {
        id: 'emp-1',
        name: 'Ramesh Rao',
        phone: '+91 98450 12345',
        company: 'Atharva Tech Hub',
        address: 'Outer Ring Rd, Mahadevapura, Bengaluru',
        lat: 12.99,
        lng: 77.7,
        department: 'Operations',
      },
      {
        id: 'emp-2',
        name: 'Sneha Hegde',
        phone: '+91 98451 23456',
        company: 'Atharva Tech Hub',
        address: 'Bellandur / Sarjapur Rd, Bengaluru',
        lat: 12.925,
        lng: 77.675,
        department: 'Engineering',
      },
      {
        id: 'emp-3',
        name: 'Arjun Mehta',
        phone: '+91 98452 34567',
        company: 'Atharva Tech Hub',
        address: 'Kudlu Gate, Hosur Rd, Bengaluru',
        lat: 12.875,
        lng: 77.65,
        department: 'Finance',
      },
      {
        id: 'emp-4',
        name: 'Priya Sharma',
        phone: '+91 98453 45678',
        company: 'Atharva Tech Hub',
        address: 'HSR Layout Sector 1, Bengaluru',
        lat: 12.915,
        lng: 77.645,
        department: 'HR',
      },
      {
        id: 'emp-5',
        name: 'Vikram Singh',
        phone: '+91 98454 56789',
        company: 'Atharva Tech Hub',
        address: 'Koramangala 4th Block, Bengaluru',
        lat: 12.934,
        lng: 77.625,
        department: 'IT Support',
      },
      {
        id: 'emp-6',
        name: 'Ananya Deshmukh',
        phone: '+91 98455 67890',
        company: 'Atharva Tech Hub',
        address: 'Electronic City Phase 2, Bengaluru',
        lat: 12.845,
        lng: 77.685,
        department: 'QA',
      },
    ]
  })

  // Synchronize slot count when vehicle category changes (3 for Sedan, 6 for SUV)
  const handleSelectVehicle = (v: 'SEDAN' | 'SUV') => {
    setVehicleChoice(v)
    const targetCount = v === 'SEDAN' ? 3 : 6
    setEmployees((prev) => {
      if (prev.length === targetCount) return prev
      if (prev.length < targetCount) {
        const extra: EmployeeSlot[] = Array.from(
          { length: targetCount - prev.length },
          () => ({ name: '', phone: '', address: '', lat: '', lng: '' })
        )
        return [...prev, ...extra]
      }
      return prev.slice(0, targetCount)
    })
  }

  // Update specific employee field
  const updateEmployeeField = (
    index: number,
    field: keyof EmployeeSlot,
    value: string
  ) => {
    setEmployees((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  // Fill employee from directory selection
  const handleSelectFromDirectory = (index: number, emp: CorporateEmployee) => {
    setEmployees((prev) => {
      const copy = [...prev]
      copy[index] = {
        name: emp.name,
        phone: emp.phone,
        address: emp.address,
        lat: String(emp.lat),
        lng: String(emp.lng),
      }
      return copy
    })
    setSearchQueries((prev) => ({ ...prev, [index]: emp.name }))
    setActiveSearchSlot(null)
    toast.success(`Loaded details for ${emp.name}`)
  }

  // WhatsApp location request link
  const handleWhatsAppRequest = (slot: EmployeeSlot) => {
    const phone = slot.phone.replace(/\D/g, '')
    const name = slot.name.trim() || 'Employee'
    const msg = encodeURIComponent(
      `Hi ${name}, please share your live home pickup location with Atharva Travels for your upcoming ETS corporate shift on ${tripDate} at ${shiftTiming}. Reply with a Google Maps location link.`
    )
    const url = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`
    window.open(url, '_blank')
  }

  // SMS location request link
  const handleSMSRequest = (slot: EmployeeSlot) => {
    const phone = slot.phone.replace(/\D/g, '')
    const name = slot.name.trim() || 'Employee'
    const body = encodeURIComponent(
      `Hi ${name}, please share your home pickup location link for your ETS corporate shift on ${tripDate} at ${shiftTiming}.`
    )
    window.open(`sms:${phone}?body=${body}`, '_blank')
  }

  // Count filled employee slots
  const filledEmployees = employees.filter((e) => e.name.trim() && e.address.trim())
  const maxSlots = vehicleChoice === 'SEDAN' ? 3 : 6

  // Form submission: Validate, Calculate Optimal Route, and Dispatch Shift
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSaveAndCreateTrip = async () => {
    if (filledEmployees.length === 0) {
      toast.error('Please add at least 1 employee with a Name and Address')
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading('Calculating optimal route and creating trip...')

    try {
      const office =
        CORPORATE_OFFICES.find((o) => o.name.toLowerCase().includes(companyName.toLowerCase())) ||
        CORPORATE_OFFICES[0]

      const driverHomeCoords = { lat: 12.9166, lng: 77.6101 } // BTM Layout
      const hubCoords = { lat: office.lat, lng: office.lng }

      // Build employee stops
      const initialStops = filledEmployees.map((emp, i) => {
        let lat = parseFloat(emp.lat)
        let lng = parseFloat(emp.lng)
        if (isNaN(lat) || isNaN(lng) || lat === 0) {
          // Fallback coordinate around Bangalore Tech corridor
          lat = 12.92 + i * 0.02
          lng = 77.66 + i * 0.015
        }
        return {
          name: emp.name.trim(),
          address: emp.address.trim(),
          lat,
          lng,
          status: 'PENDING' as const,
        }
      })

      // Sort stops farthest first from hub
      const sortedStops = sortStopsFarthestFirst(initialStops, hubCoords)

      const shiftCode = `ETS-${Math.floor(100 + Math.random() * 900)}`
      const newShift: LiveShiftCab = {
        id: `ets-shift-${Date.now()}`,
        shiftCode,
        vehicleType: vehicleChoice === 'SEDAN' ? 'Sedan 4+1' : 'SUV 6+1',
        seatsUsed: filledEmployees.length,
        capacity: maxSlots,
        shiftType: tripType === 'Login' ? 'LOGIN' : 'LOGOUT',
        hubName: companyName,
        hubAddress: office.address,
        driverName: 'Assigned Driver',
        driverPhone: '+91 98450 12345',
        vehicleNo: vehicleChoice === 'SEDAN' ? 'KA-01-MJ-5821' : 'KA-05-NB-9912',
        status: 'BOARDING',
        currentCoords: driverHomeCoords,
        driverHomeCoords,
        hubCoords,
        currentStepIndex: 0,
        stops: sortedStops,
      }

      // Persist to localStorage
      try {
        const saved = localStorage.getItem('ETS_DISPATCHED_SHIFTS')
        const currentList: LiveShiftCab[] = saved ? JSON.parse(saved) : []
        localStorage.setItem(
          'ETS_DISPATCHED_SHIFTS',
          JSON.stringify([newShift, ...currentList])
        )
      } catch (err) {
        console.error('Failed to save to localStorage:', err)
      }

      // Save filled employees to Permanent Directory
      try {
        const existingDirectory = directory
        const newEntries: CorporateEmployee[] = []
        filledEmployees.forEach((emp) => {
          const exists = existingDirectory.some(
            (d) =>
              d.phone.replace(/\D/g, '') === emp.phone.replace(/\D/g, '') ||
              d.name.toLowerCase() === emp.name.toLowerCase()
          )
          if (!exists) {
            newEntries.push({
              id: `emp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              name: emp.name.trim(),
              phone: emp.phone.trim(),
              company: companyName,
              address: emp.address.trim(),
              lat: parseFloat(emp.lat) || 12.92,
              lng: parseFloat(emp.lng) || 77.66,
              department: 'General',
            })
          }
        })
        if (newEntries.length > 0) {
          const updated = [...newEntries, ...existingDirectory]
          localStorage.setItem('ETS_SAVED_EMPLOYEES', JSON.stringify(updated))
        }
      } catch {}

      toast.dismiss(toastId)
      toast.success(`Trip ${shiftCode} created successfully with ${filledEmployees.length} employee slots!`)

      if (onTripCreated) {
        onTripCreated(newShift)
      }
      onBack()
    } catch (err: any) {
      toast.dismiss(toastId)
      toast.error(err?.message || 'Failed to create ETS trip')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to ETS Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Trip</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Select vehicle category to load employee slots
          </p>
        </div>
      </div>

      {/* Card 1: Select Vehicle Category & Trip Information */}
      <div className="card p-5 sm:p-6 bg-white border border-slate-200/90 shadow-sm space-y-6">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-3">
            Select Vehicle Category
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sedan Option: Swift Dzire */}
            <div
              onClick={() => handleSelectVehicle('SEDAN')}
              className={`p-4 rounded-2xl border-2 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-between ${
                vehicleChoice === 'SEDAN'
                  ? 'border-sky-500 bg-sky-50/60 shadow-md ring-2 ring-sky-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div className="w-full h-32 flex items-center justify-center p-2">
                <img
                  src="/cars/swift-dzire.svg"
                  alt="Sedan - Swift Dzire"
                  className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-200 hover:scale-105"
                />
              </div>
              <div className="mt-2 text-center">
                <h3 className="text-sm font-bold text-slate-900">Sedan – Swift Dzire</h3>
                <p className="text-xs text-slate-500 mt-0.5">Employee 1, 2, 3</p>
                <span className="inline-block mt-2.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                  3 Employees
                </span>
              </div>
            </div>

            {/* SUV Option: Ertiga */}
            <div
              onClick={() => handleSelectVehicle('SUV')}
              className={`p-4 rounded-2xl border-2 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-between ${
                vehicleChoice === 'SUV'
                  ? 'border-emerald-500 bg-emerald-50/60 shadow-md ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div className="w-full h-32 flex items-center justify-center p-2">
                <img
                  src="/cars/ertiga.svg"
                  alt="SUV - Ertiga"
                  className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-200 hover:scale-105"
                />
              </div>
              <div className="mt-2 text-center">
                <h3 className="text-sm font-bold text-slate-900">SUV – Ertiga</h3>
                <p className="text-xs text-slate-500 mt-0.5">Employee 1, 2, 3, 4, 5, 6</p>
                <span className="inline-block mt-2.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  6 Employees
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2x2 Grid of Trip & Shift Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          {/* Trip Date */}
          <div>
            <label className="label">Trip Date</label>
            <div className="relative">
              <input
                type="date"
                value={tripDate}
                onChange={(e) => setTripDate(e.target.value)}
                className="input text-xs sm:text-sm font-medium"
              />
            </div>
          </div>

          {/* Shift Timing */}
          <div>
            <label className="label">Shift Timing</label>
            <select
              value={shiftTiming}
              onChange={(e) => setShiftTiming(e.target.value)}
              className="input text-xs sm:text-sm font-medium"
            >
              <option value="06:00 AM">06:00 AM (Early Login Shift)</option>
              <option value="07:00 AM">07:00 AM (Morning Shift)</option>
              <option value="08:00 AM">08:00 AM</option>
              <option value="08:30 AM">08:30 AM (Standard General Shift)</option>
              <option value="09:00 AM">09:00 AM</option>
              <option value="01:00 PM">01:00 PM (Afternoon Shift)</option>
              <option value="02:00 PM">02:00 PM</option>
              <option value="06:00 PM">06:00 PM (Evening Logout)</option>
              <option value="08:00 PM">08:00 PM</option>
              <option value="10:00 PM">10:00 PM (Night Shift)</option>
            </select>
          </div>

          {/* Trip Type */}
          <div>
            <label className="label">Trip Type</label>
            <select
              value={tripType}
              onChange={(e) => setTripType(e.target.value as any)}
              className="input text-xs sm:text-sm font-medium"
            >
              <option value="Login">Login (Home → Office Pickup)</option>
              <option value="Logout">Logout (Office → Home Drop)</option>
            </select>
          </div>

          {/* Client / Company */}
          <div>
            <label className="label">Client / Company</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company name"
              className="input text-xs sm:text-sm font-medium"
            />
          </div>
        </div>
      </div>

      {/* Card 2: Employee List (3 inputs for Sedan, 6 inputs for SUV) */}
      <div className="card p-5 sm:p-6 bg-white border border-slate-200/90 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Employee List</h2>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {filledEmployees.length} / {maxSlots} Added
          </span>
        </div>

        {/* Dynamic Employee Slots */}
        <div className="space-y-4">
          {employees.map((slot, idx) => {
            const isConfirmed = Boolean(slot.lat && slot.lng && slot.address.trim())
            const slotNumber = idx + 1

            // Directory search filtered list
            const currentSearch = searchQueries[idx] || ''
            const filteredEmps = directory.filter(
              (d) =>
                currentSearch &&
                (d.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
                  d.phone.includes(currentSearch))
            )

            return (
              <div
                key={idx}
                className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white space-y-4 shadow-xs"
              >
                {/* Employee Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      {slotNumber}
                    </span>
                    <span className="font-bold text-sm text-slate-900">Employee {slotNumber}</span>
                  </div>

                  {isConfirmed ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Location Confirmed
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Location Pending
                    </span>
                  )}
                </div>

                {/* Row 1: Employee Name & Contact Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Employee Name *</label>
                    <input
                      type="text"
                      placeholder="Full name"
                      value={slot.name}
                      onChange={(e) => updateEmployeeField(idx, 'name', e.target.value)}
                      className="input text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="label">Contact Number *</label>
                    <input
                      type="tel"
                      placeholder="Mobile number"
                      value={slot.phone}
                      onChange={(e) => updateEmployeeField(idx, 'phone', e.target.value)}
                      className="input text-xs sm:text-sm"
                    />

                    {/* WhatsApp & SMS Request Buttons beneath Contact Number */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleWhatsAppRequest(slot)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Send WhatsApp location request to this employee"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>WhatsApp Request</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSMSRequest(slot)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Send SMS location request to this employee"
                      >
                        <Mail className="w-3 h-3" />
                        <span>SMS Request</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 2: Address & Saved Employee Search */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Address *</label>
                    <textarea
                      placeholder="Enter full pickup address"
                      value={slot.address}
                      onChange={(e) => updateEmployeeField(idx, 'address', e.target.value)}
                      rows={2}
                      className="input text-xs sm:text-sm resize-none"
                    />
                  </div>

                  <div className="relative">
                    <label className="label">Saved Employee Search (optional)</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search employee name or mobile"
                        value={currentSearch}
                        onChange={(e) => {
                          setSearchQueries((prev) => ({ ...prev, [idx]: e.target.value }))
                          setActiveSearchSlot(idx)
                        }}
                        onFocus={() => setActiveSearchSlot(idx)}
                        className="input text-xs sm:text-sm pl-9"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>

                    {/* Autocomplete Dropdown */}
                    {activeSearchSlot === idx && filteredEmps.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {filteredEmps.map((emp) => (
                          <div
                            key={emp.id}
                            onClick={() => handleSelectFromDirectory(idx, emp)}
                            className="p-2.5 hover:bg-slate-50 cursor-pointer text-xs"
                          >
                            <p className="font-bold text-slate-900">{emp.name}</p>
                            <p className="text-[11px] text-slate-500">{emp.phone} • {emp.address}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 3: Home Location View Map */}
                <div>
                  <label className="label">Home Location</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMapPickerSlotIndex(idx)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>View Map</span>
                    </button>
                    <span className="text-xs text-slate-500">
                      Update the home address and save the location.
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Card 3: Location Options */}
      <div className="card p-5 bg-sky-50/70 border border-sky-200/90 rounded-2xl shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-rose-500" />
          <span>Location Options</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Mark on Map */}
          <div
            onClick={() => setMapPickerSlotIndex(0)}
            className="p-3.5 rounded-xl bg-white border border-sky-200 hover:border-sky-400 cursor-pointer transition shadow-2xs"
          >
            <p className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
              <span>🗺️ Mark on Map</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Open Google Maps to choose or verify employee location
            </p>
          </div>

          {/* Send Location Link */}
          <div
            onClick={() => {
              filledEmployees.forEach((slot) => handleWhatsAppRequest(slot))
              toast.success('Triggered location request to employees!')
            }}
            className="p-3.5 rounded-xl bg-white border border-sky-200 hover:border-sky-400 cursor-pointer transition shadow-2xs"
          >
            <p className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
              <span>➤ Send Location Link</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Ask employees to share their home location through WhatsApp
            </p>
          </div>
        </div>

        <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
          WhatsApp / SMS opens a prefilled request asking the employee to reply with a Google Maps share link. The supervisor verifies the reply and confirms the saved home address.
        </p>
      </div>

      {/* Card 4: Trip Summary */}
      <div className="card p-4 sm:p-5 bg-slate-50 border border-slate-200/90 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
            i
          </span>
          <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
            Trip Summary
          </h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <Users className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <p className="text-xs font-bold text-slate-900">{filledEmployees.length} Employees</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <Car className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
            <p className="text-xs font-bold text-slate-900">
              {vehicleChoice === 'SEDAN' ? 'Sedan' : 'SUV'}
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <Clock className="w-4 h-4 text-amber-600 mx-auto mb-1" />
            <p className="text-xs font-bold text-slate-900">{shiftTiming || 'Select time'}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <MapPin className="w-4 h-4 text-rose-600 mx-auto mb-1" />
            <p className="text-xs font-bold text-slate-900 truncate" title={companyName}>
              {companyName || 'Drop location'}
            </p>
          </div>
        </div>
      </div>

      {/* Footer & Submit Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <p className="text-xs text-slate-500 max-w-lg leading-relaxed text-center sm:text-left">
          Employee details are saved in Permanent Employee Log. Confirmed locations can be reused for future trips.
        </p>

        <button
          type="button"
          onClick={handleSaveAndCreateTrip}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          <span>Save & Create Trip</span>
        </button>
      </div>

      {/* Location Map Modal */}
      {mapPickerSlotIndex !== null && (
        <LocationMapModal
          isOpen={mapPickerSlotIndex !== null}
          onClose={() => setMapPickerSlotIndex(null)}
          title={`Select Geo-Code for Employee #${mapPickerSlotIndex + 1}`}
          initialAddress={employees[mapPickerSlotIndex]?.address || ''}
          onSelectLocation={(address, lat, lng) => {
            updateEmployeeField(mapPickerSlotIndex, 'address', address)
            if (lat) updateEmployeeField(mapPickerSlotIndex, 'lat', String(lat))
            if (lng) updateEmployeeField(mapPickerSlotIndex, 'lng', String(lng))
            setMapPickerSlotIndex(null)
            toast.success('Location confirmed from map!')
          }}
        />
      )}
    </div>
  )
}
