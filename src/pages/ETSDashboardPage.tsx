import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  Car,
  Users,
  ShieldCheck,
  MapPin,
  Navigation,
  Sliders,
  Compass,
  Clock,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Phone,
  ArrowLeft,
  Sparkles,
  X,
  Trash2,
} from 'lucide-react'
import { CreateETSTripModal, CORPORATE_OFFICES } from '../components/trips/CreateETSTripModal'
import { CreateETSTripView, type CorporateEmployee } from '../components/trips/CreateETSTripView'
import { ETSEmployeeLogView } from '../components/trips/ETSEmployeeLogView'
import { SlideDeleteModal } from '../components/ui/SlideDeleteModal'
import { logAuditEvent } from '../lib/auditLogger'
import { formatCurrency } from '../lib/utils'
import { deleteTripFromNeon } from '../lib/neonClient'
import {
  fetchOSRMRoute,
  sortStopsFarthestFirst,
  getShiftStageInfo,
  progressShiftStage,
  buildVehicleHoverCardHtml,
  buildEmployeeHoverCardHtml,
  buildEmployeePinDivIconHtml,
  type LiveShiftCab,
  type ShiftStageInfo,
} from '../lib/routing'
import toast from 'react-hot-toast'

export type { LiveShiftCab }

const DEFAULT_INITIAL_SHIFT: LiveShiftCab = {
  id: 'ets-shift-757',
  shiftCode: 'ETS-757',
  vehicleType: 'Sedan 4+1',
  seatsUsed: 0,
  capacity: 3,
  shiftType: 'LOGIN',
  hubName: 'Atharva Tech Hub (Electronic City)',
  hubAddress: 'Phase 1, Electronic City, Bengaluru, Karnataka 560100',
  driverName: 'Assigned Driver',
  driverPhone: '+91 98450 12345',
  vehicleNo: 'KA-01-MJ-5821',
  status: 'BOARDING',
  currentCoords: { lat: 12.9166, lng: 77.6101 }, // Driver at home (BTM Layout)
  driverHomeCoords: { lat: 12.9166, lng: 77.6101 },
  hubCoords: { lat: 12.8399, lng: 77.6770 }, // Atharva Tech Hub
  currentStepIndex: 0,
  stops: [
    {
      name: 'Employee 1',
      address: 'Outer Ring Rd, Mahadevapura, Bengaluru, Karnataka (18 km from hub)',
      lat: 12.9900,
      lng: 77.7000,
      status: 'PENDING',
    },
    {
      name: 'Employee 2',
      address: 'Bellandur / Sarjapur Rd, Bengaluru, Karnataka (10 km from Employee 1)',
      lat: 12.9250,
      lng: 77.6750,
      status: 'PENDING',
    },
    {
      name: 'Employee 3',
      address: 'Kudlu Gate, Hosur Rd, Bengaluru, Karnataka (Nearest to Tech Hub)',
      lat: 12.8750,
      lng: 77.6500,
      status: 'PENDING',
    },
  ],
}

export const ETSDashboardPage: React.FC = () => {
  const navigate = useNavigate()

  // Real live shifts state from localStorage
  const [liveShifts, setLiveShifts] = useState<LiveShiftCab[]>(() => {
    try {
      const saved = localStorage.getItem('ETS_DISPATCHED_SHIFTS')
      if (saved !== null) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (s) =>
              s &&
              s.id &&
              !s.id.startsWith('shift-1') &&
              !s.id.startsWith('shift-2') &&
              !s.id.startsWith('shift-3') &&
              !s.id.startsWith('shift-4')
          )
        }
      }
    } catch {}
    return []
  })

  // Listen for newly dispatched ETS shifts
  useEffect(() => {
    const handleShiftUpdated = () => {
      try {
        const saved = localStorage.getItem('ETS_DISPATCHED_SHIFTS')
        if (saved !== null) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            const valid = parsed.filter(
              (s) =>
                s &&
                s.id &&
                !s.id.startsWith('shift-1') &&
                !s.id.startsWith('shift-2') &&
                !s.id.startsWith('shift-3') &&
                !s.id.startsWith('shift-4')
            )
            setLiveShifts(valid)
            return
          }
        }
      } catch {}
      setLiveShifts([])
    }
    window.addEventListener('ets_shift_created', handleShiftUpdated)
    window.addEventListener('storage', handleShiftUpdated)
    return () => {
      window.removeEventListener('ets_shift_created', handleShiftUpdated)
      window.removeEventListener('storage', handleShiftUpdated)
    }
  }, [])

  // Modal Control
  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'CREATE_TRIP' | 'EMPLOYEE_LOG'>('DASHBOARD')
  const [prefilledEmployees, setPrefilledEmployees] = useState<CorporateEmployee[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalInitialView, setModalInitialView] = useState<'CREATE_TRIP' | 'EMPLOYEE_LOG' | 'ROUTING_RULES'>('CREATE_TRIP')

  // Map Filter State
  const [shiftFilter, setShiftFilter] = useState<'ALL' | 'LOGIN' | 'LOGOUT'>('ALL')
  const [vehicleFilter, setVehicleFilter] = useState<'ALL' | 'SEDAN' | 'SUV'>('ALL')
  const [selectedShift, setSelectedShift] = useState<LiveShiftCab | null>(null)
  const [selectedShiftForDrawer, setSelectedShiftForDrawer] = useState<LiveShiftCab | null>(null)
  const [deletingShift, setDeletingShift] = useState<LiveShiftCab | null>(null)
  const [showGeofenceClusters, setShowGeofenceClusters] = useState(true)

  const handleConfirmDeleteShift = () => {
    if (!deletingShift) return
    const updated = liveShifts.filter(
      (s) => s.id !== deletingShift.id && s.shiftCode !== deletingShift.shiftCode
    )
    setLiveShifts(updated)
    try {
      localStorage.setItem('ETS_DISPATCHED_SHIFTS', JSON.stringify(updated))
    } catch {
      // ignore
    }

    // Permanently delete from Neon DB so it never comes back
    deleteTripFromNeon(deletingShift.shiftCode).catch((err) =>
      console.warn('Neon DB trip delete notice:', err)
    )
    if (deletingShift.id) {
      deleteTripFromNeon(deletingShift.id).catch((err) =>
        console.warn('Neon DB trip delete notice:', err)
      )
    }

    logAuditEvent({
      action: 'TRIP_DELETED',
      entityType: 'TRIP',
      entityId: deletingShift.id,
      entityTitle: `ETS Shift ${deletingShift.shiftCode}`,
      performedBy: 'Vendor Admin',
      summary: `Deleted ETS shift trip ${deletingShift.shiftCode} for ${deletingShift.hubName}`,
      details: { deleted: deletingShift },
    })

    toast.success(`Shift ${deletingShift.shiftCode} deleted successfully!`)
    setSelectedShiftForDrawer(null)
    setDeletingShift(null)
  }

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersLayerRef = useRef<any>(null)
  const shiftDrawerMapContainerRef = useRef<HTMLDivElement>(null)
  const shiftDrawerMapInstanceRef = useRef<any>(null)

  // Open Modal with specific view
  const openModal = (view: 'CREATE_TRIP' | 'EMPLOYEE_LOG' | 'ROUTING_RULES') => {
    setModalInitialView(view)
    setIsModalOpen(true)
  }

  // Filtered live shifts
  const filteredShifts = liveShifts.filter((shift) => {
    if (shiftFilter !== 'ALL' && shift.shiftType !== shiftFilter) return false
    if (vehicleFilter === 'SEDAN' && !shift.vehicleType.includes('Sedan')) return false
    if (vehicleFilter === 'SUV' && !shift.vehicleType.includes('SUV')) return false
    return true
  })

  // Determine whether a shift is currently active on the road
  const isShiftActive = (shift: LiveShiftCab): boolean => {
    if (shift.status === 'ARRIVED' || shift.status === 'COMPLETED') return false
    const stageInfo = getShiftStageInfo(shift)
    if (stageInfo.stageIndex >= stageInfo.totalStages) return false
    return true
  }

  const activeShifts = filteredShifts.filter(isShiftActive)
  const completedShifts = filteredShifts.filter((s) => !isShiftActive(s))
  const [panelTab, setPanelTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE')

  // Initialize and Render GMaps Leaflet Dashboard
  useEffect(() => {
    const L = (window as any).L
    if (!L || !mapContainerRef.current) return

    if (!mapInstanceRef.current) {
      // Center on Bengaluru Tech Corridor
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
      }).setView([12.95, 77.64], 11)

      // Clean OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors | Atharva Travels ETS',
      }).addTo(map)

      markersLayerRef.current = L.layerGroup().addTo(map)
      mapInstanceRef.current = map
    }

    const map = mapInstanceRef.current
    const layer = markersLayerRef.current
    if (!map || !layer) return

    layer.clearLayers()

    // 1. Render Corporate IT Hubs (Car Marker)
    CORPORATE_OFFICES.forEach((hub) => {
      const hubIcon = L.divIcon({
        className: 'custom-hub-icon',
        html: `
          <div style="background-color: #0f172a; color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 2px solid #38bdf8;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      const marker = L.marker([hub.lat, hub.lng], { icon: hubIcon }).addTo(layer)
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; padding: 4px;">
          <b style="color: #0f172a; font-size: 13px;">${hub.name}</b><br/>
          <span style="color: #64748b;">${hub.address}</span><br/>
          <span style="color: #0284c7; font-weight: bold; font-size: 11px; margin-top: 4px; display: block;">Corporate Client Hub</span>
        </div>
      `)

      // Geofence Circle (8 km Radius)
      if (showGeofenceClusters) {
        L.circle([hub.lat, hub.lng], {
          radius: 8000,
          color: '#38bdf8',
          fillColor: '#bae6fd',
          fillOpacity: 0.08,
          weight: 1.5,
          dashArray: '4, 4',
        }).addTo(layer)
      }
    })

    // 2. Render ONLY Active Shift Cabs and Dynamic Route Paths on the Main Map
    activeShifts.forEach((shift) => {
      const isSedan = shift.vehicleType.includes('Sedan')
      const stageInfo = getShiftStageInfo(shift)

      // Vehicle Marker Icon
      const vehicleIcon = L.divIcon({
        className: 'custom-cab-icon',
        html: `
          <div style="background-color: ${stageInfo.stageIndex >= stageInfo.totalStages ? '#059669' : isSedan ? '#0284c7' : '#4f46e5'}; color: white; padding: 4px 8px; border-radius: 9999px; font-weight: bold; font-size: 11px; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.25); border: 2px solid white; white-space: nowrap; cursor: pointer;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 11 2 11.4V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
            <span>${shift.shiftCode} (${stageInfo.seatsFilled}/${shift.capacity})</span>
          </div>
        `,
        iconSize: [110, 28],
        iconAnchor: [55, 14],
      })

      const cabMarker = L.marker([stageInfo.currentCoords.lat, stageInfo.currentCoords.lng], { icon: vehicleIcon }).addTo(layer)

      // Rich Hover Tooltip for Vehicle & Driver
      const vehicleTooltipHtml = buildVehicleHoverCardHtml(shift, stageInfo)
      cabMarker.bindTooltip(vehicleTooltipHtml, {
        direction: 'top',
        offset: [0, -12],
        className: 'custom-map-dark-tooltip',
        sticky: true,
        opacity: 1,
      })
      cabMarker.bindPopup(vehicleTooltipHtml)

      cabMarker.on('click', () => handleSelectShiftInList(shift))

      // 1. Fetch real road geometry for REMAINING active path and draw dynamic road polyline
      if (stageInfo.remainingWaypoints.length >= 2) {
        fetchOSRMRoute(stageInfo.remainingWaypoints).then((roadCoords) => {
          if (!markersLayerRef.current) return
          L.polyline(roadCoords, {
            color: isSedan ? '#0284c7' : '#6366f1',
            weight: 4,
            opacity: 0.85,
          }).addTo(layer)
        })
      }

      // 2. Render Driver Home / Start Depot Pin if present
      if (shift.driverHomeCoords) {
        const homeMarker = L.circleMarker([shift.driverHomeCoords.lat, shift.driverHomeCoords.lng], {
          radius: 7,
          color: '#334155',
          fillColor: '#64748b',
          fillOpacity: 0.95,
          weight: 2,
        }).addTo(layer)

        const homeTooltipHtml = `
          <div style="font-family: inherit; font-size: 11px; min-width: 180px;">
            <div style="display: flex; align-items: center; gap: 4px; font-weight: bold; color: #f8fafc; margin-bottom: 2px;">
              <span>🏠</span>
              <span>Driver Home Base</span>
            </div>
            <div style="color: #cbd5e1; font-size: 10px;">
              <b>Driver:</b> <span style="color: #ffffff;">${shift.driverName}</span><br/>
              <b>Vehicle:</b> ${shift.vehicleNo}<br/>
              <b>Status:</b> Shift Start & Depot
            </div>
          </div>
        `
        homeMarker.bindTooltip(homeTooltipHtml, {
          direction: 'top',
          className: 'custom-map-dark-tooltip',
          sticky: true,
          opacity: 1,
        })
        homeMarker.bindPopup(homeTooltipHtml)
      }

      // 3. Employee Stop Pins in optimal sequence with explicit Name Badge & Rich Hover Cards
      stageInfo.updatedStops.forEach((stop, i) => {
        const isFarthest = i === 0
        const isNearest = i === stageInfo.updatedStops.length - 1
        const isPicked = stop.status === 'PICKED'
        const isNext = stop.status === 'NEXT'

        const empIcon = L.divIcon({
          className: 'custom-emp-pin-icon',
          html: buildEmployeePinDivIconHtml(stop, i, isPicked, isNext, isFarthest),
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        })

        const stopMarker = L.marker([stop.lat, stop.lng], { icon: empIcon }).addTo(layer)

        const empTooltipHtml = buildEmployeeHoverCardHtml(stop, i, stageInfo.updatedStops.length, shift, stageInfo)
        stopMarker.bindTooltip(empTooltipHtml, {
          direction: 'top',
          offset: [0, -22],
          className: 'custom-map-dark-tooltip',
          sticky: true,
          opacity: 1,
        })
        stopMarker.bindPopup(empTooltipHtml)
      })
    })
  }, [activeShifts, showGeofenceClusters])

  // Initialize and render Leaflet Map in Shift & Hub Details Slide Drawer
  useEffect(() => {
    if (!selectedShiftForDrawer) {
      if (shiftDrawerMapInstanceRef.current) {
        shiftDrawerMapInstanceRef.current.remove()
        shiftDrawerMapInstanceRef.current = null
      }
      return
    }

    const timer = setTimeout(() => {
      const L = (window as any).L
      if (!L || !shiftDrawerMapContainerRef.current) return

      if (shiftDrawerMapInstanceRef.current) {
        shiftDrawerMapInstanceRef.current.remove()
        shiftDrawerMapInstanceRef.current = null
      }

      const shift = selectedShiftForDrawer
      const stageInfo = getShiftStageInfo(shift)

      const map = L.map(shiftDrawerMapContainerRef.current).setView(
        [stageInfo.currentCoords.lat, stageInfo.currentCoords.lng],
        13
      )
      shiftDrawerMapInstanceRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      // Vehicle Marker (Car Icon)
      const carIcon = L.divIcon({
        className: 'custom-cab-icon',
        html: `
          <div style="background-color: ${stageInfo.stageIndex >= stageInfo.totalStages ? '#059669' : '#0284c7'}; color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 2px solid white; cursor: pointer;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
      const vehicleMarker = L.marker([stageInfo.currentCoords.lat, stageInfo.currentCoords.lng], { icon: carIcon }).addTo(map)

      // Rich Hover Tooltip for Vehicle & Driver
      const drawerVehicleTooltipHtml = buildVehicleHoverCardHtml(shift, stageInfo)
      vehicleMarker.bindTooltip(drawerVehicleTooltipHtml, {
        direction: 'top',
        offset: [0, -14],
        className: 'custom-map-dark-tooltip',
        sticky: true,
        opacity: 1,
      })
      vehicleMarker.bindPopup(drawerVehicleTooltipHtml).openPopup()

      // Driver Home Marker if present
      if (shift.driverHomeCoords) {
        const homeMarker = L.circleMarker([shift.driverHomeCoords.lat, shift.driverHomeCoords.lng], {
          radius: 7,
          color: '#334155',
          fillColor: '#64748b',
          fillOpacity: 0.95,
          weight: 2,
        }).addTo(map)
        const homeTooltipHtml = `
          <div style="font-family: inherit; font-size: 11px; min-width: 170px;">
            <div style="display: flex; align-items: center; gap: 4px; font-weight: bold; color: #f8fafc; margin-bottom: 2px;">
              <span>🏠</span>
              <span>Driver Home Base</span>
            </div>
            <div style="color: #cbd5e1; font-size: 10px;">
              <b>Driver:</b> ${shift.driverName}<br/>
              <b>Vehicle:</b> ${shift.vehicleNo}<br/>
              <b>Status:</b> Shift Start Base
            </div>
          </div>
        `
        homeMarker.bindTooltip(homeTooltipHtml, {
          direction: 'top',
          className: 'custom-map-dark-tooltip',
          sticky: true,
          opacity: 1,
        })
        homeMarker.bindPopup(homeTooltipHtml)
      }

      // Office Hub Marker
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
      const officeMarker = L.marker([shift.hubCoords.lat, shift.hubCoords.lng], { icon: officeIcon }).addTo(map)
      officeMarker.bindPopup(`<b>${shift.hubName}</b><br/>${shift.hubAddress}`)

      // Render stops with stage progression statuses and employee name pins
      stageInfo.updatedStops.forEach((stop, idx) => {
        const isFarthest = idx === 0
        const isNearest = idx === stageInfo.updatedStops.length - 1
        const isPicked = stop.status === 'PICKED'
        const isNext = stop.status === 'NEXT'

        const empIcon = L.divIcon({
          className: 'custom-emp-pin-icon',
          html: buildEmployeePinDivIconHtml(stop, idx, isPicked, isNext, isFarthest),
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        })

        const stopMarker = L.marker([stop.lat, stop.lng], { icon: empIcon }).addTo(map)

        const empTooltipHtml = buildEmployeeHoverCardHtml(stop, idx, stageInfo.updatedStops.length, shift, stageInfo)
        stopMarker.bindTooltip(empTooltipHtml, {
          direction: 'top',
          offset: [0, -22],
          className: 'custom-map-dark-tooltip',
          sticky: true,
          opacity: 1,
        })
        stopMarker.bindPopup(empTooltipHtml)
      })

      // Fetch and draw real road navigation polyline for REMAINING active path
      if (stageInfo.remainingWaypoints.length >= 2) {
        fetchOSRMRoute(stageInfo.remainingWaypoints).then((roadCoords) => {
          if (!shiftDrawerMapInstanceRef.current) return
          const polyline = L.polyline(roadCoords, {
            color: '#0284c7',
            weight: 4,
            opacity: 0.85,
          }).addTo(map)
          map.fitBounds(polyline.getBounds(), { padding: [35, 35] })
        })
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [selectedShiftForDrawer])

  // Center on selected shift & open right-side slide page to view details
  const handleSelectShiftInList = (shift: LiveShiftCab) => {
    setSelectedShift(shift)
    setSelectedShiftForDrawer(shift)
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([shift.currentCoords.lat, shift.currentCoords.lng], 13, {
        duration: 1.2,
      })
    }
  }

  // Render Full-page Employee Log View when requested
  if (viewMode === 'EMPLOYEE_LOG') {
    return (
      <ETSEmployeeLogView
        onBack={() => setViewMode('DASHBOARD')}
        onCreateTrip={(selected) => {
          setPrefilledEmployees(selected || [])
          setViewMode('CREATE_TRIP')
        }}
      />
    )
  }

  // Render Full-page Create Trip View when requested
  if (viewMode === 'CREATE_TRIP') {
    return (
      <CreateETSTripView
        onBack={() => {
          setViewMode('DASHBOARD')
          setPrefilledEmployees([])
        }}
        initialEmployees={prefilledEmployees}
        onTripCreated={(newShift) => {
          setLiveShifts((prev) => [newShift, ...prev])
          setSelectedShift(newShift)
          setSelectedShiftForDrawer(newShift)
          setViewMode('DASHBOARD')
          setPrefilledEmployees([])
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* ======================================================== */}
      {/* TOP DIV: HEADER ACTION BAR WITH REQUESTED 3 BUTTONS */}
      {/* ======================================================== */}
      <div className="card p-4 sm:p-5 bg-white border border-slate-200/90 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shadow-sm border border-slate-700">
                <Building2 className="w-5 h-5 text-slate-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    ETS Command Center
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                    Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live corporate fleet tracking, algorithmic roster optimization & stage progression
                </p>
              </div>
            </div>
          </div>

          {/* Requested Top Div Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Button 1: Create Trip */}
            <button
              onClick={() => {
                setPrefilledEmployees([])
                setViewMode('CREATE_TRIP')
              }}
              className="btn-accent text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm px-3.5 py-2"
            >
              <Car className="w-4 h-4" />
              <span>Create ETS Trip</span>
            </button>

            {/* Button 2: Employee Log */}
            <button
              onClick={() => setViewMode('EMPLOYEE_LOG')}
              className="btn-secondary text-xs sm:text-sm font-semibold flex items-center gap-1.5 px-3.5 py-2 hover:bg-slate-100 text-slate-800"
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Employee Log</span>
            </button>

            {/* Button 3: Auto Routing */}
            <button
              onClick={() => openModal('ROUTING_RULES')}
              className="btn-secondary text-xs sm:text-sm font-semibold flex items-center gap-1.5 px-3.5 py-2 hover:bg-slate-100 text-slate-800"
            >
              <Sliders className="w-4 h-4 text-amber-600" />
              <span>Auto Routing</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* GMAPS DASHBOARD & ROUTE CONTROL INTERFACE */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* GMaps Map Canvas (2 cols) */}
        <div className="lg:col-span-2 card p-0 overflow-hidden relative border border-slate-200/90 shadow-sm h-[580px] flex flex-col">
          {/* Map Overlay Toolbar */}
          <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            {/* Shift Filter Pills */}
            <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-md border border-slate-200/80 flex items-center gap-1.5 pointer-events-auto">
              <span className="text-[11px] font-bold text-slate-700 mr-1 flex items-center gap-1">
                <Navigation className="w-3 h-3 text-sky-700" />
                <span>Shifts:</span>
              </span>
              {(['ALL', 'LOGIN', 'LOGOUT'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setShiftFilter(filter)}
                  className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-all ${
                    shiftFilter === filter
                      ? 'bg-sky-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {filter === 'ALL' ? 'All Shifts' : filter === 'LOGIN' ? 'Login (Inbound)' : 'Logout (Outbound)'}
                </button>
              ))}
            </div>

            {/* Geofence toggle */}
            <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-slate-200/80 flex items-center gap-2 pointer-events-auto text-xs font-semibold text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={showGeofenceClusters}
                  onChange={(e) => setShowGeofenceClusters(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
                />
                <span>8 km Hub Geofence</span>
              </label>
            </div>

            {/* Live Active Status Indicator on Map */}
            <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-slate-700/80 flex items-center gap-2 pointer-events-auto text-xs text-white">
              <span
                className={`w-2 h-2 rounded-full ${
                  activeShifts.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span className="font-bold">
                {activeShifts.length > 0
                  ? `${activeShifts.length} Active Trips`
                  : '0 Active Trips'}
              </span>
            </div>
          </div>

          {/* Leaflet Map Div */}
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Map Bottom Legend */}
          <div className="p-2.5 bg-slate-900 text-white text-[11px] flex flex-wrap items-center justify-between gap-3 px-4 z-10 border-t border-slate-800">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-sky-500 border border-white" />
                <span>Sedan (3-Seater)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-indigo-500 border border-white" />
                <span>SUV (6-Seater)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-slate-900 border border-sky-400" />
                <span>Corporate Tech Park</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Employee Pickup Pin</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Live GPS Telemetry: Bengaluru Metropolitan Area</span>
          </div>
        </div>

        {/* Side Panel: Active & Completed Shift Manifests (1 col) */}
        <div className="card p-4 border border-slate-200/90 shadow-sm flex flex-col h-[580px]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-sky-700" />
                <span>Shift Manifests</span>
              </h3>
              <p className="text-[11px] text-slate-500">Live active trips and completed records</p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
              {panelTab === 'ACTIVE' ? `${activeShifts.length} Active` : `${completedShifts.length} Completed`}
            </span>
          </div>

          {/* Segmented Tabs: Active vs Completed */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl my-2.5">
            <button
              type="button"
              onClick={() => setPanelTab('ACTIVE')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                panelTab === 'ACTIVE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  activeShifts.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                }`}
              />
              <span>Active ({activeShifts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setPanelTab('COMPLETED')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                panelTab === 'COMPLETED'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Completed ({completedShifts.length})</span>
            </button>
          </div>

          {/* Shift Cards List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {panelTab === 'ACTIVE' ? (
              activeShifts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-slate-400">
                  <Car className="w-8 h-8 mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">No active trips on road right now</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Main map is clear. Click "Completed" tab to review finished shifts.
                  </p>
                </div>
              ) : (
                activeShifts.map((shift) => {
                  const isSelected = selectedShift?.id === shift.id

                  return (
                    <div
                      key={shift.id}
                      onClick={() => handleSelectShiftInList(shift)}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-sky-600 bg-sky-50/70 shadow-md ring-2 ring-sky-500/20'
                          : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-extrabold text-slate-900">{shift.shiftCode}</span>
                          <span
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                              shift.shiftType === 'LOGIN' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {shift.shiftType}
                          </span>
                          {shift.hasEscort && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-0.5">
                              <span>🛡️ Escort</span>
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                          {shift.vehicleNo}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-800 truncate">{shift.hubName}</p>

                      {(() => {
                        const info = getShiftStageInfo(shift)
                        return (
                          <>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                              <span>Driver: {shift.driverName}</span>
                              <span className="font-bold text-sky-800">
                                {info.seatsFilled}/{shift.capacity} Seats Filled
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[10px]">
                              <span className="font-semibold text-sky-700 truncate max-w-[200px]">
                                {info.stageTitle}
                              </span>
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                                {info.statusBadge}
                              </span>
                            </div>
                          </>
                        )
                      })()}

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="truncate max-w-[190px]">
                          {shift.stops.map((s) => s.name.split(' ')[0]).join(', ')}
                        </span>
                        <span className="text-sky-700 font-bold flex items-center gap-0.5">
                          <span>View Details</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  )
                })
              )
            ) : (
              completedShifts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-300" />
                  <p className="text-xs font-semibold text-slate-600">No completed shifts yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Shifts that have finished will appear here</p>
                </div>
              ) : (
                completedShifts.map((shift) => {
                  const isSelected = selectedShiftForDrawer?.id === shift.id

                  return (
                    <div
                      key={shift.id}
                      onClick={() => {
                        setSelectedShift(shift)
                        setSelectedShiftForDrawer(shift)
                      }}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-md ring-2 ring-emerald-500/20'
                          : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-slate-900">{shift.shiftCode}</span>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ ARRIVED
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                          {shift.vehicleNo}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-800 truncate">{shift.hubName}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span>Driver: {shift.driverName}</span>
                        <span className="font-bold text-emerald-700">
                          {shift.capacity}/{shift.capacity} Delivered
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Shift Completed</span>
                        </span>
                        <span className="text-slate-500 hover:text-red-600 font-bold flex items-center gap-1">
                          <span>Delete / Details &rarr;</span>
                        </span>
                      </div>
                    </div>
                  )
                })
              )
            )}
          </div>

          {/* Quick Create Shift Trigger */}
          <div className="pt-3 border-t border-slate-200">
            <button
              onClick={() => {
                setPrefilledEmployees([])
                setViewMode('CREATE_TRIP')
              }}
              className="btn-accent text-xs font-semibold w-full py-2.5 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Dispatch New Shift Trip</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CONNECTED MODALS (CREATE TRIP, EMPLOYEE LOG, ROUTING RULES) */}
      {/* ======================================================== */}
      <CreateETSTripModal
        key={`${modalInitialView}-${isModalOpen ? 'open' : 'closed'}`}
        isOpen={isModalOpen}
        initialView={modalInitialView}
        onClose={() => setIsModalOpen(false)}
        onOpenRechargeModal={() => {
          setIsModalOpen(false)
          navigate('/wallet')
        }}
        onOpenCreateTripView={(emps) => {
          setIsModalOpen(false)
          setPrefilledEmployees(emps || [])
          setViewMode('CREATE_TRIP')
        }}
      />
      {/* ======================================================== */}
      {/* RIGHT SIDE SLIDE DRAWER: SHIFT & HUB DETAILS WITH GMAPS */}
      {/* ======================================================== */}
      {selectedShiftForDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedShiftForDrawer(null)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-900 text-white flex items-center justify-center shadow-sm">
                  <Car className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{selectedShiftForDrawer.shiftCode}</h3>
                    <span
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        selectedShiftForDrawer.shiftType === 'LOGIN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {selectedShiftForDrawer.shiftType}
                    </span>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                      {selectedShiftForDrawer.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedShiftForDrawer.hubName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDeletingShift(selectedShiftForDrawer)}
                  className="p-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                  title="Delete this Shift Trip"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedShiftForDrawer(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                  title="Close Shift Details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* GMaps / Leaflet Map Container */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-600" />
                    <span>Live Vehicle Route & Stops</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    {selectedShiftForDrawer.currentCoords.lat.toFixed(4)}, {selectedShiftForDrawer.currentCoords.lng.toFixed(4)}
                  </span>
                </div>

                <div
                  ref={shiftDrawerMapContainerRef}
                  className="w-full h-56 rounded-xl border border-slate-200 shadow-inner z-0"
                  style={{ minHeight: '220px' }}
                />

                <p className="text-[11px] text-slate-500 italic">
                  Live vehicle position connected to {selectedShiftForDrawer.hubName}.
                </p>
              </div>

              {/* ======================================================== */}
              {/* REAL-TIME DRIVER GPS & TELEMETRY MONITOR */}
              {/* ======================================================== */}
              {(() => {
                const drawerStageInfo = getShiftStageInfo(selectedShiftForDrawer)
                return (
                  <div className="p-4 rounded-xl bg-slate-900 text-white shadow-lg space-y-3.5 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400">
                          Live Real-Time GPS Active
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded bg-sky-500/20 text-sky-200 border border-sky-400/30 uppercase">
                        {drawerStageInfo.statusBadge}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-sky-400" />
                        <span>{drawerStageInfo.stageTitle}</span>
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        {drawerStageInfo.stageDesc}
                      </p>
                    </div>

                    {/* Live Vehicle Telemetry Stats */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                      <div className="bg-slate-800/70 p-2 rounded-lg text-center">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">GPS Speed</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">38 km/h</span>
                      </div>
                      <div className="bg-slate-800/70 p-2 rounded-lg text-center">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Telemetry</span>
                        <span className="text-xs font-mono font-bold text-sky-400">4G Live</span>
                      </div>
                      <div className="bg-slate-800/70 p-2 rounded-lg text-center">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Last Ping</span>
                        <span className="text-xs font-mono font-bold text-slate-200">Just now</span>
                      </div>
                    </div>

                    {/* Driver Direct Contact & Center Button */}
                    <div className="flex items-center gap-2 pt-1">
                      {selectedShiftForDrawer.driverPhone && (
                        <a
                          href={`tel:${selectedShiftForDrawer.driverPhone}`}
                          className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call Driver ({selectedShiftForDrawer.driverName})</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (shiftDrawerMapInstanceRef.current) {
                            shiftDrawerMapInstanceRef.current.flyTo(
                              [drawerStageInfo.currentCoords.lat, drawerStageInfo.currentCoords.lng],
                              14,
                              { duration: 1.0 }
                            )
                          }
                        }}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition-colors"
                        title="Center map on vehicle live GPS"
                      >
                        <Compass className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })()}

              {/* Hub & Vehicle Information */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Corporate Client Hub</span>
                  <h4 className="text-xs font-bold text-slate-900 mt-0.5">{selectedShiftForDrawer.hubName}</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">{selectedShiftForDrawer.hubAddress}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Vehicle</span>
                    <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">{selectedShiftForDrawer.vehicleNo}</p>
                    <span className="text-[10px] text-slate-500">{selectedShiftForDrawer.vehicleType}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Driver Contact</span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedShiftForDrawer.driverName}</p>
                    {selectedShiftForDrawer.driverPhone && (
                      <a
                        href={`tel:${selectedShiftForDrawer.driverPhone}`}
                        className="text-[11px] font-mono text-emerald-700 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <Phone className="w-2.5 h-2.5" />
                        <span>{selectedShiftForDrawer.driverPhone}</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600">Capacity & Occupancy</span>
                    <span className="text-sky-800 font-bold font-mono">
                      {getShiftStageInfo(selectedShiftForDrawer).seatsFilled} / {selectedShiftForDrawer.capacity} Seats Filled
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all rounded-full"
                      style={{
                        width: `${(getShiftStageInfo(selectedShiftForDrawer).seatsFilled / selectedShiftForDrawer.capacity) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Security Escort Guard Details if assigned */}
              {selectedShiftForDrawer.hasEscort && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>Security Escort Assigned</span>
                    </div>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">
                      Compliance Active
                    </span>
                  </div>
                  <div className="text-xs space-y-0.5">
                    <p>
                      <span className="text-amber-800">Guard Name: </span>
                      <strong className="text-amber-950">{selectedShiftForDrawer.escortName || 'Assigned Guard'}</strong>
                    </p>
                    {selectedShiftForDrawer.escortPhone && (
                      <p>
                        <span className="text-amber-800">Contact: </span>
                        <span className="font-mono font-medium text-amber-950">{selectedShiftForDrawer.escortPhone}</span>
                      </p>
                    )}
                  </div>
                  <p className="text-[10px] text-amber-700 italic border-t border-amber-200/80 pt-1">
                    Night shift safety guard assigned in compliance with women employee transit regulations (6:00 PM – 6:00 AM).
                  </p>
                </div>
              )}

              {/* Passenger Stop Manifest */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-700" />
                  <span>Assigned Employee Manifest ({selectedShiftForDrawer.stops.length})</span>
                </h4>

                <div className="space-y-2">
                  {getShiftStageInfo(selectedShiftForDrawer).updatedStops.map((stop, idx, arr) => {
                    const isFarthest = idx === 0
                    const isNearest = idx === arr.length - 1
                    const isPicked = stop.status === 'PICKED'
                    const isNext = stop.status === 'NEXT'
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-2xs ${
                          isPicked
                            ? 'border-emerald-300 bg-emerald-50/40'
                            : isNext
                            ? 'border-sky-300 bg-sky-50/50 ring-1 ring-sky-300'
                            : isFarthest
                            ? 'border-rose-200 bg-rose-50/30'
                            : isNearest
                            ? 'border-sky-200 bg-sky-50/20'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg font-extrabold text-[11px] flex items-center justify-center shrink-0 ${
                              isPicked
                                ? 'bg-emerald-600 text-white'
                                : isNext
                                ? 'bg-sky-600 text-white animate-pulse'
                                : isFarthest
                                ? 'bg-rose-100 text-rose-800'
                                : isNearest
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isPicked ? '✓' : idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-slate-900 truncate">{stop.name}</p>
                              {isFarthest && (
                                <span className="bg-rose-100 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                  Stop #1: First Pickup (Farthest)
                                </span>
                              )}
                              {isNearest && (
                                <span className="bg-sky-100 text-sky-700 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                  Stop #{arr.length}: Last Pickup (Nearest to Office)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">{stop.address}</p>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                            isPicked
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isNext
                              ? 'bg-sky-100 text-sky-800 border border-sky-300 font-bold'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isPicked ? 'Boarded ✓' : isNext ? 'Next Target 📍' : 'Waiting in Queue'}
                        </span>
                      </div>
                    )
                  })}

                  {/* Destination Hub Terminal Step */}
                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0">
                        ✓
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-900 truncate">Destination: {selectedShiftForDrawer.hubName}</p>
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                            Shortest Road Path Return
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{selectedShiftForDrawer.hubAddress}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedShiftForDrawer(null)}
                  className="btn-secondary text-xs py-2 px-4 font-semibold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingShift(selectedShiftForDrawer)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Delete Shift Trip"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>Delete</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (mapInstanceRef.current && selectedShiftForDrawer) {
                    mapInstanceRef.current.flyTo(
                      [selectedShiftForDrawer.currentCoords.lat, selectedShiftForDrawer.currentCoords.lng],
                      14,
                      { duration: 1.2 }
                    )
                  }
                  setSelectedShiftForDrawer(null)
                }}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2 px-4 flex items-center gap-1.5 shadow-sm rounded-xl border border-slate-700"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Center on Main Map</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide to Delete Confirmation Modal for ETS Shift */}
      <SlideDeleteModal
        isOpen={!!deletingShift}
        onClose={() => setDeletingShift(null)}
        onConfirmDelete={handleConfirmDeleteShift}
        title="Delete ETS Shift Trip"
        subtitle="This action will delete this scheduled shift and create an audit log."
        entityName={deletingShift ? `Shift ${deletingShift.shiftCode}` : ''}
        entityDetails={
          deletingShift
            ? `${deletingShift.shiftType} Shift • Hub: ${deletingShift.hubName} • Vehicle: ${deletingShift.vehicleNo} (${deletingShift.stops.length} Stops)`
            : undefined
        }
      />
    </div>
  )
}
