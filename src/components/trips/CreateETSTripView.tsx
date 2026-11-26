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
  Navigation,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react'
import { LocationMapModal } from './LocationMapModal'
import { sortStopsFarthestFirst, type LiveShiftCab } from '../../lib/routing'
import { formatCurrency } from '../../lib/utils'
import { createTripInNeon } from '../../lib/neonClient'
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
  pickupTime?: string
  geoCode?: string
  gender?: 'MALE' | 'FEMALE'
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
  gender?: 'MALE' | 'FEMALE'
}

interface CreateETSTripViewProps {
  onBack: () => void
  onTripCreated?: (newShift: LiveShiftCab) => void
  initialEmployees?: CorporateEmployee[]
}

// Helper to determine if a shift time is in the night compliance window (7:00 PM to 6:00 AM)
export const isNightShift = (timeStr: string): boolean => {
  if (!timeStr) return false
  const clean = timeStr.trim().toUpperCase()
  const isPM = clean.includes('PM')
  const isAM = clean.includes('AM')
  const parts = clean.replace(/AM|PM/g, '').trim().split(':')
  if (parts.length < 2) return false
  let hour = parseInt(parts[0], 10)
  const minute = parseInt(parts[1], 10)
  if (isNaN(hour) || isNaN(minute)) return false

  if (isPM && hour < 12) hour += 12
  if (isAM && hour === 12) hour = 0

  const timeMinutes = hour * 60 + minute
  // 7:00 PM is 19 * 60 = 1140 minutes
  // 6:00 AM is 6 * 60 = 360 minutes
  return timeMinutes >= 1140 || timeMinutes <= 360
}

// Full 24-hour range in 15-minute intervals from 12:00 AM to 11:45 PM
export const SHIFT_TIME_OPTIONS: string[] = (() => {
  const options: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const period = h < 12 ? 'AM' : 'PM'
      const displayHour = h % 12 === 0 ? 12 : h % 12
      const hourStr = displayHour < 10 ? `0${displayHour}` : `${displayHour}`
      const minStr = m < 10 ? `0${m}` : `${m}`
      options.push(`${hourStr}:${minStr} ${period}`)
    }
  }
  return options
})()

export const CreateETSTripView: React.FC<CreateETSTripViewProps> = ({
  onBack,
  onTripCreated,
  initialEmployees,
}) => {
  // Vehicle Selection: SEDAN (3 employees) or SUV (6 employees)
  const initialCount = initialEmployees?.length || 0
  const initialChoice: 'SEDAN' | 'SUV' = initialCount > 3 ? 'SUV' : 'SEDAN'
  const [vehicleChoice, setVehicleChoice] = useState<'SEDAN' | 'SUV'>(initialChoice)

  // Trip Date & Timing
  const [tripDate, setTripDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [shiftTiming, setShiftTiming] = useState('08:30 AM')
  const [tripType, setTripType] = useState<'Login' | 'Logout'>('Login')
  const [companyName, setCompanyName] = useState(() => {
    return initialEmployees?.[0]?.company || 'Atharva Tech Hub'
  })

  // Security Escort Guard details
  const [escortName, setEscortName] = useState('')
  const [escortPhone, setEscortPhone] = useState('')

  // Employee Slots: 3 for Sedan, 6 for SUV (with pickup times and gender)
  const [employees, setEmployees] = useState<EmployeeSlot[]>(() => {
    const defaultTimes = ['07:30', '07:45', '08:00', '08:15', '08:30', '08:45']
    const capacity = initialChoice === 'SUV' ? 6 : 3
    const slots: EmployeeSlot[] = []

    if (initialEmployees && initialEmployees.length > 0) {
      initialEmployees.slice(0, 6).forEach((emp, idx) => {
        slots.push({
          name: emp.name || '',
          phone: emp.phone || '',
          address: emp.address || '',
          lat: emp.lat ? String(emp.lat) : '',
          lng: emp.lng ? String(emp.lng) : '',
          geoCode: emp.lat && emp.lng ? `${emp.lat}, ${emp.lng}` : '',
          pickupTime: defaultTimes[idx] || '08:00',
          gender: emp.gender || 'MALE',
        })
      })
    }

    while (slots.length < capacity) {
      const idx = slots.length
      slots.push({
        name: '',
        phone: '',
        address: '',
        lat: '',
        lng: '',
        geoCode: '',
        pickupTime: defaultTimes[idx] || '08:00',
        gender: 'MALE',
      })
    }

    return slots
  })

  // Synchronize when initialEmployees changes
  useEffect(() => {
    if (initialEmployees && initialEmployees.length > 0) {
      const choice: 'SEDAN' | 'SUV' = initialEmployees.length > 3 ? 'SUV' : 'SEDAN'
      setVehicleChoice(choice)
      const capacity = choice === 'SUV' ? 6 : 3
      const defaultTimes = ['07:30', '07:45', '08:00', '08:15', '08:30', '08:45']
      const slots: EmployeeSlot[] = initialEmployees.slice(0, 6).map((emp, idx) => ({
        name: emp.name || '',
        phone: emp.phone || '',
        address: emp.address || '',
        lat: emp.lat ? String(emp.lat) : '',
        lng: emp.lng ? String(emp.lng) : '',
        geoCode: emp.lat && emp.lng ? `${emp.lat}, ${emp.lng}` : '',
        pickupTime: defaultTimes[idx] || '08:00',
        gender: emp.gender || 'MALE',
      }))
      while (slots.length < capacity) {
        const idx = slots.length
        slots.push({
          name: '',
          phone: '',
          address: '',
          lat: '',
          lng: '',
          geoCode: '',
          pickupTime: defaultTimes[idx] || '08:00',
          gender: 'MALE',
        })
      }
      setEmployees(slots)
      if (initialEmployees[0]?.company) {
        setCompanyName(initialEmployees[0].company)
      }
    }
  }, [initialEmployees])

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
    } catch { }
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
    const defaultTimes = ['07:00', '07:15', '07:30', '07:45', '08:00', '08:15']
    setEmployees((prev) => {
      if (prev.length === targetCount) return prev
      if (prev.length < targetCount) {
        const extra: EmployeeSlot[] = Array.from(
          { length: targetCount - prev.length },
          (_, idx) => ({
            name: '',
            phone: '',
            address: '',
            lat: '',
            lng: '',
            geoCode: '',
            pickupTime: defaultTimes[prev.length + idx] || '08:00',
          })
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

  // Helper to extract lat & lng from geo code text, coordinate string, DMS format, or Maps links
  const extractCoordinatesFromGeoCode = (input: string): { lat: number; lng: number } | null => {
    if (!input) return null
    let clean = input.trim()

    // 0. Repeatedly URL-decode in case of encoded redirect URLs (e.g. consent.google.com/ml?continue=...)
    for (let i = 0; i < 3; i++) {
      try {
        if (clean.includes('%')) {
          clean = decodeURIComponent(clean)
        } else {
          break
        }
      } catch {}
    }

    // 1. DMS Format: e.g. 12°59'37.7"N 77°30'44.2"E or 12°59'37.7"N, 77°30'44.2"E
    const dmsRegex = /(\d{1,3})[°\s]+(\d{1,2})['\s]+([\d.]+)(?:["'″”\s]*)([NSEWnsew])[\s,]+(\d{1,3})[°\s]+(\d{1,2})['\s]+([\d.]+)(?:["'″”\s]*)([NSEWnsew])/i
    const dmsMatch = clean.match(dmsRegex)
    if (dmsMatch) {
      const latDeg = parseFloat(dmsMatch[1])
      const latMin = parseFloat(dmsMatch[2])
      const latSec = parseFloat(dmsMatch[3])
      const latDir = dmsMatch[4].toUpperCase()

      const lngDeg = parseFloat(dmsMatch[5])
      const lngMin = parseFloat(dmsMatch[6])
      const lngSec = parseFloat(dmsMatch[7])
      const lngDir = dmsMatch[8].toUpperCase()

      let lat = latDeg + latMin / 60 + latSec / 3600
      if (latDir === 'S') lat = -lat

      let lng = lngDeg + lngMin / 60 + lngSec / 3600
      if (lngDir === 'W') lng = -lng

      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }
    }

    // 2. Flexible DMS parts check (match separate degree/minute/second segments)
    const singleDms = /([+-]?\d{1,3})[°\s]+(\d{1,2})['\s]+([\d.]+)(?:["'″”\s]*)([NSEWnsew])?/gi
    const matches = [...clean.matchAll(singleDms)]
    if (matches.length >= 2) {
      const m1 = matches[0]
      const m2 = matches[1]
      let lat = parseFloat(m1[1]) + parseFloat(m1[2]) / 60 + parseFloat(m1[3]) / 3600
      if (m1[4] && m1[4].toUpperCase() === 'S') lat = -lat

      let lng = parseFloat(m2[1]) + parseFloat(m2[2]) / 60 + parseFloat(m2[3]) / 3600
      if (m2[4] && m2[4].toUpperCase() === 'W') lng = -lng

      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }
    }

    // 3. Google Maps place/lat,lng e.g. /place/12.993805,77.512276
    const placeMatch = clean.match(/\/place\/(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/)
    if (placeMatch) {
      return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) }
    }

    // 4. Google Maps internal data params: !3d12.9938045!4d77.5122758
    const internalMatch = clean.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/)
    if (internalMatch) {
      return { lat: parseFloat(internalMatch[1]), lng: parseFloat(internalMatch[2]) }
    }

    // 5. Google Maps URL @lat,lng e.g. /@12.993805,77.512276
    const atMatch = clean.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/)
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
    }

    // 6. Query params ?q=lat,lng or &q=lat,lng or query=lat,lng or destination=lat,lng or ll=lat,lng
    const qMatch = clean.match(/[?&](?:q|ll|query|destination|daddr|saddr|center)=(-?\d{1,2}\.\d+)[,%20\+]+(-?\d{1,3}\.\d+)/)
    if (qMatch) {
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) }
    }

    // 7. Direct decimal coordinates e.g. "12.993805, 77.512276" or "12.993805 77.512276"
    const rawMatch = clean.match(/([-+]?\d{1,2}\.\d+)[,\s]+([-+]?\d{1,3}\.\d+)/)
    if (rawMatch) {
      const lat = parseFloat(rawMatch[1])
      const lng = parseFloat(rawMatch[2])
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng }
      }
    }

    return null
  }

  // Resolve shortened Google Maps URL (e.g. maps.app.goo.gl or goo.gl/maps)
  const resolveShortenedUrl = async (shortUrl: string): Promise<{ lat: number; lng: number } | null> => {
    const trimmed = shortUrl.trim()

    // 1. Direct coordinate check first
    const directCoords = extractCoordinatesFromGeoCode(trimmed)
    if (directCoords) return directCoords

    // 2. Try local dev unshortener endpoint with 3.5s timeout
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 3500)
      const res = await fetch(`/api/unshorten?url=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
      clearTimeout(timer)
      if (res.ok) {
        const data = await res.json()
        if (data && data.redirectUrl) {
          const coords = extractCoordinatesFromGeoCode(data.redirectUrl)
          if (coords) return coords
        }
      }
    } catch {}

    // 3. Try public unshorten.me API with 3.5s timeout
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 3500)
      const res = await fetch(`https://unshorten.me/json/${encodeURIComponent(trimmed)}`, { signal: controller.signal })
      clearTimeout(timer)
      if (res.ok) {
        const data = await res.json()
        if (data && data.resolved_url) {
          const coords = extractCoordinatesFromGeoCode(data.resolved_url)
          if (coords) return coords
        }
      }
    } catch {}

    // 4. Try allorigins JSON API with 3.5s timeout
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 3500)
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
      clearTimeout(timer)
      if (res.ok) {
        const data = await res.json()
        if (data && data.contents) {
          const coords = extractCoordinatesFromGeoCode(data.contents)
          if (coords) return coords
        }
      }
    } catch {}

    return null
  }

  // Reverse geocode lat/lng to real address
  const reverseGeocodeCoords = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      )
      if (res.ok) {
        const data = await res.json()
        if (data && data.display_name) {
          return data.display_name
        }
      }
    } catch {}

    try {
      const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`)
      if (res.ok) {
        const data = await res.json()
        if (data?.features?.[0]?.properties) {
          const p = data.features[0].properties
          const name = p.name || p.street || ''
          const locality = p.city || p.district || p.county || ''
          const state = p.state || 'Karnataka'
          const parts = [name, locality, state, p.postcode].filter(Boolean)
          if (parts.length > 0) return parts.join(', ')
        }
      }
    } catch {}

    return null
  }

  // Active resolving slot to prevent concurrent multiple triggers
  const [resolvingSlot, setResolvingSlot] = useState<number | null>(null)

  // Trigger coordinate detection and address auto-fill on paste, Enter, or button click
  const triggerAutoFill = async (index: number, val: string) => {
    const cleanVal = (val || '').trim()
    if (!cleanVal) {
      toast.error('Please enter or paste coordinates or a Maps link first.')
      return
    }

    if (resolvingSlot !== null) return // Already resolving a slot
    setResolvingSlot(index)

    const toastId = toast.loading('Detecting coordinates & address...')

    try {
      // 1. Direct coordinate check (DMS, decimal, or expanded Google Maps URL)
      let coords = extractCoordinatesFromGeoCode(cleanVal)

      // 2. Shortened link check if not found directly
      if (!coords && (cleanVal.includes('maps.app.goo.gl') || cleanVal.includes('goo.gl') || cleanVal.includes('http'))) {
        coords = await resolveShortenedUrl(cleanVal)
      }

      if (coords) {
        setEmployees((prev) => {
          const copy = [...prev]
          copy[index] = {
            ...copy[index],
            geoCode: cleanVal,
            lat: String(coords!.lat),
            lng: String(coords!.lng),
          }
          return copy
        })

        const resolvedAddress = await reverseGeocodeCoords(coords.lat, coords.lng)
        if (resolvedAddress) {
          setEmployees((prev) => {
            const copy = [...prev]
            copy[index] = {
              ...copy[index],
              address: resolvedAddress,
            }
            return copy
          })
          toast.success('Address auto-filled from coordinates!', { id: toastId })
        } else {
          toast.success(`Coordinates saved (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`, {
            id: toastId,
          })
        }
      } else {
        toast.error(
          'Could not detect coordinates. You can paste DMS (12°59\'37.7"N 77°30\'44.2"E) or Decimal (12.9938, 77.5122).',
          { id: toastId }
        )
      }
    } catch (err: any) {
      toast.error('Failed to resolve coordinates. Please paste coordinates directly.', { id: toastId })
    } finally {
      setResolvingSlot(null)
    }
  }

  // Fill employee from directory selection
  const handleSelectFromDirectory = (index: number, emp: CorporateEmployee) => {
    setEmployees((prev) => {
      const copy = [...prev]
      copy[index] = {
        ...copy[index],
        name: emp.name,
        phone: emp.phone,
        address: emp.address,
        lat: String(emp.lat),
        lng: String(emp.lng),
        geoCode: emp.lat && emp.lng ? `${emp.lat}, ${emp.lng}` : copy[index].geoCode || '',
        gender: emp.gender || copy[index].gender || 'MALE',
      }
      return copy
    })
    setSearchQueries((prev) => ({ ...prev, [index]: emp.name }))
    setActiveSearchSlot(null)
    toast.success(`Loaded details for ${emp.name}`)
  }

  // Helper to strictly validate and normalize 10-digit Indian mobile number
  const getStrictMobileNumber = (rawPhone: string) => {
    let digits = (rawPhone || '').replace(/\D/g, '')
    // Handle +91 or 91 country code prefix
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2)
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1)
    }
    // Must be exactly 10 digits
    if (/^[6-9]\d{9}$/.test(digits) || digits.length === 10) {
      return digits
    }
    return null
  }

  // Format time (e.g. 11:30) to 12-hour AM/PM format (e.g. 11:30 AM)
  const formatTime12h = (timeStr?: string, defaultVal: string = '08:30 AM'): string => {
    if (!timeStr) return defaultVal
    const parts = timeStr.trim().split(':')
    if (parts.length < 2) return timeStr
    let hour = parseInt(parts[0], 10)
    const minute = parts[1].slice(0, 2)
    if (isNaN(hour)) return timeStr
    const period = hour >= 12 ? 'PM' : 'AM'
    if (hour > 12) hour -= 12
    if (hour === 0) hour = 12
    const paddedHour = hour < 10 ? `0${hour}` : `${hour}`
    return `${paddedHour}:${minute} ${period}`
  }

  // WhatsApp location request link - strictly restricted to entered number with exact pickup time
  const handleWhatsAppRequest = (slot: EmployeeSlot, slotIndex: number = 0) => {
    // Read directly from employees array to guarantee freshest state
    const currentSlot = employees[slotIndex] || slot
    const phoneToUse = currentSlot.phone || slot.phone
    const valid10Digits = getStrictMobileNumber(phoneToUse)
    if (!valid10Digits) {
      toast.error(
        `Please enter a valid 10-digit mobile number for Employee #${slotIndex + 1} first.`
      )
      return
    }

    const name = (currentSlot.name || slot.name).trim() || `Employee ${slotIndex + 1}`
    const pickupTimeRaw = currentSlot.pickupTime || slot.pickupTime
    const employeePickupTime = formatTime12h(pickupTimeRaw, shiftTiming)
    const shareLink = `${window.location.origin}/share-location?name=${encodeURIComponent(name)}&tripDate=${encodeURIComponent(tripDate)}&pickup=${encodeURIComponent(employeePickupTime)}&type=${tripType}`

    const msg = encodeURIComponent(
      tripType === 'Login'
        ? `Hi ${name}, please share your live home pickup location with Atharva Travels for your upcoming ETS corporate shift on ${tripDate} at ${employeePickupTime}. Reply with a Google Maps location link or coordinates.\n\n📍 Or tap here to auto-detect and share your location in 1-click:\n${shareLink}`
        : `Hi ${name}, please share your live home drop location with Atharva Travels for your upcoming ETS corporate shift on ${tripDate}.\n\n📍 Or tap here to auto-detect and share your location in 1-click:\n${shareLink}`
    )
    // STRICT: Only opens to the exact phone entered with 91 country code prefix, never generic
    const targetPhone = `91${valid10Digits}`
    const url = `https://wa.me/${targetPhone}?text=${msg}`
    window.open(url, '_blank')
  }

  // SMS location request link - strictly restricted to entered number with exact pickup time
  const handleSMSRequest = (slot: EmployeeSlot, slotIndex: number = 0) => {
    const currentSlot = employees[slotIndex] || slot
    const phoneToUse = currentSlot.phone || slot.phone
    const valid10Digits = getStrictMobileNumber(phoneToUse)
    if (!valid10Digits) {
      toast.error(
        `Please enter a valid 10-digit mobile number for Employee #${slotIndex + 1} first.`
      )
      return
    }

    const name = (currentSlot.name || slot.name).trim() || `Employee ${slotIndex + 1}`
    const pickupTimeRaw = currentSlot.pickupTime || slot.pickupTime
    const employeePickupTime = formatTime12h(pickupTimeRaw, shiftTiming)
    const shareLink = `${window.location.origin}/share-location?name=${encodeURIComponent(name)}&tripDate=${encodeURIComponent(tripDate)}&pickup=${encodeURIComponent(employeePickupTime)}&type=${tripType}`

    const body = encodeURIComponent(
      tripType === 'Login'
        ? `Hi ${name}, please share your home pickup location for Atharva Travels shift on ${tripDate} at ${employeePickupTime}. Tap link to share: ${shareLink}`
        : `Hi ${name}, please share your home drop location for Atharva Travels shift on ${tripDate}. Tap link to share: ${shareLink}`
    )
    // STRICT: Only sends SMS to the exact entered 10-digit number
    window.open(`sms:+91${valid10Digits}?body=${body}`, '_blank')
  }

// Count filled employee slots
const filledEmployees = employees.filter((e) => e.name.trim() && e.address.trim())
const maxSlots = vehicleChoice === 'SEDAN' ? 3 : 6

// Night shift compliance calculations (7:00 PM to 6:00 AM)
const isNight = isNightShift(shiftTiming)

// Drop (Logout): Escort required if the LAST employee dropped off is Female
const isLastFemaleDrop =
  tripType === 'Logout' &&
  isNight &&
  filledEmployees.length > 0 &&
  filledEmployees[filledEmployees.length - 1].gender === 'FEMALE'

// Pickup (Login): Escort required if the FIRST employee picked up is Female
const isFirstFemalePickup =
  tripType === 'Login' &&
  isNight &&
  filledEmployees.length > 0 &&
  filledEmployees[0].gender === 'FEMALE'

const isEscortRequired = isLastFemaleDrop || isFirstFemalePickup

// Form submission: Validate, Calculate Optimal Route, and Dispatch Shift
const [isSubmitting, setIsSubmitting] = useState(false)

const handleSaveAndCreateTrip = async () => {
  if (filledEmployees.length === 0) {
    toast.error('Please add at least 1 employee with a Name and Address')
    return
  }

  // Security escort compliance validation
  if (isEscortRequired && !escortName.trim()) {
    toast.error('Security Escort Guard Name is mandatory for night shift female safety compliance.')
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
        pickupTime: emp.pickupTime || undefined,
        gender: emp.gender || 'MALE',
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
      hasEscort: isEscortRequired || Boolean(escortName.trim()),
      escortName: escortName.trim() || undefined,
      escortPhone: escortPhone.trim() || undefined,
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

    // Sync to Neon DB in background so all devices see this trip
    createTripInNeon({
      tripNo: shiftCode,
      serviceType: 'RAC',
      passengerName: filledEmployees.map((e) => e.name).join(', ') || 'Corporate Employees',
      passengerPhone: filledEmployees[0]?.phone || '9999999999',
      pickup: tripType === 'Login' ? filledEmployees[0]?.address || 'Employee Home Pickup' : companyName,
      drop: tripType === 'Login' ? companyName : (filledEmployees[0]?.address || 'Employee Home Drop'),
      scheduledDate: tripDate,
      scheduledTime: shiftTiming,
      tripAmount: filledEmployees.length * 600,
      notes: `ETS ${tripType.toUpperCase()} Shift [Vehicle: ${vehicleChoice === 'SEDAN' ? 'Sedan 4+1' : 'SUV 6+1'}] Hub: ${companyName}${
        isEscortRequired
          ? ` [Escort: ${escortName.trim()}${escortPhone.trim() ? ' Ph: ' + escortPhone.trim() : ''}]`
          : ''
      }`,
    }).catch((err) => console.warn('ETS trip Neon sync notice:', err))

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
            gender: emp.gender || 'MALE',
          })
        }
      })
      if (newEntries.length > 0) {
        const updated = [...newEntries, ...existingDirectory]
        localStorage.setItem('ETS_SAVED_EMPLOYEES', JSON.stringify(updated))
      }
    } catch { }

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
            className={`p-4 rounded-2xl border-2 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-between ${vehicleChoice === 'SEDAN'
                ? 'border-sky-500 bg-sky-50/60 shadow-md ring-2 ring-sky-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
              }`}
          >
            <div className="w-full h-32 flex items-center justify-center p-2">
              <img
                src="/cars/swift-dzire.png"
                alt="Sedan - Swift Dzire"
                className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-200 hover:scale-105"
              />
            </div>
            <div className="mt-2 text-center">
              <h3 className="text-sm font-bold text-slate-900">Sedan – Swift Dzire</h3>
              <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                3 Employees
              </span>
            </div>
          </div>

          {/* SUV Option: Ertiga */}
          <div
            onClick={() => handleSelectVehicle('SUV')}
            className={`p-4 rounded-2xl border-2 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-between ${vehicleChoice === 'SUV'
                ? 'border-emerald-500 bg-emerald-50/60 shadow-md ring-2 ring-emerald-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
              }`}
          >
            <div className="w-full h-32 flex items-center justify-center p-2">
              <img
                src="/cars/ertiga.png"
                alt="SUV - Ertiga"
                className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-200 hover:scale-105"
              />
            </div>
            <div className="mt-2 text-center">
              <h3 className="text-sm font-bold text-slate-900">SUV – Ertiga</h3>
              <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                6 Employees
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Trip & Shift Details (Shift Timing visible for both Login & Logout with Night Window Compliance) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
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

        {/* Shift Timing - Visible for BOTH Login and Logout */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label !mb-0">Shift Timing</label>
            {isNight && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                🌙 Night Window
              </span>
            )}
          </div>
          <select
            value={shiftTiming}
            onChange={(e) => setShiftTiming(e.target.value)}
            className={`input text-xs sm:text-sm font-medium ${
              isNight ? 'border-purple-300 bg-purple-50/20' : ''
            }`}
          >
            {SHIFT_TIME_OPTIONS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
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
              {/* Employee Header with Gender Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    {slotNumber}
                  </span>
                  <span className="font-bold text-sm text-slate-900">Employee {slotNumber}</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Gender Male / Female Toggle */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => updateEmployeeField(idx, 'gender', 'MALE')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        slot.gender !== 'FEMALE'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>👨 Male</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateEmployeeField(idx, 'gender', 'FEMALE')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        slot.gender === 'FEMALE'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>👩 Female</span>
                    </button>
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
              </div>

                {/* Row 1: Employee Name, Contact Number & (if Login) Pickup Time */}
                <div
                  className={`grid grid-cols-1 ${
                    tripType === 'Login' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
                  } gap-4`}
                >
                  <div>
                    <label className="label">Employee Name *</label>
                    <input
                      type="text"
                      placeholder="Full name"
                      value={slot.name}
                      onChange={(e) => updateEmployeeField(idx, 'name', e.target.value)}
                      className="input text-xs sm:text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="label">Contact Number *</label>
                    <input
                      type="tel"
                      placeholder="Mobile number"
                      value={slot.phone}
                      onChange={(e) => updateEmployeeField(idx, 'phone', e.target.value)}
                      className="input text-xs sm:text-sm font-medium"
                    />

                    {/* WhatsApp & SMS Request Buttons beneath Contact Number */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleWhatsAppRequest(employees[idx] || slot, idx)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title={
                          (employees[idx]?.phone || slot.phone).trim()
                            ? `Send WhatsApp location request strictly to ${(employees[idx]?.phone || slot.phone)}`
                            : 'Enter a 10-digit mobile number above to send WhatsApp request'
                        }
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>WhatsApp Request</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSMSRequest(employees[idx] || slot, idx)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title={
                          (employees[idx]?.phone || slot.phone).trim()
                            ? `Send SMS location request strictly to ${(employees[idx]?.phone || slot.phone)}`
                            : 'Enter a 10-digit mobile number above to send SMS request'
                        }
                      >
                        <Mail className="w-3 h-3" />
                        <span>SMS Request</span>
                      </button>
                    </div>
                  </div>

                  {/* Pickup Time - ONLY for Login (Home -> Office Pickup) */}
                  {tripType === 'Login' && (
                    <div>
                      <label className="label">Pickup Time *</label>
                      <div className="relative">
                        <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="time"
                          value={slot.pickupTime || ''}
                          onChange={(e) => updateEmployeeField(idx, 'pickupTime', e.target.value)}
                          className="input pl-9 text-xs sm:text-sm font-medium"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">Scheduled pickup for stop #{slotNumber}</span>
                    </div>
                  )}
                </div>

                {/* Row 2: Geo Code & Address (Left) + Saved Employee Search (Right) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    {/* Geo Code Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="label !mb-0 flex items-center gap-1.5 text-blue-700 font-bold">
                          <Navigation className="w-3.5 h-3.5 text-blue-600" />
                          <span>Geo Code / GPS Link</span>
                        </label>
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          Auto-fills Address
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Paste coordinates (e.g. 12°59'37.7&quot;N 77°30'44.2&quot;E, 12.9938, 77.5122, or Maps link)"
                          value={slot.geoCode || ''}
                          onChange={(e) => updateEmployeeField(idx, 'geoCode', e.target.value)}
                          onPaste={(e) => {
                            const pasted = e.clipboardData.getData('text')
                            if (pasted && pasted.trim()) {
                              updateEmployeeField(idx, 'geoCode', pasted.trim())
                              setTimeout(() => triggerAutoFill(idx, pasted.trim()), 30)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              triggerAutoFill(idx, slot.geoCode || '')
                            }
                          }}
                          className="input text-xs sm:text-sm font-medium border-blue-200 focus:border-blue-500 bg-blue-50/20 flex-1"
                        />
                        <button
                          type="button"
                          disabled={resolvingSlot === idx}
                          onClick={() => triggerAutoFill(idx, slot.geoCode || '')}
                          className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                          title="Click to resolve and auto-fill address from Geo Code"
                        >
                          {resolvingSlot === idx ? (
                            <>
                              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Detecting...</span>
                            </>
                          ) : (
                            <span>Auto-Fill</span>
                          )}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Paste coordinates (DMS 12°59'37.7"N 77°30'44.2"E / Decimal) or Google Maps link
                      </span>
                    </div>

                    {/* Address Textarea */}
                    <div>
                      <label className="label">
                        {tripType === 'Login' ? 'Pickup Address *' : 'Drop Address *'}
                      </label>
                      <textarea
                        placeholder={
                          tripType === 'Login'
                            ? 'Enter full home pickup address'
                            : 'Enter full home drop address'
                        }
                        value={slot.address}
                        onChange={(e) => updateEmployeeField(idx, 'address', e.target.value)}
                        rows={2}
                        className="input text-xs sm:text-sm resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
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

                    {/* GPS Locked Badge */}
                    {slot.lat && slot.lng && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between text-emerald-800">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>GPS Locked: {parseFloat(slot.lat).toFixed(4)}, {parseFloat(slot.lng).toFixed(4)}</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-md">
                          Verified
                        </span>
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

      {/* Security Escort Guard Section (Triggered by Night Shift Female Safety Rules) */}
      {isEscortRequired ? (
        <div className="card p-5 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-2xl shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-amber-950">
                  Security Escort Guard Required
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-200 text-amber-900 uppercase tracking-wider border border-amber-300">
                  Mandatory Compliance
                </span>
                <span className="text-[11px] font-bold text-amber-800">
                  (Night Window: 7:00 PM – 6:00 AM)
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                {isLastFemaleDrop && (
                  <>
                    <strong>Drop Trip Rule (Office → Home):</strong> The last employee to be dropped off in this shift is female (
                    <span className="font-bold underline text-amber-950">
                      {filledEmployees[filledEmployees.length - 1]?.name}
                    </span>
                    ). Under Karnataka corporate transport safety standards, a verified Security Escort Guard must accompany the vehicle until the final drop.
                  </>
                )}
                {isFirstFemalePickup && (
                  <>
                    <strong>Pickup Trip Rule (Home → Office):</strong> The first employee to be picked up in this shift is female (
                    <span className="font-bold underline text-amber-950">
                      {filledEmployees[0]?.name}
                    </span>
                    ). Under Karnataka corporate transport safety standards, a verified Security Escort Guard must be present in the cab from the initial pickup.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-amber-200/90">
            <div>
              <label className="text-xs font-bold text-amber-950 block mb-1">
                Escort Guard Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar (Security Guard)"
                value={escortName}
                onChange={(e) => setEscortName(e.target.value)}
                className="input text-xs sm:text-sm font-medium border-amber-300 focus:border-amber-500 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-amber-950 block mb-1">
                Escort Contact Number (Optional)
              </label>
              <input
                type="tel"
                placeholder="e.g. +91 98450 99881"
                value={escortPhone}
                onChange={(e) => setEscortPhone(e.target.value)}
                className="input text-xs sm:text-sm font-medium border-amber-300 focus:border-amber-500 bg-white"
              />
            </div>
          </div>
        </div>
      ) : (
        isNight && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                <strong>Night Shift Active (7 PM - 6 AM):</strong> No escort trigger active (
                {tripType === 'Logout' ? 'last drop is male' : 'first pickup is male'}).
              </span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Compliant
            </span>
          </div>
        )
      )}

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
              <span>Mark on Map</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Open Google Maps to choose or verify employee location
            </p>
          </div>

          {/* Send Location Link */}
          <div
            onClick={() => {
              const validSlots = employees
                .map((slot, i) => ({ slot, i, validPhone: getStrictMobileNumber(slot.phone) }))
                .filter((item) => Boolean(item.validPhone))

              if (validSlots.length === 0) {
                toast.error('Please enter a valid 10-digit mobile number for at least one employee.')
                return
              }

              validSlots.forEach(({ slot, i }) => handleWhatsAppRequest(slot, i))
              toast.success(`Triggered WhatsApp request strictly to ${validSlots.length} employee number(s)!`)
            }}
            className="p-3.5 rounded-xl bg-white border border-sky-200 hover:border-sky-400 cursor-pointer transition shadow-2xs"
          >
            <p className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
              <span>Send Location Link</span>
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
          title={`Home Location - ${employees[mapPickerSlotIndex]?.name || `Employee #${mapPickerSlotIndex + 1}`}`}
          initialAddress={employees[mapPickerSlotIndex]?.address || ''}
          initialLat={
            employees[mapPickerSlotIndex]?.lat
              ? parseFloat(employees[mapPickerSlotIndex].lat)
              : undefined
          }
          initialLng={
            employees[mapPickerSlotIndex]?.lng
              ? parseFloat(employees[mapPickerSlotIndex].lng)
              : undefined
          }
          onSelectLocation={(address, lat, lng) => {
            updateEmployeeField(mapPickerSlotIndex, 'address', address)
            if (lat) updateEmployeeField(mapPickerSlotIndex, 'lat', String(lat))
            if (lng) updateEmployeeField(mapPickerSlotIndex, 'lng', String(lng))
            if (lat && lng) {
              updateEmployeeField(mapPickerSlotIndex, 'geoCode', `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
            }
            setMapPickerSlotIndex(null)
            toast.success('Location confirmed from map!')
          }}
        />
      )}
    </div>
    )
}
