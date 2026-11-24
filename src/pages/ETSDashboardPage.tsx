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
} from 'lucide-react'
import { CreateETSTripModal, CORPORATE_OFFICES } from '../components/trips/CreateETSTripModal'
import { formatCurrency } from '../lib/utils'
import {
  fetchOSRMRoute,
  sortStopsFarthestFirst,
  getShiftStageInfo,
  progressShiftStage,
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
      if (saved) {
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
          if (valid.length > 0) return valid
        }
      }
    } catch {}
    return [DEFAULT_INITIAL_SHIFT]
  })

  // Listen for newly dispatched ETS shifts
  useEffect(() => {
    const handleShiftUpdated = () => {
      try {
        const saved = localStorage.getItem('ETS_DISPATCHED_SHIFTS')
        if (saved) {
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
            setLiveShifts(valid.length > 0 ? valid : [DEFAULT_INITIAL_SHIFT])
          }
        }
      } catch {}
    }
    window.addEventListener('ets_shift_created', handleShiftUpdated)
    window.addEventListener('storage', handleShiftUpdated)
    return () => {
      window.removeEventListener('ets_shift_created', handleShiftUpdated)
      window.removeEventListener('storage', handleShiftUpdated)
    }
  }, [])

  // Modal Control
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalInitialView, setModalInitialView] = useState<'CREATE_TRIP' | 'EMPLOYEE_LOG' | 'ROUTING_RULES'>('CREATE_TRIP')

  // Map Filter State
  const [shiftFilter, setShiftFilter] = useState<'ALL' | 'LOGIN' | 'LOGOUT'>('ALL')
  const [vehicleFilter, setVehicleFilter] = useState<'ALL' | 'SEDAN' | 'SUV'>('ALL')
  const [selectedShift, setSelectedShift] = useState<LiveShiftCab | null>(null)
  const [selectedShiftForDrawer, setSelectedShiftForDrawer] = useState<LiveShiftCab | null>(null)
  const [showGeofenceClusters, setShowGeofenceClusters] = useState(true)

  // Live Driver Simulation State
  const [isSimulating, setIsSimulating] = useState(false)

  // Auto simulation timer: advances stage every 3.8 seconds
  useEffect(() => {
    if (!isSimulating || !selectedShiftForDrawer) return

    const interval = setInterval(() => {
      setSelectedShiftForDrawer((current) => {
        if (!current) return null
        const currentInfo = getShiftStageInfo(current)
        if (currentInfo.stageIndex >= currentInfo.totalStages) {
          setIsSimulating(false)
          toast.success(`Shift ${current.shiftCode} has safely arrived at ${current.hubName}!`)
          return current
        }

        const nextShift = progressShiftStage(current)
        const nextInfo = getShiftStageInfo(nextShift)
        toast.success(nextInfo.stageTitle, { id: 'ets-telemetry-toast', duration: 2500 })

        // Synchronize in liveShifts
        setLiveShifts((prev) => {
          const nextList = prev.map((s) => (s.id === nextShift.id ? nextShift : s))
          try {
            localStorage.setItem('ETS_DISPATCHED_SHIFTS', JSON.stringify(nextList))
          } catch {}
          return nextList
        })

        return nextShift
      })
    }, 3800)

    return () => clearInterval(interval)
  }, [isSimulating, selectedShiftForDrawer?.id])

  const handleNextStage = () => {
    if (!selectedShiftForDrawer) return
    const nextShift = progressShiftStage(selectedShiftForDrawer)
    const nextInfo = getShiftStageInfo(nextShift)
    toast.success(nextInfo.stageTitle, { id: 'ets-telemetry-toast' })
    setSelectedShiftForDrawer(nextShift)
    setLiveShifts((prev) => {
      const nextList = prev.map((s) => (s.id === nextShift.id ? nextShift : s))
      try {
        localStorage.setItem('ETS_DISPATCHED_SHIFTS', JSON.stringify(nextList))
      } catch {}
      return nextList
    })
  }

  const handleResetStage = () => {
    if (!selectedShiftForDrawer) return
    setIsSimulating(false)
    const resetShift = progressShiftStage(selectedShiftForDrawer, 0)
    toast('Trip reset to Driver Home base', { icon: '🔄' })
    setSelectedShiftForDrawer(resetShift)
    setLiveShifts((prev) => {
      const nextList = prev.map((s) => (s.id === resetShift.id ? resetShift : s))
      try {
        localStorage.setItem('ETS_DISPATCHED_SHIFTS', JSON.stringify(nextList))
      } catch {}
      return nextList
    })
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

    // 2. Render Active Shift Cabs and Dynamic Route Paths
    filteredShifts.forEach((shift) => {
      const isSedan = shift.vehicleType.includes('Sedan')
      const stageInfo = getShiftStageInfo(shift)

      // Vehicle Marker Icon
      const vehicleIcon = L.divIcon({
        className: 'custom-cab-icon',
        html: `
          <div style="background-color: ${stageInfo.stageIndex >= stageInfo.totalStages ? '#059669' : isSedan ? '#0284c7' : '#4f46e5'}; color: white; padding: 4px 8px; border-radius: 9999px; font-weight: bold; font-size: 11px; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.25); border: 2px solid white; white-space: nowrap;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 11 2 11.4V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
            <span>${shift.shiftCode} (${stageInfo.seatsFilled}/${shift.capacity})</span>
          </div>
        `,
        iconSize: [110, 28],
        iconAnchor: [55, 14],
      })

      const cabMarker = L.marker([stageInfo.currentCoords.lat, stageInfo.currentCoords.lng], { icon: vehicleIcon }).addTo(layer)

      cabMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; min-width: 220px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <b style="color: #0f172a; font-size: 13px;">${shift.shiftCode} — ${shift.vehicleType}</b>
            <span style="background: ${shift.shiftType === 'LOGIN' ? '#dcfce7' : '#e0e7ff'}; color: ${shift.shiftType === 'LOGIN' ? '#166534' : '#3730a3'}; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px;">${shift.shiftType}</span>
          </div>
          <div style="color: #475569; font-size: 11px; margin-bottom: 4px;">
            <b>Status:</b> <span style="color: #0284c7; font-weight: bold;">${stageInfo.stageTitle}</span><br/>
            <b>Vehicle No:</b> ${shift.vehicleNo}<br/>
            <b>Driver:</b> ${shift.driverName} (${shift.driverPhone})<br/>
            <b>Destination:</b> ${shift.hubName}<br/>
            <b>Occupancy:</b> ${stageInfo.seatsFilled} of ${shift.capacity} Employees Picked Up
          </div>
          <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #0284c7; font-weight: bold;">
            Karnataka ETS Escort Compliant ✓
          </div>
        </div>
      `)

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
          radius: 6,
          color: '#475569',
          fillColor: '#94a3b8',
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(layer)
        homeMarker.bindPopup(`<b>Driver Home Location</b><br/>${shift.driverName} (${shift.vehicleNo})<br/>Trip Start Base`)
      }

      // 3. Employee Stop Pins in optimal sequence (Stop 1 = Farthest, Stop N = Nearest)
      stageInfo.updatedStops.forEach((stop, i) => {
        const isFarthest = i === 0
        const isNearest = i === stageInfo.updatedStops.length - 1
        const isPicked = stop.status === 'PICKED'
        const isNext = stop.status === 'NEXT'

        const stopMarker = L.circleMarker([stop.lat, stop.lng], {
          radius: isNext ? 9 : 7,
          color: isPicked ? '#16a34a' : isNext ? '#0284c7' : isFarthest ? '#ef4444' : isNearest ? '#38bdf8' : '#f59e0b',
          fillColor: isPicked ? '#22c55e' : isNext ? '#38bdf8' : isFarthest ? '#f87171' : isNearest ? '#7dd3fc' : '#fbbf24',
          fillOpacity: 0.95,
          weight: isNext ? 3 : 2,
        }).addTo(layer)

        stopMarker.bindPopup(`
          <div style="font-family: inherit; font-size: 11px;">
            <div style="font-weight: bold; color: #0f172a; margin-bottom: 2px;">
              Stop #${i + 1}: ${stop.name} ${isFarthest ? '(First Pickup - Farthest)' : isNearest ? '(Last Pickup - Nearest to Hub)' : ''}
            </div>
            <div style="color: #64748b;">${stop.address}</div>
            <div style="margin-top: 4px; font-weight: bold; color: ${isPicked ? '#16a34a' : isNext ? '#0284c7' : '#64748b'};">
              Status: ${isPicked ? 'Boarded ✓' : isNext ? 'Current Target Pickup 📍' : 'Waiting in Queue'}
            </div>
          </div>
        `)
      })
    })
  }, [filteredShifts, showGeofenceClusters])

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
          <div style="background-color: ${stageInfo.stageIndex >= stageInfo.totalStages ? '#059669' : '#0284c7'}; color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 2px solid white;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
      const vehicleMarker = L.marker([stageInfo.currentCoords.lat, stageInfo.currentCoords.lng], { icon: carIcon }).addTo(map)
      vehicleMarker.bindPopup(`<b>${shift.shiftCode} (${shift.vehicleNo})</b><br/>Driver: ${shift.driverName}<br/><b>Status:</b> ${stageInfo.stageTitle}`).openPopup()

      // Driver Home Marker if present
      if (shift.driverHomeCoords) {
        const homeMarker = L.circleMarker([shift.driverHomeCoords.lat, shift.driverHomeCoords.lng], {
          radius: 7,
          color: '#475569',
          fillColor: '#94a3b8',
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(map)
        homeMarker.bindPopup(`<b>Driver Home Base</b><br/>Trip Start Base`)
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

      // Render stops with stage progression statuses
      stageInfo.updatedStops.forEach((stop, idx) => {
        const isFarthest = idx === 0
        const isNearest = idx === stageInfo.updatedStops.length - 1
        const isPicked = stop.status === 'PICKED'
        const isNext = stop.status === 'NEXT'

        const stopMarker = L.circleMarker([stop.lat, stop.lng], {
          radius: isNext ? 9 : 7,
          fillColor: isPicked ? '#10b981' : isNext ? '#38bdf8' : isFarthest ? '#ef4444' : isNearest ? '#0284c7' : '#fbbf24',
          color: '#ffffff',
          weight: isNext ? 3 : 2,
          fillOpacity: 0.95,
        }).addTo(map)
        stopMarker.bindPopup(`<b>Stop #${idx + 1}: ${stop.name}</b> ${isFarthest ? '(First Pickup - Farthest)' : isNearest ? '(Last Pickup - Nearest to Hub)' : ''}<br/>${stop.address}<br/><b>Status:</b> ${isPicked ? 'Boarded ✓' : isNext ? 'Current Target Pickup 📍' : 'Waiting in Queue'}`)
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

  return (
    <div className="space-y-4">
      {/* ======================================================== */}
      {/* TOP DIV: HEADER ACTION BAR WITH REQUESTED 3 BUTTONS */}
      {/* ======================================================== */}
      <div className="card p-4 sm:p-5 bg-white border border-slate-200/90 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-900 text-white flex items-center justify-center shadow-sm">
                <Building2 className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  ETS Command Center
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live Bengaluru corporate fleet tracking, automated employee roster routing, and geofence telemetry
                </p>
              </div>
            </div>
          </div>

          {/* Requested Top Div Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Button 1: Create Trip */}
            <button
              onClick={() => openModal('CREATE_TRIP')}
              className="btn-accent text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md px-3.5 py-2"
            >
              <Car className="w-4 h-4" />
              <span>Create Trip</span>
            </button>

            {/* Button 2: Employee Log */}
            <button
              onClick={() => openModal('EMPLOYEE_LOG')}
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

        {/* Side Panel: Active Shift Manifests (1 col) */}
        <div className="card p-4 border border-slate-200/90 shadow-sm flex flex-col h-[580px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-sky-700" />
                <span>Live Active Shifts</span>
              </h3>
              <p className="text-[11px] text-slate-500">Click a shift to center map on vehicle</p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
              {filteredShifts.length} Running
            </span>
          </div>

          {/* Shift Cards List */}
          <div className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1">
            {filteredShifts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-slate-400">
                <Car className="w-8 h-8 mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">No active shift trips</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Dispatched ETS trips will appear here</p>
              </div>
            ) : (
              filteredShifts.map((shift) => {
              const isSelected = selectedShift?.id === shift.id
              const isSedan = shift.vehicleType.includes('Sedan')

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
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-slate-900">{shift.shiftCode}</span>
                      <span
                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          shift.shiftType === 'LOGIN' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {shift.shiftType}
                      </span>
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

                  {/* Passenger names preview */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="truncate max-w-[190px]">
                      {shift.stops.map((s) => s.name.split(' ')[0]).join(', ')}
                    </span>
                    <span className="text-sky-700 font-bold flex items-center gap-0.5">
                      <span>View Route</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              )
            })
          )}
          </div>

          {/* Quick Create Shift Trigger */}
          <div className="pt-3 border-t border-slate-200">
            <button
              onClick={() => openModal('CREATE_TRIP')}
              className="btn-accent text-xs font-bold w-full py-2 flex items-center justify-center gap-1.5 shadow-sm"
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

              <button
                type="button"
                onClick={() => setSelectedShiftForDrawer(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                title="Close Shift Details"
              >
                <X className="w-5 h-5" />
              </button>
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
              {/* LIVE TRIP SIMULATOR & DISPATCH TELEMETRY CARD */}
              {/* ======================================================== */}
              {(() => {
                const drawerStageInfo = getShiftStageInfo(selectedShiftForDrawer)
                return (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-sky-950 text-white shadow-lg space-y-3.5 border border-sky-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-[11px] font-bold tracking-wider uppercase text-sky-300">
                          Live Driver Telemetry Simulator
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
                      <p className="text-[11px] text-sky-200/80 mt-1 leading-relaxed">
                        {drawerStageInfo.stageDesc}
                      </p>
                    </div>

                    {/* Visual Stepper */}
                    <div className="flex items-center justify-between gap-1 pt-1">
                      {Array.from({ length: drawerStageInfo.totalStages + 1 }).map((_, stepIdx) => {
                        const isPast = stepIdx < drawerStageInfo.stageIndex
                        const isCurrent = stepIdx === drawerStageInfo.stageIndex
                        const isHome = stepIdx === 0
                        const isHub = stepIdx === drawerStageInfo.totalStages
                        return (
                          <React.Fragment key={stepIdx}>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = progressShiftStage(selectedShiftForDrawer, stepIdx)
                                const info = getShiftStageInfo(updated)
                                toast.success(info.stageTitle, { id: 'ets-telemetry-toast' })
                                setSelectedShiftForDrawer(updated)
                                setLiveShifts((prev) => {
                                  const nextList = prev.map((s) => (s.id === updated.id ? updated : s))
                                  try {
                                    localStorage.setItem('ETS_DISPATCHED_SHIFTS', JSON.stringify(nextList))
                                  } catch {}
                                  return nextList
                                })
                              }}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                                isCurrent
                                  ? 'bg-sky-400 text-slate-950 ring-2 ring-sky-300 ring-offset-2 ring-offset-slate-900 scale-110 shadow-lg'
                                  : isPast
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-sky-400'
                              }`}
                              title={isHome ? 'Driver Home Base' : isHub ? 'Corporate Office Hub' : `Stop #${stepIdx}`}
                            >
                              {isPast ? '✓' : isHome ? '🏠' : isHub ? '🏢' : stepIdx}
                            </button>
                            {stepIdx < drawerStageInfo.totalStages && (
                              <div
                                className={`flex-1 h-1 rounded-full transition-all ${
                                  stepIdx < drawerStageInfo.stageIndex ? 'bg-emerald-400' : 'bg-slate-700'
                                }`}
                              />
                            )}
                          </React.Fragment>
                        )
                      })}
                    </div>

                    {/* Simulator Action Controls */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-sky-800/40">
                      <button
                        type="button"
                        onClick={() => setIsSimulating(!isSimulating)}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                          isSimulating
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {isSimulating ? (
                          <>
                            <span>⏸ Pause Simulation</span>
                          </>
                        ) : (
                          <>
                            <span>▶ Play Live Simulation</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleNextStage}
                        disabled={isSimulating}
                        className="py-1.5 px-3 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white flex items-center gap-1 transition-colors"
                        title="Advance driver to next stop"
                      >
                        <span>Next Stop</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={handleResetStage}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors"
                        title="Reset Trip to Start"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
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
              <button
                type="button"
                onClick={() => setSelectedShiftForDrawer(null)}
                className="btn-secondary text-xs py-2 px-4 font-semibold"
              >
                Close
              </button>

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
                className="btn-accent text-xs font-bold py-2 px-4 flex items-center gap-1.5 shadow-sm"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Center on Main Map</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
