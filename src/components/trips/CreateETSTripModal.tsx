import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { LocationMapModal } from './LocationMapModal'
import { vendorApi } from '../../lib/api'
import { formatCurrency } from '../../lib/utils'
import { fetchOSRMRoute, sortStopsFarthestFirst, type LiveShiftCab } from '../../lib/routing'
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
  FileSpreadsheet,
  UploadCloud,
  Trash2,
  X,
  Eye,
  CheckSquare,
  Square,
  Route,
  ExternalLink,
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

const DEFAULT_CORPORATE_EMPLOYEES: CorporateEmployee[] = []

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

export type ETSViewMode = 'HUB' | 'CREATE_TRIP' | 'EMPLOYEE_LOG' | 'ROUTING_RULES'

interface CreateETSTripModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenRechargeModal: () => void
  initialView?: ETSViewMode
}

export const CreateETSTripModal: React.FC<CreateETSTripModalProps> = ({
  isOpen,
  onClose,
  onOpenRechargeModal,
  initialView = 'HUB',
}) => {
  const queryClient = useQueryClient()

  // Top-Level ETS View Mode
  const [activeView, setActiveView] = useState<ETSViewMode>(initialView)

  // Create Trip Step (1: Vehicle, 2: Shift & Office, 3: Employees, 4: Manifest)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Step 1: Vehicle & Capacity (Sedan = 3 employees, SUV = 6 employees)
  const [vehicleChoice, setVehicleChoice] = useState<'SEDAN' | 'SUV' | null>(null)

  // Step 2: Shift Direction (LOGIN vs LOGOUT) & Corporate Landmark
  const [shiftType, setShiftType] = useState<'LOGIN' | 'LOGOUT'>('LOGIN')
  const [companyOfficeAddress, setCompanyOfficeAddress] = useState(CORPORATE_OFFICES[0].address)
  const [companyOfficeCoords, setCompanyOfficeCoords] = useState<{ lat: number; lng: number }>({
    lat: CORPORATE_OFFICES[0].lat,
    lng: CORPORATE_OFFICES[0].lng,
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

  // Checkbox selections for bulk actions in Employee Log
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([])

  // Specific employee inspected in right-side slide drawer
  const [inspectedEmp, setInspectedEmp] = useState<CorporateEmployee | null>(null)
  const drawerMapContainerRef = useRef<HTMLDivElement>(null)
  const drawerMapInstanceRef = useRef<any>(null)

  // Direct Excel upload from Employee Log
  const logFileInputRef = useRef<HTMLInputElement>(null)

  // Load and persist corporate employee directory
  const [directory, setDirectory] = useState<CorporateEmployee[]>(() => {
    try {
      const saved = localStorage.getItem('ETS_SAVED_EMPLOYEES')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed.filter((e) => e && e.id && !e.id.startsWith('emp-10'))
        }
      }
    } catch {}
    return []
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

  // Bulk Excel Upload state for Auto Routing & Employee Log
  const [excelPreviewList, setExcelPreviewList] = useState<CorporateEmployee[]>([])
  const [excelFileName, setExcelFileName] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDownloadTemplate = () => {
    try {
      const sampleData = [
        {
          'Employee Name': 'Ramesh Rao',
          'Contact Number': '+91 98450 12345',
          'Company Office': 'Atharva Tech Hub (Electronic City)',
          'Department': 'Engineering',
          'Home Address': 'Flat 204, Green Glen Layout, Bellandur, Bengaluru',
          'Latitude': 12.9298,
          'Longitude': 77.6743,
        },
        {
          'Employee Name': 'Sneha Hegde',
          'Contact Number': '+91 98451 23456',
          'Company Office': 'Atharva Tech Hub (Electronic City)',
          'Department': 'Operations',
          'Home Address': '#45, 14th Main, HSR Layout Sector 4, Bengaluru',
          'Latitude': 12.911,
          'Longitude': 77.6385,
        },
        {
          'Employee Name': 'Arjun Mehta',
          'Contact Number': '+91 98452 34567',
          'Company Office': 'Atharva Tech Hub (Electronic City)',
          'Department': 'Product',
          'Home Address': 'A-102, Salarpuria Greenage, Bommanahalli, Bengaluru',
          'Latitude': 12.9056,
          'Longitude': 77.6254,
        },
      ]
      const ws = XLSX.utils.json_to_sheet(sampleData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Employees')
      XLSX.writeFile(wb, 'ETS_Employee_Roster_Template.xlsx')
      toast.success('Downloaded Employee Roster Excel Template')
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate template')
    }
  }

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const rawRows = XLSX.utils.sheet_to_json<any>(worksheet)

        if (!rawRows || rawRows.length === 0) {
          toast.error('The uploaded Excel sheet contains no rows')
          return
        }

        const parsed: CorporateEmployee[] = rawRows
          .map((row: any, index: number) => {
            const name =
              row['Employee Name'] ||
              row['employee name'] ||
              row['Name'] ||
              row['name'] ||
              row['Employee'] ||
              `Employee ${index + 1}`

            const phone = String(
              row['Contact Number'] ||
                row['contact number'] ||
                row['Phone'] ||
                row['phone'] ||
                row['Mobile'] ||
                row['mobile'] ||
                ''
            ).trim()

            const address =
              row['Home Address'] ||
              row['home address'] ||
              row['Address'] ||
              row['address'] ||
              row['Location'] ||
              'Bengaluru, Karnataka'

            const company =
              row['Company Office'] ||
              row['company office'] ||
              row['Company'] ||
              row['company'] ||
              currentOffice.name

            const department =
              row['Department'] ||
              row['department'] ||
              row['Dept'] ||
              'Operations'

            const lat =
              Number(row['Latitude'] || row['latitude'] || row['Lat'] || row['lat']) ||
              12.9716

            const lng =
              Number(row['Longitude'] || row['longitude'] || row['Lng'] || row['lng'] || row['Long']) ||
              77.5946

            return {
              id: `emp-excel-${Date.now()}-${index}`,
              name: String(name).trim(),
              phone: String(phone).trim(),
              address: String(address).trim(),
              company: String(company).trim(),
              department: String(department).trim(),
              lat,
              lng,
            }
          })
          .filter((emp) => emp.name.length > 0)

        setExcelPreviewList(parsed)
        setExcelFileName(file.name)
        toast.success(`Parsed ${parsed.length} employee records from ${file.name}`)
      } catch (err) {
        console.error(err)
        toast.error('Failed to parse Excel file. Please use a valid .xlsx, .xls, or .csv file.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleCommitExcelUpload = () => {
    if (excelPreviewList.length === 0) {
      toast.error('Please upload an employee Excel file first')
      return
    }

    setDirectory((prev) => {
      const existingPhones = new Set(prev.map((e) => e.phone.replace(/\D/g, '')).filter(Boolean))
      const existingNames = new Set(prev.map((e) => e.name.toLowerCase().trim()))

      const toAdd = excelPreviewList.filter(
        (e) =>
          (!e.phone || !existingPhones.has(e.phone.replace(/\D/g, ''))) &&
          !existingNames.has(e.name.toLowerCase().trim())
      )

      const updated = [...toAdd, ...prev]
      try {
        localStorage.setItem('ETS_SAVED_EMPLOYEES', JSON.stringify(updated))
      } catch {}

      toast.success(`Successfully uploaded and saved ${toAdd.length} employees to Employee Log!`)
      return updated
    })

    setExcelPreviewList([])
    setExcelFileName('')
    setActiveView('EMPLOYEE_LOG')
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
      setActiveView(initialView)
      setStep(1)
      setVehicleChoice(null)
      setShiftType('LOGIN')
      setScheduledTime('08:30')
      setCompanyOfficeAddress(CORPORATE_OFFICES[0].address)
      setCompanyOfficeCoords({ lat: CORPORATE_OFFICES[0].lat, lng: CORPORATE_OFFICES[0].lng })
      setEmployees([
        { name: '', phone: '', address: '', lat: '', lng: '' },
        { name: '', phone: '', address: '', lat: '', lng: '' },
        { name: '', phone: '', address: '', lat: '', lng: '' },
      ])
    }
  }, [isOpen, initialView])

  // Get active office details
  const currentOffice = useMemo(() => {
    const matched = CORPORATE_OFFICES.find(
      (o) => o.address.toLowerCase() === companyOfficeAddress.toLowerCase()
    )
    const name = matched
      ? matched.name
      : companyOfficeAddress.split(',')[0]?.trim() || 'Company Office'
    return {
      name,
      address: companyOfficeAddress.trim(),
      lat: companyOfficeCoords.lat,
      lng: companyOfficeCoords.lng,
    }
  }, [companyOfficeAddress, companyOfficeCoords])

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
  // Wallet option is frozen across portal - direct billing active without wallet requirement
  const isBalanceSufficient = true

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

  // Initialize and render Leaflet Map in Employee Details Slide Drawer
  useEffect(() => {
    if (!inspectedEmp) {
      if (drawerMapInstanceRef.current) {
        drawerMapInstanceRef.current.remove()
        drawerMapInstanceRef.current = null
      }
      return
    }

    const timer = setTimeout(() => {
      const L = (window as any).L
      if (!L || !drawerMapContainerRef.current) return

      if (drawerMapInstanceRef.current) {
        drawerMapInstanceRef.current.remove()
        drawerMapInstanceRef.current = null
      }

      const map = L.map(drawerMapContainerRef.current).setView([inspectedEmp.lat, inspectedEmp.lng], 13)
      drawerMapInstanceRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      // Employee Marker (Car Icon)
      const empIcon = L.divIcon({
        className: 'custom-emp-icon',
        html: `
          <div style="background-color: #059669; color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 2px solid white;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
      const empMarker = L.marker([inspectedEmp.lat, inspectedEmp.lng], { icon: empIcon }).addTo(map)
      empMarker.bindPopup(`<b>${inspectedEmp.name}</b><br/>${inspectedEmp.address}`).openPopup()

      // Target Corporate Office Hub Marker
      const matchedOffice = CORPORATE_OFFICES.find(
        (o) => o.name.toLowerCase() === (inspectedEmp.company || '').toLowerCase()
      ) || CORPORATE_OFFICES[0]

      const officeIcon = L.divIcon({
        className: 'custom-hub-icon',
        html: `
          <div style="background-color: #0f172a; color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 2px solid #38bdf8;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
      const officeMarker = L.marker([matchedOffice.lat, matchedOffice.lng], { icon: officeIcon }).addTo(map)
      officeMarker.bindPopup(`<b>${matchedOffice.name}</b><br/>${matchedOffice.address}`)

      // Real road route to corporate office using OSRM
      fetchOSRMRoute([
        { lat: inspectedEmp.lat, lng: inspectedEmp.lng },
        { lat: matchedOffice.lat, lng: matchedOffice.lng },
      ]).then((roadCoords) => {
        if (!drawerMapInstanceRef.current) return
        const polyline = L.polyline(roadCoords, {
          color: '#0284c7',
          weight: 4,
          opacity: 0.85,
        }).addTo(map)
        map.fitBounds(polyline.getBounds(), { padding: [35, 35] })
      })
    }, 150)

    return () => clearTimeout(timer)
  }, [inspectedEmp])

  // Toggle selection for an employee
  const toggleSelectEmp = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedEmpIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  // Toggle select all employees in current filtered log
  const toggleSelectAll = () => {
    if (selectedEmpIds.length === filteredLogEmployees.length && filteredLogEmployees.length > 0) {
      setSelectedEmpIds([])
    } else {
      setSelectedEmpIds(filteredLogEmployees.map((e) => e.id))
    }
  }

  // Delete Individual Employee (Normal Delete)
  const handleDeleteEmployee = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setDirectory((prev) => {
      const updated = prev.filter((emp) => emp.id !== id)
      try {
        localStorage.setItem('ETS_SAVED_EMPLOYEES', JSON.stringify(updated))
      } catch {}
      return updated
    })
    setSelectedEmpIds((prev) => prev.filter((x) => x !== id))
    if (inspectedEmp?.id === id) setInspectedEmp(null)
    toast.success('Employee removed from log')
  }

  // Bulk Delete Selected Employees
  const handleBulkDelete = () => {
    if (selectedEmpIds.length === 0) return
    const count = selectedEmpIds.length
    setDirectory((prev) => {
      const selectedSet = new Set(selectedEmpIds)
      const updated = prev.filter((emp) => !selectedSet.has(emp.id))
      try {
        localStorage.setItem('ETS_SAVED_EMPLOYEES', JSON.stringify(updated))
      } catch {}
      return updated
    })
    setSelectedEmpIds([])
    if (inspectedEmp && selectedEmpIds.includes(inspectedEmp.id)) setInspectedEmp(null)
    toast.success(`${count} employees deleted from log`)
  }

  // Auto Routing based on employee routes / locations
  const handleAutoRoute = (targetEmployees?: CorporateEmployee[]) => {
    const empsToRoute = targetEmployees || directory.filter((e) => selectedEmpIds.includes(e.id))
    if (empsToRoute.length === 0) {
      toast.error('Please select at least 1 employee to auto route')
      return
    }

    // 1. Sort by optimal pickup distance from office hub (farthest first, nearest last)
    const sorted = sortStopsFarthestFirst(empsToRoute, companyOfficeCoords)

    const capacity = sorted.length <= 3 ? 3 : 6
    const chosenVehicle: 'SEDAN' | 'SUV' = sorted.length <= 3 ? 'SEDAN' : 'SUV'
    setVehicleChoice(chosenVehicle)

    const routedSlice = sorted.slice(0, capacity)
    const slots: EmployeeSlot[] = routedSlice.map((e) => ({
      name: e.name,
      phone: e.phone,
      address: e.address,
      lat: e.lat,
      lng: e.lng,
      company: e.company,
      isIdentified: true,
    }))

    while (slots.length < capacity) {
      slots.push({ name: '', phone: '', address: '', lat: '', lng: '' })
    }

    setEmployees(slots)
    setActiveView('CREATE_TRIP')
    setStep(3)
    toast.success(`Auto-routed ${routedSlice.length} employees into ${chosenVehicle} shift!`)
  }

  // Manual Routing based on location
  const handleManualRoute = (targetEmployees?: CorporateEmployee[]) => {
    const empsToRoute = targetEmployees || directory.filter((e) => selectedEmpIds.includes(e.id))
    if (empsToRoute.length === 0) {
      toast.error('Please select at least 1 employee for manual routing')
      return
    }

    const capacity = empsToRoute.length <= 3 ? 3 : 6
    const chosenVehicle: 'SEDAN' | 'SUV' = empsToRoute.length <= 3 ? 'SEDAN' : 'SUV'
    setVehicleChoice(chosenVehicle)

    const slots: EmployeeSlot[] = empsToRoute.slice(0, capacity).map((e) => ({
      name: e.name,
      phone: e.phone,
      address: e.address,
      lat: e.lat,
      lng: e.lng,
      company: e.company,
      isIdentified: true,
    }))

    while (slots.length < capacity) {
      slots.push({ name: '', phone: '', address: '', lat: '', lng: '' })
    }

    setEmployees(slots)
    setActiveView('CREATE_TRIP')
    setStep(1)
    toast.success(`Loaded ${Math.min(empsToRoute.length, capacity)} employees for manual route setup`)
  }

  // Direct Excel upload from Employee Log view
  const handleLogExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws)

        if (!data || data.length === 0) {
          toast.error('The selected Excel file contains no records')
          return
        }

        const parsed: CorporateEmployee[] = data
          .map((row, index) => {
            const name =
              row['Employee Name'] || row['Name'] || row['employee_name'] || row['name'] || `Employee ${index + 1}`
            const phone =
              row['Contact Number'] || row['Phone'] || row['phone'] || row['Mobile'] || '+91 98000 00000'
            const address =
              row['Home Address'] || row['Address'] || row['address'] || 'Bengaluru, Karnataka'
            const company =
              row['Company Office'] || row['Company'] || row['company'] || currentOffice.name
            const department =
              row['Department'] || row['department'] || row['Dept'] || 'Operations'
            const lat =
              Number(row['Latitude'] || row['latitude'] || row['Lat'] || row['lat']) || 12.9716
            const lng =
              Number(row['Longitude'] || row['longitude'] || row['Lng'] || row['lng'] || row['Long']) || 77.5946

            return {
              id: `emp-excel-${Date.now()}-${index}`,
              name: String(name).trim(),
              phone: String(phone).trim(),
              address: String(address).trim(),
              company: String(company).trim(),
              department: String(department).trim(),
              lat,
              lng,
            }
          })
          .filter((emp) => emp.name.length > 0)

        setDirectory((prev) => {
          const existingPhones = new Set(prev.map((e) => e.phone.replace(/\D/g, '')).filter(Boolean))
          const existingNames = new Set(prev.map((e) => e.name.toLowerCase().trim()))

          const toAdd = parsed.filter(
            (e) =>
              (!e.phone || !existingPhones.has(e.phone.replace(/\D/g, ''))) &&
              !existingNames.has(e.name.toLowerCase().trim())
          )

          const updated = [...toAdd, ...prev]
          try {
            localStorage.setItem('ETS_SAVED_EMPLOYEES', JSON.stringify(updated))
          } catch {}

          toast.success(`Imported ${toAdd.length} employees directly into Employee Log!`)
          return updated
        })
      } catch (err) {
        console.error(err)
        toast.error('Failed to parse Excel file. Please use a valid .xlsx, .xls, or .csv file.')
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

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
      // Save newly dispatched shift to ETS_DISPATCHED_SHIFTS so it appears in ETS Dashboard
      try {
        const requiredCount = vehicleChoice === 'SUV' ? 6 : 3
        const activeEmployees = employees.slice(0, requiredCount)

        // Sort active employees: Farthest from office hub is picked up first, nearest is picked up last
        const orderedStops = sortStopsFarthestFirst(
          activeEmployees.map((emp) => ({
            name: emp.name,
            address: emp.address,
            lat: Number(emp.lat) || 12.95,
            lng: Number(emp.lng) || 77.65,
            status: 'PENDING' as const,
          })),
          companyOfficeCoords
        )

        const driverHome = {
          lat: companyOfficeCoords.lat + 0.076,
          lng: companyOfficeCoords.lng - 0.067,
        }

        const newShift: LiveShiftCab = {
          id: `ets-shift-${Date.now()}`,
          shiftCode: `ETS-${Math.floor(100 + Math.random() * 900)}`,
          vehicleType: vehicleChoice === 'SUV' ? 'SUV 6+1' : 'Sedan 4+1',
          seatsUsed: 0,
          capacity: requiredCount,
          shiftType,
          hubName: currentOffice.name,
          hubAddress: currentOffice.address,
          driverName: 'Assigned Driver',
          driverPhone: '+91 98450 00000',
          vehicleNo: vehicleChoice === 'SUV' ? 'KA-04-MK-1192' : 'KA-01-MJ-5821',
          status: 'BOARDING' as const,
          driverHomeCoords: driverHome,
          currentStepIndex: 0,
          currentCoords: driverHome,
          hubCoords: { lat: companyOfficeCoords.lat, lng: companyOfficeCoords.lng },
          stops: orderedStops,
        }
        const existingShifts = JSON.parse(localStorage.getItem('ETS_DISPATCHED_SHIFTS') || '[]')
        const updatedShifts = [newShift, ...existingShifts]
        localStorage.setItem('ETS_DISPATCHED_SHIFTS', JSON.stringify(updatedShifts))
        window.dispatchEvent(new Event('ets_shift_created'))
      } catch {}

      toast.success('ETS Corporate Trip created successfully!')
      queryClient.invalidateQueries({ queryKey: ['trips'] })
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
            : 'Auto Routing'
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

              {/* View = EMPLOYEE_LOG: shortcut to Create a Trip */}
              {activeView === 'EMPLOYEE_LOG' && (
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
                  className="bg-slate-800 hover:bg-slate-900 text-white text-sm flex items-center gap-1.5 font-semibold shadow-sm py-2 px-4 rounded-xl border border-slate-700"
                >
                  <span>Review ETS Shift Manifest</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {activeView === 'CREATE_TRIP' && step === 4 && (
                <button
                  type="button"
                  disabled={createTripMutation.isPending}
                  onClick={() => createTripMutation.mutate()}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-sm flex items-center gap-1.5 font-semibold shadow-sm py-2 px-4 rounded-xl border border-slate-700 disabled:opacity-50"
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
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={logFileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleLogExcelUpload}
                  />
                  <button
                    type="button"
                    onClick={() => logFileInputRef.current?.click()}
                    className="btn-secondary text-xs flex items-center gap-1.5 font-semibold text-emerald-800 border-emerald-200 hover:bg-emerald-50"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Upload</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewEmp(!isAddingNewEmp)}
                    className="btn-secondary text-xs flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingNewEmp ? 'Cancel' : 'Add'}</span>
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

              {/* Search Bar & Bulk Selection Toolbar */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search employees by name, phone, department, or company..."
                      value={logFilterQuery}
                      onChange={(e) => setLogFilterQuery(e.target.value)}
                      className="input text-xs pl-8 w-full"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                  {filteredLogEmployees.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 shrink-0"
                    >
                      {selectedEmpIds.length === filteredLogEmployees.length && filteredLogEmployees.length > 0 ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>
                        {selectedEmpIds.length === filteredLogEmployees.length && filteredLogEmployees.length > 0
                          ? 'Deselect All'
                          : 'Select All'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Bulk Actions Bar when employees are selected */}
                {selectedEmpIds.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 shadow-lg animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 pl-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold font-mono">
                        {selectedEmpIds.length} Selected
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAutoRoute()}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                        title="Auto-route selected employees into optimal shift"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Auto Route ({selectedEmpIds.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleManualRoute()}
                        className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                        title="Manually configure route with selected members"
                      >
                        <Car className="w-3.5 h-3.5" />
                        <span>Manual Route ({selectedEmpIds.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleBulkDelete}
                        className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                        title="Delete selected employees from log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete ({selectedEmpIds.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedEmpIds([])}
                        className="text-xs text-slate-400 hover:text-white px-2 py-1 font-semibold"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Employee Directory List */}
              <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
                {filteredLogEmployees.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No corporate employees in log yet</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                      Click Upload above to import from Excel, or add an employee manually.
                    </p>
                  </div>
                ) : (
                  filteredLogEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => setInspectedEmp(emp)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group ${
                        selectedEmpIds.includes(emp.id)
                          ? 'border-emerald-500 bg-emerald-50/40 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => toggleSelectEmp(emp.id, e)}
                          className="p-1 cursor-pointer text-slate-400 hover:text-emerald-600 transition-colors"
                          title={selectedEmpIds.includes(emp.id) ? 'Deselect employee' : 'Select employee'}
                        >
                          {selectedEmpIds.includes(emp.id) ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>

                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {emp.name.charAt(0)}
                        </div>

                        {/* Details */}
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

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] font-semibold text-slate-700 block truncate max-w-[150px]">
                            {emp.company}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            Geo: {emp.lat.toFixed(4)}, {emp.lng.toFixed(4)}
                          </span>
                        </div>

                        {/* Normal Delete button */}
                        <button
                          type="button"
                          title="Delete employee"
                          onClick={(e) => handleDeleteEmployee(emp.id, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
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
                  <Sliders className="w-4 h-4 text-amber-700" />
                  <span>Auto Routing</span>
                </h3>
              </div>

              {/* Bulk Excel Upload Section for Auto Routing */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <span>Upload Employee Excel for Auto Routing</span>
                  </h4>
                </div>

                {/* File Upload Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/20 hover:bg-amber-50/50 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleExcelUpload}
                  />
                  <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UploadCloud className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Click to browse or drag & drop Employee Excel File
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Supports .xlsx, .xls, and .csv
                    </p>
                  </div>
                </div>

                {/* Save button right after uploading button */}
                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleCommitExcelUpload}
                    className="btn-accent text-xs sm:text-sm font-bold px-6 py-2.5 flex items-center gap-2 shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save{excelPreviewList.length > 0 ? ` (${excelPreviewList.length} Employees)` : ''}</span>
                  </button>
                </div>

                {/* Parsed Excel Records Preview */}
                {excelPreviewList.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-sm animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                        <span className="text-xs font-bold text-slate-900">{excelFileName}</span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                          {excelPreviewList.length} Employees Found
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setExcelPreviewList([])
                          setExcelFileName('')
                        }}
                        className="text-xs text-slate-400 hover:text-rose-600 font-semibold"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-lg text-xs divide-y divide-slate-100">
                      {excelPreviewList.slice(0, 5).map((emp, i) => (
                        <div key={i} className="p-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900">{emp.name}</span>
                            <span className="text-slate-500 font-mono text-[11px] ml-2">{emp.phone}</span>
                            <p className="text-[11px] text-slate-600 truncate">{emp.address}</p>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            ({emp.lat.toFixed(4)}, {emp.lng.toFixed(4)})
                          </span>
                        </div>
                      ))}
                      {excelPreviewList.length > 5 && (
                        <div className="p-1.5 text-center text-[11px] text-slate-500 font-semibold bg-slate-50">
                          + {excelPreviewList.length - 5} more employees in sheet
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setExcelPreviewList([])
                          setExcelFileName('')
                        }}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCommitExcelUpload}
                        className="btn-accent text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save & View in Employee Log ({excelPreviewList.length})</span>
                      </button>
                    </div>
                  </div>
                )}
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

                  {/* Static Company Office Input with Location GMaps Picker */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-sky-800" />
                        <span>
                          Company Office ({shiftType === 'LOGIN' ? 'Destination / Drop' : 'Origin / Pickup'}) *
                        </span>
                      </label>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                        Static Landmark
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter company office address or landmark..."
                        value={companyOfficeAddress}
                        onChange={(e) => setCompanyOfficeAddress(e.target.value)}
                        className="input text-xs pr-10 font-medium text-slate-800 bg-white shadow-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setMapPickerSlotIndex(-1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-sky-600 hover:text-sky-800 hover:bg-sky-50 transition-colors"
                        title="Pick Company Office on Google Maps"
                      >
                        <MapPin className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quick Suggestions for Corporate Hubs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-slate-500">
                      <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">Suggested:</span>
                      {CORPORATE_OFFICES.slice(0, 4).map((off) => (
                        <button
                          key={off.id}
                          type="button"
                          onClick={() => {
                            setCompanyOfficeAddress(off.address)
                            setCompanyOfficeCoords({ lat: off.lat, lng: off.lng })
                          }}
                          className="px-2 py-0.5 rounded-full bg-white border border-slate-200 hover:border-sky-400 text-slate-700 whitespace-nowrap text-[10px] transition-colors"
                        >
                          {off.name.split('(')[0].trim()}
                        </button>
                      ))}
                    </div>

                    {companyOfficeAddress && (
                      <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-0.5">
                        <MapPin className="w-3 h-3 text-sky-700 flex-shrink-0" />
                        <span className="truncate">{companyOfficeAddress}</span>
                        <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                          ({companyOfficeCoords.lat.toFixed(4)}, {companyOfficeCoords.lng.toFixed(4)})
                        </span>
                      </div>
                    )}
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
                        Verify route manifest, employee roster, and corporate billing details
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
                      <span>Driver Payout</span>
                      <span className="font-semibold text-emerald-700">{formatCurrency(driverPayable)}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        Billing: Direct Corporate Invoicing
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200 text-slate-600">
                        Wallet Frozen
                      </span>
                    </div>
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
              ? 'Select Company Office Location on Map'
              : `Select Geo-Code for Employee #${mapPickerSlotIndex + 1}`
          }
          initialAddress={
            mapPickerSlotIndex === -1
              ? companyOfficeAddress
              : employees[mapPickerSlotIndex]?.address || ''
          }
          onSelectLocation={(address, lat, lng) => {
            if (mapPickerSlotIndex === -1) {
              setCompanyOfficeAddress(address)
              if (lat && lng) setCompanyOfficeCoords({ lat, lng })
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
      {/* Right Side Slide Drawer: Full Employee Details + GMaps */}
      {inspectedEmp && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setInspectedEmp(null)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center">
                  {inspectedEmp.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{inspectedEmp.name}</h3>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {inspectedEmp.department || 'Operations'} &bull; {inspectedEmp.company}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectedEmp(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                title="Close Profile"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* GMaps / Leaflet Map Container */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Live GMaps Location & Route</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    {inspectedEmp.lat.toFixed(4)}, {inspectedEmp.lng.toFixed(4)}
                  </span>
                </div>

                <div
                  ref={drawerMapContainerRef}
                  className="w-full h-56 rounded-xl border border-slate-200 shadow-inner z-0"
                  style={{ minHeight: '220px' }}
                />

                <p className="text-[11px] text-slate-500 italic">
                  Pin shows employee pickup location with transit connection to destination office hub.
                </p>
              </div>

              {/* Employee Full Details Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Home Pickup Address</span>
                  <p className="text-xs font-semibold text-slate-900 mt-0.5">{inspectedEmp.address}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Phone Number</span>
                    <a
                      href={`tel:${inspectedEmp.phone}`}
                      className="text-xs font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{inspectedEmp.phone}</span>
                    </a>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Assigned Office</span>
                    <p className="text-xs font-semibold text-slate-900 truncate mt-0.5">{inspectedEmp.company}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Geo Latitude</span>
                    <p className="text-xs font-mono text-slate-700 mt-0.5">{inspectedEmp.lat}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Geo Longitude</span>
                    <p className="text-xs font-mono text-slate-700 mt-0.5">{inspectedEmp.lng}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => handleDeleteEmployee(inspectedEmp.id)}
                className="btn-secondary text-xs text-rose-600 hover:bg-rose-50 border-rose-200 flex items-center gap-1.5 py-2 px-3 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleManualRoute([inspectedEmp])
                    setInspectedEmp(null)
                  }}
                  className="btn-secondary text-xs font-bold px-3 py-2 flex items-center gap-1.5"
                >
                  <Car className="w-3.5 h-3.5 text-sky-600" />
                  <span>Manual Route</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleAutoRoute([inspectedEmp])
                    setInspectedEmp(null)
                  }}
                  className="btn-accent text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto Route</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
