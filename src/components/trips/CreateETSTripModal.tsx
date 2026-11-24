import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { LocationMapModal } from './LocationMapModal'
import { vendorApi } from '../../lib/api'
import { formatCurrency } from '../../lib/utils'
import type { Wallet } from '../../types'
import {
  Car,
  Building2,
  Users,
  ShieldCheck,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft,
  Check,
  Search,
  Sparkles,
  Phone,
  User,
  Navigation,
  Compass,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Sliders,
  FileText,
  Layers,
  ChevronRight,
  Briefcase,
  Lock,
} from 'lucide-react'

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

const DEFAULT_CORPORATE_EMPLOYEES: CorporateEmployee[] = [
  {
    id: 'emp-101',
    name: 'Rahul Sharma',
    phone: '+91 98765 43210',
    company: 'Atharva Tech Hub',
    address: 'Flat 302, Green Glen Layout, Bellandur, Bengaluru',
    lat: 12.9298,
    lng: 77.6743,
    department: 'Engineering',
  },
  {
    id: 'emp-102',
    name: 'Priya Nair',
    phone: '+91 98451 23456',
    company: 'Atharva Tech Hub',
    address: '#45, 14th Main, HSR Layout Sector 4, Bengaluru',
    lat: 12.911,
    lng: 77.6385,
    department: 'Product',
  },
  {
    id: 'emp-103',
    name: 'Ananya Rao',
    phone: '+91 99001 87654',
    company: 'Infosys Campus',
    address: 'Villa 12, Rainbow Drive, Sarjapur Road, Bengaluru',
    lat: 12.9152,
    lng: 77.689,
    department: 'Operations',
  },
  {
    id: 'emp-104',
    name: 'Vikram Patel',
    phone: '+91 97412 34567',
    company: 'Manyata Embassy Tech Park',
    address: 'A-204, Salarpuria Greenage, Bommanahalli, Hosur Rd, Bengaluru',
    lat: 12.9056,
    lng: 77.6254,
    department: 'Quality Assurance',
  },
  {
    id: 'emp-105',
    name: 'Sneha Kulkarni',
    phone: '+91 98860 11223',
    company: 'RMZ Ecospace',
    address: '#108, 5th Cross, Indiranagar Stage 1, Bengaluru',
    lat: 12.978,
    lng: 77.641,
    department: 'Finance',
  },
  {
    id: 'emp-106',
    name: 'Karthik Sundaram',
    phone: '+91 96112 55443',
    company: 'Wipro SEZ Campus',
    address: 'B-501, Mantri Tranquil, Gubbalala, Kanakapura Rd, Bengaluru',
    lat: 12.8841,
    lng: 77.5458,
    department: 'Human Resources',
  },
  {
    id: 'emp-107',
    name: 'Divya Menon',
    phone: '+91 97314 66778',
    company: 'Prestige Tech Park',
    address: '12B, Palm Meadows, Whitefield, Bengaluru',
    lat: 12.9642,
    lng: 77.7471,
    department: 'Sales',
  },
  {
    id: 'emp-108',
    name: 'Amit Deshmukh',
    phone: '+91 98450 99887',
    company: 'Atharva Tech Hub',
    address: '304, Brigade Metropolis, Garudacharpalya, Mahadevapura, Bengaluru',
    lat: 12.9912,
    lng: 77.7021,
    department: 'Design',
  },
]

export const CORPORATE_OFFICES = [
  {
    id: 'office-1',
    name: 'Atharva Tech Hub (Electronic City)',
    address: 'Atharva Towers, Hosur Rd, Electronic City Phase 1, Bengaluru, 560100',
    lat: 12.8452,
    lng: 77.6602,
  },
  {
    id: 'office-2',
    name: 'Manyata Embassy Business Park',
    address: 'Outer Ring Rd, Manayata Tech Park, Thanisandra, Bengaluru, 560045',
    lat: 13.0475,
    lng: 77.6202,
  },
  {
    id: 'office-3',
    name: 'RMZ Ecospace (Bellandur)',
    address: 'Outer Ring Rd, Bellandur, Bengaluru, Karnataka 560103',
    lat: 12.926,
    lng: 77.6833,
  },
  {
    id: 'office-4',
    name: 'Infosys Campus (Gate 1)',
    address: 'Plot No. 44, Electronic City Phase 1, Hosur Road, Bengaluru, 560100',
    lat: 12.8496,
    lng: 77.6633,
  },
  {
    id: 'office-5',
    name: 'Wipro SEZ Campus (Sarjapur)',
    address: 'Doddakannelli, Sarjapur Road, Bengaluru, Karnataka 560035',
    lat: 12.9152,
    lng: 77.689,
  },
  {
    id: 'office-6',
    name: 'Prestige Tech Park (Marathahalli)',
    address: 'Marathahalli - Sarjapur Outer Ring Rd, Kadubeesanahalli, Bengaluru, 560103',
    lat: 12.9366,
    lng: 77.6918,
  },
]

interface EmployeeSlot {
  name: string
  phone: string
  address: string
  lat: number | string
  lng: number | string
  isIdentified?: boolean
  company?: string
}

interface CreateETSTripModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenRechargeModal: () => void
}

type ETSViewMode = 'HUB' | 'CREATE_TRIP' | 'EMPLOYEE_LOG' | 'ROUTING_RULES'

export const CreateETSTripModal: React.FC<CreateETSTripModalProps> = ({
  isOpen,
  onClose,
  onOpenRechargeModal,
}) => {
  const queryClient = useQueryClient()

  // Top-Level ETS View Mode
  const [activeView, setActiveView] = useState<ETSViewMode>('HUB')

  // Create Trip Step (1: Vehicle, 2: Shift & Office, 3: Employees, 4: Manifest)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Step 1: Vehicle & Capacity (Sedan = 3 employees, SUV = 6 employees)
  const [vehicleChoice, setVehicleChoice] = useState<'SEDAN' | 'SUV' | null>(null)

  // Step 2: Shift Direction (LOGIN vs LOGOUT) & Corporate Landmark
  const [shiftType, setShiftType] = useState<'LOGIN' | 'LOGOUT'>('LOGIN')
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>(CORPORATE_OFFICES[0].id)
  const [customOfficeName, setCustomOfficeName] = useState('')
  const [customOfficeAddress, setCustomOfficeAddress] = useState('')
  const [customOfficeCoords, setCustomOfficeCoords] = useState<{ lat: number; lng: number }>({
    lat: 12.9716,
    lng: 77.5946,
  })

  // Date and Time
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0])
  const [scheduledTime, setScheduledTime] = useState('08:30')

  // Step 3: Employees Roster (3 for Sedan, 6 for SUV)
  const [employees, setEmployees] = useState<EmployeeSlot[]>([
    { name: '', phone: '', address: '', lat: '', lng: '' },
    { name: '', phone: '', address: '', lat: '', lng: '' },
    { name: '', phone: '', address: '', lat: '', lng: '' },
  ])

  // Active Map Picker state for employee slot
  const [mapPickerSlotIndex, setMapPickerSlotIndex] = useState<number | null>(null)

  // Autocomplete search state per slot
  const [activeSearchSlot, setActiveSearchSlot] = useState<number | null>(null)
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('')

  // Employee Log view state
  const [logFilterQuery, setLogFilterQuery] = useState('')
  const [isAddingNewEmp, setIsAddingNewEmp] = useState(false)
  const [newEmpName, setNewEmpName] = useState('')
  const [newEmpPhone, setNewEmpPhone] = useState('')
  const [newEmpCompany, setNewEmpCompany] = useState(CORPORATE_OFFICES[0].name)
  const [newEmpDept, setNewEmpDept] = useState('Operations')
  const [newEmpAddress, setNewEmpAddress] = useState('')
  const [newEmpLat, setNewEmpLat] = useState('12.9298')
  const [newEmpLng, setNewEmpLng] = useState('77.6743')

  // Load and persist corporate employee directory
  const [directory, setDirectory] = useState<CorporateEmployee[]>(() => {
    try {
      const saved = localStorage.getItem('ETS_SAVED_EMPLOYEES')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return DEFAULT_CORPORATE_EMPLOYEES
  })

  // Save new directory items
  const saveToDirectory = (newEmp: EmployeeSlot) => {
    if (!newEmp.name.trim() || !newEmp.phone.trim()) return
    setDirectory((prev) => {
      const existing = prev.find(
        (e) =>
          e.phone.replace(/\D/g, '') === newEmp.phone.replace(/\D/g, '') ||
          e.name.toLowerCase() === newEmp.name.toLowerCase()
      )
      if (existing) return prev
      const item: CorporateEmployee = {
        id: `emp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: newEmp.name.trim(),
        phone: newEmp.phone.trim(),
        company: currentOffice.name,
        address: newEmp.address.trim(),
        lat: Number(newEmp.lat) || 12.9716,
        lng: Number(newEmp.lng) || 77.5946,
      }
      const updated = [item, ...prev]
      try {
        localStorage.setItem('ETS_SAVED_EMPLOYEES', JSON.stringify(updated))
      } catch {}
      return updated
    })
  }

  // Handle explicit Add Employee from Log View
  const handleAddNewEmployeeFromLog = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmpName.trim() || !newEmpPhone.trim() || !newEmpAddress.trim()) {
      toast.error('Please enter Name, Phone, and Address')
      return
    }
    const newRecord: CorporateEmployee = {
      id: `emp-${Date.now()}`,
      name: newEmpName.trim(),
      phone: newEmpPhone.trim(),
      company: newEmpCompany,
      address: newEmpAddress.trim(),
      lat: parseFloat(newEmpLat) || 12.9298,
      lng: parseFloat(newEmpLng) || 77.6743,
      department: newEmpDept,
    }
    const updated = [newRecord, ...directory]
    setDirectory(updated)
    try {
      localStorage.setItem('ETS_SAVED_EMPLOYEES', JSON.stringify(updated))
    } catch {}
    toast.success(`Employee ${newRecord.name} added to Corporate Directory!`)
    setIsAddingNewEmp(false)
    setNewEmpName('')
    setNewEmpPhone('')
    setNewEmpAddress('')
  }

  // Sync slots count when vehicle choice changes
  useEffect(() => {
    const requiredCount = vehicleChoice === 'SUV' ? 6 : 3
    setEmployees((prev) => {
      if (prev.length === requiredCount) return prev
      if (prev.length < requiredCount) {
        const diff = requiredCount - prev.length
        const added: EmployeeSlot[] = Array.from({ length: diff }, () => ({
          name: '',
          phone: '',
          address: '',
          lat: '',
          lng: '',
        }))
        return [...prev, ...added]
      }
      return prev.slice(0, requiredCount)
    })
  }, [vehicleChoice])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveView('HUB')
      setStep(1)
      setVehicleChoice(null)
      setShiftType('LOGIN')
      setScheduledTime('08:30')
      setEmployees([
        { name: '', phone: '', address: '', lat: '', lng: '' },
        { name: '', phone: '', address: '', lat: '', lng: '' },
        { name: '', phone: '', address: '', lat: '', lng: '' },
      ])
    }
  }, [isOpen])

  // Get active office details
  const currentOffice = useMemo(() => {
    if (selectedOfficeId === 'custom') {
      return {
        id: 'custom',
        name: customOfficeName.trim() || 'Custom Client Office',
        address: customOfficeAddress.trim() || 'Client Corporate Campus, Bengaluru',
        lat: customOfficeCoords.lat,
        lng: customOfficeCoords.lng,
      }
    }
    return (
      CORPORATE_OFFICES.find((o) => o.id === selectedOfficeId) || CORPORATE_OFFICES[0]
    )
  }, [selectedOfficeId, customOfficeName, customOfficeAddress, customOfficeCoords])

  // Data fetching: Wallet balance
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

  // Fixed Pricing for ETS
  // Sedan (3 Seats): ₹1,500
  // SUV (6 Seats): ₹2,400
  const tripFare = vehicleChoice === 'SUV' ? 2400 : 1500
  const platformFee = 10
  const convenienceFee = Math.round(tripFare * 0.15)
  const driverPayable = Math.max(0, tripFare - platformFee - convenienceFee)

  const walletBalance = wallet?.balance ?? 0
  const isBalanceSufficient = walletBalance >= tripFare

  // Filtered employee suggestions for auto-identification in create trip form
  const suggestions = useMemo(() => {
    if (!employeeSearchQuery.trim()) return []
    const q = employeeSearchQuery.toLowerCase().trim()
    const digits = q.replace(/\D/g, '')
    return directory
      .filter((emp) => {
        const nameMatch = emp.name.toLowerCase().includes(q)
        const phoneMatch = digits.length >= 3 && emp.phone.replace(/\D/g, '').includes(digits)
        const addressMatch = emp.address.toLowerCase().includes(q)
        return nameMatch || phoneMatch || addressMatch
      })
      .slice(0, 5)
  }, [employeeSearchQuery, directory])

  // Filtered employees for Employee Log view
  const filteredLogEmployees = useMemo(() => {
    if (!logFilterQuery.trim()) return directory
    const q = logFilterQuery.toLowerCase().trim()
    return directory.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        emp.phone.includes(q) ||
        emp.company.toLowerCase().includes(q) ||
        (emp.department && emp.department.toLowerCase().includes(q)) ||
        emp.address.toLowerCase().includes(q)
    )
  }, [logFilterQuery, directory])

  // Handle selecting an identified employee
  const handleSelectEmployee = (slotIndex: number, emp: CorporateEmployee) => {
    setEmployees((prev) => {
      const next = [...prev]
      next[slotIndex] = {
        name: emp.name,
        phone: emp.phone,
        address: emp.address,
        lat: emp.lat,
        lng: emp.lng,
        isIdentified: true,
        company: emp.company,
      }
      return next
    })
    setActiveSearchSlot(null)
    setEmployeeSearchQuery('')
    toast.success(`Identified ${emp.name}! Address & Geo-coordinates auto-filled.`, {
      icon: '✓',
    })
  }

  // Handle manual input in employee slots
  const updateEmployeeField = (
    index: number,
    field: keyof EmployeeSlot,
    value: string | number | boolean
  ) => {
    setEmployees((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        [field]: value,
      }
      if (field === 'name' && next[index].isIdentified) {
        next[index].isIdentified = false
      }
      return next
    })
  }

  // Validation
  const validateStep3 = () => {
    const requiredCount = vehicleChoice === 'SUV' ? 6 : 3
    for (let i = 0; i < requiredCount; i++) {
      const emp = employees[i]
      if (!emp.name.trim()) {
        toast.error(`Please enter name for Employee ${i + 1}`)
        return false
      }
      if (!emp.phone.trim()) {
        toast.error(`Please enter contact number for Employee ${i + 1}`)
        return false
      }
      if (!emp.address.trim()) {
        toast.error(`Please enter pickup/drop address for Employee ${i + 1}`)
        return false
      }
    }
    return true
  }

  // Create Trip Mutation
  const createTripMutation = useMutation({
    mutationFn: async () => {
      const requiredCount = vehicleChoice === 'SUV' ? 6 : 3
      const activeEmployees = employees.slice(0, requiredCount)

      // Save any newly entered employees to local corporate directory
      activeEmployees.forEach((emp) => saveToDirectory(emp))

      // Manifest summary
      const manifestList = activeEmployees
        .map(
          (emp, i) =>
            `${i + 1}. ${emp.name} (${emp.phone}) - [${emp.lat || 'N/A'}, ${emp.lng || 'N/A'}] - ${emp.address}`
        )
        .join('\n')

      const pickupLocation =
        shiftType === 'LOGIN'
          ? `Multiple Home Pickups (${requiredCount} Employees) -> Route via Geo-codes`
          : `${currentOffice.name} (${currentOffice.address})`

      const dropLocation =
        shiftType === 'LOGIN'
          ? `${currentOffice.name} (${currentOffice.address})`
          : `Multiple Home Drops (${requiredCount} Employees) -> Route via Geo-codes`

      const payload = {
        serviceType: 'PACKAGE',
        passengerName: `${activeEmployees[0].name} + ${requiredCount - 1} Employees`,
        passengerPhone: activeEmployees[0].phone,
        pickup: pickupLocation,
        drop: dropLocation,
        scheduledDate,
        scheduledTime,
        tripAmount: tripFare,
        notes: `[ETS Corporate Shift: ${shiftType}] [Vehicle: ${
          vehicleChoice === 'SUV' ? 'SUV 6+1 (6 Seater)' : 'Sedan 4+1 (3 Seater)'
        }] [Office: ${currentOffice.name}]\n\n--- Employee Manifest ---\n${manifestList}`,
      }

      return (await vendorApi.createTrip(payload)).data
    },
    onSuccess: () => {
      toast.success('ETS Corporate Trip created successfully! Wallet debited.')
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to create ETS trip')
    },
  })

  // Share helpers
  const getShareText = () => {
    const requiredCount = vehicleChoice === 'SUV' ? 6 : 3
    const activeEmployees = employees.slice(0, requiredCount)
    const empDetails = activeEmployees
      .map(
        (emp, i) =>
          `  ${i + 1}. ${emp.name} | ${emp.phone}\n     Geo: (${emp.lat || '-'}, ${
            emp.lng || '-'
          })\n     Loc: ${emp.address}`
      )
      .join('\n')

    return (
      `*Glide ETS Corporate Trip Manifest*\n` +
      `--------------------------------\n` +
      `*Shift Type:* ${shiftType === 'LOGIN' ? 'Morning LOGIN (Home → Office)' : 'Evening LOGOUT (Office → Home)'}\n` +
      `*Vehicle:* ${vehicleChoice === 'SUV' ? 'SUV (6 Employees)' : 'Sedan (3 Employees)'}\n` +
      `*Company Office (Static):* ${currentOffice.name}\n` +
      `*Office Address:* ${currentOffice.address}\n` +
      `*Schedule:* ${scheduledDate} at ${scheduledTime}\n` +
      `*Employees Count:* ${requiredCount} Employees\n` +
      `--------------------------------\n` +
      `*Employee Roster:*\n${empDetails}\n` +
      `--------------------------------\n` +
      `*Trip Fare:* ₹${tripFare.toLocaleString('en-IN')}\n` +
      `*Platform Fee:* ₹10\n` +
      `*Driver Payout:* ₹${driverPayable.toLocaleString('en-IN')}\n` +
      `Atharva Travels B2B Command`
    )
  }

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getShareText())
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
  }

  const handleShareGmail = () => {
    const subject = encodeURIComponent(`ETS Shift Manifest - ${currentOffice.name} (${shiftType})`)
    const body = encodeURIComponent(getShareText())
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, '_blank')
  }

  const handleDownloadManifest = () => {
    const text = getShareText().replace(/\*/g, '')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ETS-Manifest-${shiftType}-${scheduledDate}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success('ETS Manifest downloaded!')
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          activeView === 'HUB'
            ? 'Employee Transport Services (ETS)'
            : activeView === 'CREATE_TRIP'
            ? 'Create ETS Trip (Sedan 3-seater / SUV 6-seater)'
            : activeView === 'EMPLOYEE_LOG'
            ? 'ETS Employee Log & Directory'
            : 'ETS Shift Routing & Compliance Rules'
        }
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {activeView !== 'HUB' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (activeView === 'CREATE_TRIP' && step > 1) {
                      setStep((prev) => Math.max(prev - 1, 1) as 1 | 2 | 3 | 4)
                    } else {
                      setActiveView('HUB')
                    }
                  }}
                  className="btn-secondary text-sm flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{activeView === 'CREATE_TRIP' && step > 1 ? 'Back' : 'Back to ETS Options'}</span>
                </button>
              ) : (
                <div />
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-slate-500 hover:text-slate-700 font-medium"
              >
                Close
              </button>

              {/* View = HUB: no forward button needed */}
              {activeView === 'HUB' && null}

              {/* View = EMPLOYEE_LOG or ROUTING_RULES: shortcut to Create a Trip */}
              {(activeView === 'EMPLOYEE_LOG' || activeView === 'ROUTING_RULES') && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('CREATE_TRIP')
                    setStep(1)
                  }}
                  className="btn-accent text-sm flex items-center gap-1.5 font-semibold shadow-sm"
                >
                  <Car className="w-4 h-4" />
                  <span>Create a Trip</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {/* View = CREATE_TRIP steps */}
              {activeView === 'CREATE_TRIP' && step === 1 && (
                <button
                  type="button"
                  disabled={!vehicleChoice}
                  onClick={() => setStep(2)}
                  className="btn-accent text-sm flex items-center gap-1.5 font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>
                    {!vehicleChoice
                      ? 'Select Vehicle to Continue'
                      : vehicleChoice === 'SEDAN'
                      ? 'Continue with Sedan (3 Employees)'
                      : 'Continue with SUV (6 Employees)'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {activeView === 'CREATE_TRIP' && step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn-accent text-sm flex items-center gap-1.5 font-semibold shadow-sm"
                >
                  <span>Continue to Employee Roster ({vehicleChoice === 'SUV' ? '6' : '3'})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {activeView === 'CREATE_TRIP' && step === 3 && (
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep3()) {
                      setStep(4)
                    }
                  }}
                  className="btn-accent text-sm flex items-center gap-1.5 font-semibold shadow-sm"
                >
                  <span>Review ETS Shift Manifest</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {activeView === 'CREATE_TRIP' && step === 4 && (
                <button
                  type="button"
                  disabled={!isBalanceSufficient || createTripMutation.isPending}
                  onClick={() => createTripMutation.mutate()}
                  className="btn-accent text-sm flex items-center gap-1.5 font-semibold shadow-sm disabled:opacity-50"
                >
                  {createTripMutation.isPending ? (
                    <span>Dispatching ETS Shift...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm & Book ETS Shift</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* ======================================================== */}
          {/* VIEW: HUB (3 MAIN OPTIONS: CREATE TRIP, EMPLOYEE LOG, ROUTING RULES) */}
          {/* ======================================================== */}
          {activeView === 'HUB' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 border border-sky-100 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-sky-900 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Employee Transport Services (ETS) Operations
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Dedicated corporate shuttle command for Atharva Travels. Choose an action below to dispatch shifts, manage your corporate passenger logs, or review routing standards:
                  </p>
                </div>
              </div>

              {/* 3 Prominent Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Option 1: Create a Trip */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('CREATE_TRIP')
                    setStep(1)
                  }}
                  className="group p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-sky-600 hover:shadow-lg transition-all duration-200 text-left flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Car className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                        Dispatch
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 group-hover:text-sky-900 transition-colors">
                      Create a Trip
                    </h4>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      Dispatch Sedan (3-seater) or SUV (6-seater) login/logout shifts with auto-identified employee rosters and geo-coded stops.
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-700">
                    <span>Sedan & SUV Flow</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* Option 2: Employee Log */}
                <button
                  type="button"
                  onClick={() => setActiveView('EMPLOYEE_LOG')}
                  className="group p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-emerald-600 hover:shadow-lg transition-all duration-200 text-left flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Directory
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
                      Employee Log
                    </h4>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      View and manage registered corporate employees, phone numbers, department rosters, registered home addresses, and GPS coordinates.
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                    <span>{directory.length} Employees Logged</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* Option 3: Routing Rules */}
                <button
                  type="button"
                  onClick={() => setActiveView('ROUTING_RULES')}
                  className="group p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-amber-600 hover:shadow-lg transition-all duration-200 text-left flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        Compliance
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 group-hover:text-amber-900 transition-colors">
                      Routing Rules
                    </h4>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      Inspect shift escort rules, mandatory night safety for women, maximum 60-minute commute limits, and geofence cluster guidelines.
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-800">
                    <span>Safety Standards</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: EMPLOYEE LOG (DIRECTORY & GEO-CODES) */}
          {/* ======================================================== */}
          {activeView === 'EMPLOYEE_LOG' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-700" />
                    <span>Corporate Employee Roster & Log</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Saved employee records used for instant auto-identification when booking shifts.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewEmp(!isAddingNewEmp)}
                    className="btn-secondary text-xs flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingNewEmp ? 'Cancel' : 'Add Employee'}</span>
                  </button>
                </div>
              </div>

              {/* Inline Add Employee Form */}
              {isAddingNewEmp && (
                <form
                  onSubmit={handleAddNewEmployeeFromLog}
                  className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-emerald-700" />
                      <span>New Corporate Employee Profile</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Meera Iyer"
                        value={newEmpName}
                        onChange={(e) => setNewEmpName(e.target.value)}
                        className="input text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Phone Number *</label>
                      <input
                        type="text"
                        placeholder="+91 98765 00000"
                        value={newEmpPhone}
                        onChange={(e) => setNewEmpPhone(e.target.value)}
                        className="input text-xs font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Company Office *</label>
                      <select
                        value={newEmpCompany}
                        onChange={(e) => setNewEmpCompany(e.target.value)}
                        className="input text-xs"
                      >
                        {CORPORATE_OFFICES.map((off) => (
                          <option key={off.id} value={off.name}>
                            {off.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Home Address *</label>
                    <input
                      type="text"
                      placeholder="Flat, Building, Street, Bengaluru"
                      value={newEmpAddress}
                      onChange={(e) => setNewEmpAddress(e.target.value)}
                      className="input text-xs"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Latitude</label>
                      <input
                        type="text"
                        value={newEmpLat}
                        onChange={(e) => setNewEmpLat(e.target.value)}
                        className="input text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Longitude</label>
                      <input
                        type="text"
                        value={newEmpLng}
                        onChange={(e) => setNewEmpLng(e.target.value)}
                        className="input text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button type="submit" className="btn-accent text-xs font-semibold py-1.5 px-4">
                      Save Employee Profile
                    </button>
                  </div>
                </form>
              )}

              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search employees by name, phone, department, or company..."
                  value={logFilterQuery}
                  onChange={(e) => setLogFilterQuery(e.target.value)}
                  className="input text-xs pl-8"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Employee Directory List */}
              <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
                {filteredLogEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {emp.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs text-slate-900 truncate">{emp.name}</p>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {emp.department || 'Operations'}
                          </span>
                          <span className="text-[9px] font-bold text-emerald-700 flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Verified</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{emp.phone}</p>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">{emp.address}</p>
                      </div>
                    </div>

                    <div className="text-right sm:self-center flex-shrink-0">
                      <span className="text-[10px] font-semibold text-slate-700 block truncate max-w-[160px]">
                        {emp.company}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                        Geo: {emp.lat.toFixed(4)}, {emp.lng.toFixed(4)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: ROUTING RULES (COMPLIANCE, WOMEN NIGHT ESCORT, MAX DURATION) */}
          {/* ======================================================== */}
          {activeView === 'ROUTING_RULES' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="pb-2 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>ETS Corporate Shift Routing & Safety Compliance Rules</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated checks enforced on every employee transport shift across Bangalore.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Rule 1: Night Shift Escort */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      <span>1. Female Night Escort Rule</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                      Mandatory Policy
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Under Karnataka transport regulations, every shift cab operating between <strong>20:00 - 06:00</strong> carrying female employees must have an authorized security escort guard. A female employee must never be the first pickup or last drop without an escort.
                  </p>
                </div>

                {/* Rule 2: Commute Time Cap */}
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-700" />
                      <span>2. Maximum 60-Minute Transit Cap</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-200 text-sky-900">
                      Fatigue Prevention
                    </span>
                  </div>
                  <p className="text-xs text-sky-900 leading-relaxed">
                    No individual employee should spend more than <strong>60 minutes</strong> inside the vehicle during login or logout shifts. Routes exceeding 60 minutes are automatically flagged for splitting.
                  </p>
                </div>

                {/* Rule 3: Cluster Radius */}
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-indigo-700" />
                      <span>3. Geo-Fence Cluster (8 km Radius)</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900">
                      Route Efficiency
                    </span>
                  </div>
                  <p className="text-xs text-indigo-900 leading-relaxed">
                    All employee pickups in a <strong>Sedan (3 passengers)</strong> or <strong>SUV (6 passengers)</strong> must fall within an 8 km geographical cluster radius to ensure minimum circuitous detours.
                  </p>
                </div>

                {/* Rule 4: Driver & Fleet Safety */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>4. Fleet Telemetry & SOS Emergency</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                      Active Telemetry
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    Every assigned cab is equipped with live GPS tracking, speed governors capped at 60 km/h, verified panic buttons, and automated emergency alert dispatch to Atharva Travels operations command.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: CREATE_TRIP (CONNECTED TO SEDAN & SUV FLOW) */}
          {/* ======================================================== */}
          {activeView === 'CREATE_TRIP' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Step Progress Indicator */}
              <div className="flex items-center justify-between relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-sky-100 -translate-y-1/2 z-0" />
                {[
                  { num: 1, label: 'Vehicle' },
                  { num: 2, label: 'Shift & Office' },
                  { num: 3, label: 'Employees & Geo-code' },
                  { num: 4, label: 'Manifest & Book' },
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

              {/* STEP 1: VEHICLE & CAPACITY (SEDAN 3 SEATER vs SUV 6 SEATER) */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      1. Select ETS Vehicle & Employee Capacity
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Choose between Sedan (3 employees) or SUV (6 employees) for corporate employee transport
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Sedan Card */}
                    <button
                      type="button"
                      onClick={() => setVehicleChoice('SEDAN')}
                      className={`p-5 rounded-2xl border-2 text-left flex flex-col justify-between transition-all duration-200 ${
                        vehicleChoice === 'SEDAN'
                          ? 'border-sky-600 bg-sky-50/80 shadow-md ring-2 ring-sky-500/20'
                          : 'border-slate-200 bg-white hover:border-sky-300 hover:shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
                            <Car className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                            3 Employees
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900">Sedan (3-Seater)</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Designed for 3 corporate passengers with individual front & rear seating comfort.
                        </p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-sky-100/80 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">Capacity: 3 Employee Slots</span>
                        <span className="font-bold text-sky-900">₹1,500 fixed</span>
                      </div>
                    </button>

                    {/* SUV Card */}
                    <button
                      type="button"
                      onClick={() => setVehicleChoice('SUV')}
                      className={`p-5 rounded-2xl border-2 text-left flex flex-col justify-between transition-all duration-200 ${
                        vehicleChoice === 'SUV'
                          ? 'border-sky-600 bg-sky-50/80 shadow-md ring-2 ring-sky-500/20'
                          : 'border-slate-200 bg-white hover:border-sky-300 hover:shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                            <Users className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                            6 Employees
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900">SUV (6-Seater)</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          High-capacity 6+1/7+1 vehicle for larger team shifts, multi-point routes and airport rosters.
                        </p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-indigo-100/80 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">Capacity: 6 Employee Slots</span>
                        <span className="font-bold text-sky-900">₹2,400 fixed</span>
                      </div>
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">ETS Compliance Standard:</span> Vehicles adhere to Karnataka transport safety rules, GPS tracking, panic buttons, and automated shift escort compliance.
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: SHIFT DIRECTION (LOGIN vs LOGOUT) & COMPANY OFFICE */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      2. Select Shift Direction & Corporate Office
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      In Login, Company Office is static drop. In Logout, Company Office is static pickup.
                    </p>
                  </div>

                  {/* Shift Direction Toggle */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-2">
                      Shift Direction *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShiftType('LOGIN')
                          setScheduledTime('08:30')
                        }}
                        className={`p-4 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${
                          shiftType === 'LOGIN'
                            ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">LOGIN Shift</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Home Pickups (Dynamic) → Office (Static Drop)
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShiftType('LOGOUT')
                          setScheduledTime('18:30')
                        }}
                        className={`p-4 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${
                          shiftType === 'LOGOUT'
                            ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                          <Navigation className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">LOGOUT Shift</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Office (Static Pickup) → Home Drops (Dynamic)
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Static Company Office Selection */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-sky-800" />
                        <span>
                          Static Company Office ({shiftType === 'LOGIN' ? 'Destination / Drop' : 'Origin / Pickup'}) *
                        </span>
                      </label>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                        Static Landmark
                      </span>
                    </div>

                    <select
                      value={selectedOfficeId}
                      onChange={(e) => setSelectedOfficeId(e.target.value)}
                      className="input text-xs font-semibold"
                    >
                      {CORPORATE_OFFICES.map((off) => (
                        <option key={off.id} value={off.id}>
                          {off.name} — {off.address.substring(0, 48)}...
                        </option>
                      ))}
                      <option value="custom">+ Custom Client Office Address</option>
                    </select>

                    {selectedOfficeId === 'custom' && (
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <input
                          type="text"
                          placeholder="Company / Campus Name (e.g. Atharva Tech Hub)"
                          value={customOfficeName}
                          onChange={(e) => setCustomOfficeName(e.target.value)}
                          className="input text-xs"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Full Office Address & Landmark"
                            value={customOfficeAddress}
                            onChange={(e) => setCustomOfficeAddress(e.target.value)}
                            className="input text-xs flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => setMapPickerSlotIndex(-1)}
                            className="btn-secondary text-xs flex items-center gap-1 whitespace-nowrap"
                          >
                            <MapPin className="w-3.5 h-3.5 text-sky-700" />
                            <span>Pin Office</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-1">
                      <MapPin className="w-3 h-3 text-sky-700 flex-shrink-0" />
                      <span className="truncate">{currentOffice.address}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({currentOffice.lat.toFixed(4)}, {currentOffice.lng.toFixed(4)})
                      </span>
                    </div>
                  </div>

                  {/* Shift Schedule Timing */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Shift Date *
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="input text-xs pl-8"
                        />
                        <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Shift Time ({shiftType === 'LOGIN' ? 'Pickup Start' : 'Office Departure'}) *
                      </label>
                      <div className="relative">
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="input text-xs pl-8"
                        />
                        <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: EMPLOYEES ROSTER & GEO-CODES (3 FOR SEDAN, 6 FOR SUV) */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        3. Employee Roster ({vehicleChoice === 'SUV' ? '6 Employees (SUV)' : '3 Employees (Sedan)'})
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Type employee name or phone to auto-identify existing corporate profiles, or pick geo-code on map.
                      </p>
                    </div>
                    <div className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                      <span>Smart Auto-ID Active</span>
                    </div>
                  </div>

                  {/* Dynamic Employee Slots */}
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                    {employees.slice(0, vehicleChoice === 'SUV' ? 6 : 3).map((emp, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border transition-all ${
                          emp.isIdentified
                            ? 'bg-emerald-50/50 border-emerald-200 ring-1 ring-emerald-400/30'
                            : 'bg-white border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-sky-900 text-white font-bold text-xs flex items-center justify-center">
                              {idx + 1}
                            </div>
                            <span className="text-xs font-bold text-slate-800">
                              Employee #{idx + 1} {idx === 0 && '(Lead Passenger)'}
                            </span>
                          </div>

                          {emp.isIdentified ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Identified Corporate Employee</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              Auto-matches as you type
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                          {/* Name with Auto-Identify dropdown */}
                          <div className="relative">
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                              Employee Full Name *
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="e.g. Rahul Sharma"
                                value={emp.name}
                                onChange={(e) => {
                                  updateEmployeeField(idx, 'name', e.target.value)
                                  setActiveSearchSlot(idx)
                                  setEmployeeSearchQuery(e.target.value)
                                }}
                                onFocus={() => {
                                  setActiveSearchSlot(idx)
                                  setEmployeeSearchQuery(emp.name)
                                }}
                                className="input text-xs pl-7"
                              />
                              <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            </div>

                            {/* Suggestions Dropdown for Auto-Identification */}
                            {activeSearchSlot === idx && suggestions.length > 0 && (
                              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-sky-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in">
                                <div className="px-3 py-1.5 bg-sky-50 text-[10px] font-bold text-sky-800 flex items-center justify-between border-b border-sky-100">
                                  <span>Matching Employees Found</span>
                                  <span className="text-[9px] font-normal text-sky-600">Click to autofill</span>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                  {suggestions.map((sug) => (
                                    <button
                                      key={sug.id}
                                      type="button"
                                      onClick={() => handleSelectEmployee(idx, sug)}
                                      className="w-full text-left px-3 py-2 hover:bg-sky-50/80 transition-colors border-b border-slate-100 last:border-b-0 flex items-start gap-2"
                                    >
                                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-bold text-slate-900 truncate">
                                            {sug.name}
                                          </span>
                                          <span className="text-[10px] text-slate-500 font-mono">
                                            {sug.phone}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                          {sug.address}
                                        </p>
                                        <p className="text-[9px] text-emerald-700 font-mono mt-0.5">
                                          Geo: {sug.lat}, {sug.lng}
                                        </p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Phone Number */}
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                              Contact Phone Number *
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="+91 98765 43210"
                                value={emp.phone}
                                onChange={(e) => {
                                  updateEmployeeField(idx, 'phone', e.target.value)
                                  if (!emp.name) {
                                    setActiveSearchSlot(idx)
                                    setEmployeeSearchQuery(e.target.value)
                                  }
                                }}
                                className="input text-xs pl-7 font-mono"
                              />
                              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            </div>
                          </div>
                        </div>

                        {/* Dynamic Address & Geo-Code */}
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-sky-700" />
                              <span>
                                {shiftType === 'LOGIN' ? 'Home Pickup Address' : 'Home Drop Address'} *
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setMapPickerSlotIndex(idx)}
                              className="text-[11px] font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1"
                            >
                              <Compass className="w-3.5 h-3.5 text-sky-600" />
                              <span>Pick & Geo-code on Map</span>
                            </button>
                          </div>

                          <input
                            type="text"
                            placeholder="House / Flat No, Street, Apartment, Area, Bengaluru"
                            value={emp.address}
                            onChange={(e) => updateEmployeeField(idx, 'address', e.target.value)}
                            className="input text-xs"
                          />

                          {/* Explicit Geo-Code Inputs */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-0.5">
                                <span>Latitude:</span>
                              </div>
                              <input
                                type="number"
                                step="0.0001"
                                placeholder="12.9298"
                                value={emp.lat}
                                onChange={(e) => updateEmployeeField(idx, 'lat', e.target.value)}
                                className="input text-xs font-mono py-1"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-0.5">
                                <span>Longitude:</span>
                              </div>
                              <input
                                type="number"
                                step="0.0001"
                                placeholder="77.6743"
                                value={emp.lng}
                                onChange={(e) => updateEmployeeField(idx, 'lng', e.target.value)}
                                className="input text-xs font-mono py-1"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW & CONFIRM ETS SHIFT TRIP */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        4. Review ETS Shift Manifest & Booking Confirmation
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Verify route manifest, employee roster, and wallet escrow deduction
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Total Shift Fare</span>
                      <p className="text-xl font-extrabold text-sky-900">{formatCurrency(tripFare)}</p>
                    </div>
                  </div>

                  {/* Route & Shift Overview Card */}
                  <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Vehicle Model</span>
                        <p className="font-bold text-slate-900">
                          {vehicleChoice === 'SUV' ? 'SUV (6-Seater)' : 'Sedan (3-Seater)'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Shift Direction</span>
                        <p className="font-bold text-sky-900">
                          {shiftType === 'LOGIN' ? 'Morning LOGIN' : 'Evening LOGOUT'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Schedule</span>
                        <p className="font-bold text-slate-900">
                          {scheduledDate} @ {scheduledTime}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Passengers</span>
                        <p className="font-bold text-emerald-800">
                          {vehicleChoice === 'SUV' ? '6 Employees' : '3 Employees'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-sky-100 text-xs">
                      <div className="flex items-start gap-2">
                        <Building2 className="w-4 h-4 text-sky-800 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-900">
                            Static Company Office ({shiftType === 'LOGIN' ? 'Destination' : 'Origin'}):
                          </span>
                          <p className="text-slate-600 mt-0.5">
                            {currentOffice.name} — {currentOffice.address}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Employee Roster Manifest List */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Passenger Manifest ({vehicleChoice === 'SUV' ? '6' : '3'} Employees)
                    </label>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {employees.slice(0, vehicleChoice === 'SUV' ? 6 : 3).map((emp, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">
                                {emp.name} <span className="font-normal text-slate-500">({emp.phone})</span>
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">{emp.address}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <span className="text-[10px] font-mono text-slate-500 block">
                              {emp.lat ? `${Number(emp.lat).toFixed(4)}, ${Number(emp.lng).toFixed(4)}` : 'No Geo'}
                            </span>
                            {emp.isIdentified && (
                              <span className="text-[9px] font-bold text-emerald-700">Verified ID ✓</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing & Wallet Validation Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Shift Base Trip Fare</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(tripFare)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Platform Fee</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(platformFee)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Convenience Fee (15%)</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(convenienceFee)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                      <span>Driver Payout (Escrow)</span>
                      <span className="font-semibold text-emerald-700">{formatCurrency(driverPayable)}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Available Wallet Balance:</span>
                        <span
                          className={`font-bold ${
                            isBalanceSufficient ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(walletBalance)}
                        </span>
                      </div>

                      {!isBalanceSufficient && (
                        <button
                          type="button"
                          onClick={onOpenRechargeModal}
                          className="text-xs font-bold text-sky-800 hover:underline"
                        >
                          + Top-up Wallet
                        </button>
                      )}
                    </div>

                    {!isBalanceSufficient && (
                      <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>
                          Insufficient wallet balance to book this ETS shift ({formatCurrency(walletBalance)} &lt; {formatCurrency(tripFare)}). Please recharge before booking.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons: WhatsApp & Download */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Share WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleShareGmail}
                      className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5 text-sky-600" />
                      <span>Share Email</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadManifest}
                      className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Download Manifest</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Map Picker Modal for precise Geo-coding */}
      {mapPickerSlotIndex !== null && (
        <LocationMapModal
          isOpen={mapPickerSlotIndex !== null}
          onClose={() => setMapPickerSlotIndex(null)}
          title={
            mapPickerSlotIndex === -1
              ? 'Select Custom Company Office on Map'
              : `Select Geo-Code for Employee #${mapPickerSlotIndex + 1}`
          }
          initialAddress={
            mapPickerSlotIndex === -1
              ? customOfficeAddress
              : employees[mapPickerSlotIndex]?.address || ''
          }
          onSelectLocation={(address, lat, lng) => {
            if (mapPickerSlotIndex === -1) {
              setCustomOfficeAddress(address)
              if (lat && lng) setCustomOfficeCoords({ lat, lng })
            } else if (mapPickerSlotIndex >= 0) {
              updateEmployeeField(mapPickerSlotIndex, 'address', address)
              if (lat) updateEmployeeField(mapPickerSlotIndex, 'lat', lat)
              if (lng) updateEmployeeField(mapPickerSlotIndex, 'lng', lng)
            }
            setMapPickerSlotIndex(null)
            toast.success('Address and Geo-code captured!')
          }}
        />
      )}
    </>
  )
}
