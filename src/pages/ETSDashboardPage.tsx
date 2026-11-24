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
} from 'lucide-react'
import { CreateETSTripModal, CORPORATE_OFFICES } from '../components/trips/CreateETSTripModal'
import { formatCurrency } from '../lib/utils'

export interface LiveShiftCab {
  id: string
  shiftCode: string
  vehicleType: 'Sedan 4+1' | 'SUV 6+1'
  seatsUsed: number
  capacity: number
  shiftType: 'LOGIN' | 'LOGOUT'
  hubName: string
  hubAddress: string
  driverName: string
  driverPhone: string
  vehicleNo: string
  status: 'BOARDING' | 'ON_ROUTE' | 'ARRIVED'
  currentCoords: { lat: number; lng: number }
  hubCoords: { lat: number; lng: number }
  stops: { name: string; address: string; lat: number; lng: number; status: 'PICKED' | 'NEXT' | 'PENDING' }[]
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
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            setLiveShifts(
              parsed.filter(
                (s) =>
                  s &&
                  s.id &&
                  !s.id.startsWith('shift-1') &&
                  !s.id.startsWith('shift-2') &&
                  !s.id.startsWith('shift-3') &&
                  !s.id.startsWith('shift-4')
              )
            )
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
  const [showGeofenceClusters, setShowGeofenceClusters] = useState(true)

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersLayerRef = useRef<any>(null)

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

    // 1. Render Corporate IT Hubs
    CORPORATE_OFFICES.forEach((hub) => {
      const hubIcon = L.divIcon({
        className: 'custom-hub-icon',
        html: `
          <div style="background-color: #0f172a; color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 2px solid #38bdf8;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
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

    // 2. Render Active Shift Cabs and Route Paths
    filteredShifts.forEach((shift) => {
      const isSedan = shift.vehicleType.includes('Sedan')

      // Vehicle Marker Icon
      const vehicleIcon = L.divIcon({
        className: 'custom-cab-icon',
        html: `
          <div style="background-color: ${isSedan ? '#0284c7' : '#4f46e5'}; color: white; padding: 4px 8px; border-radius: 9999px; font-weight: bold; font-size: 11px; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.25); border: 2px solid white; white-space: nowrap;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 11 2 11.4V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
            <span>${shift.shiftCode} (${shift.seatsUsed}/${shift.capacity})</span>
          </div>
        `,
        iconSize: [110, 28],
        iconAnchor: [55, 14],
      })

      const cabMarker = L.marker([shift.currentCoords.lat, shift.currentCoords.lng], { icon: vehicleIcon }).addTo(layer)

      cabMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; min-width: 200px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <b style="color: #0f172a; font-size: 13px;">${shift.shiftCode} — ${shift.vehicleType}</b>
            <span style="background: ${shift.shiftType === 'LOGIN' ? '#dcfce7' : '#e0e7ff'}; color: ${shift.shiftType === 'LOGIN' ? '#166534' : '#3730a3'}; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px;">${shift.shiftType}</span>
          </div>
          <div style="color: #475569; font-size: 11px; margin-bottom: 4px;">
            <b>Vehicle No:</b> ${shift.vehicleNo}<br/>
            <b>Driver:</b> ${shift.driverName} (${shift.driverPhone})<br/>
            <b>Destination:</b> ${shift.hubName}<br/>
            <b>Roster:</b> ${shift.seatsUsed} of ${shift.capacity} Employees Assigned
          </div>
          <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #0284c7; font-weight: bold;">
            Karnataka ETS Escort Compliant ✓
          </div>
        </div>
      `)

      cabMarker.on('click', () => setSelectedShift(shift))

      // Route Polyline (Stops -> Hub)
      const latlngs = [
        ...shift.stops.map((s) => [s.lat, s.lng]),
        [shift.currentCoords.lat, shift.currentCoords.lng],
        [shift.hubCoords.lat, shift.hubCoords.lng],
      ]

      L.polyline(latlngs, {
        color: isSedan ? '#0284c7' : '#6366f1',
        weight: 3,
        opacity: 0.75,
        dashArray: '6, 6',
      }).addTo(layer)

      // Employee Stop Pins
      shift.stops.forEach((stop, i) => {
        const stopMarker = L.circleMarker([stop.lat, stop.lng], {
          radius: 6,
          color: stop.status === 'PICKED' ? '#16a34a' : '#f59e0b',
          fillColor: stop.status === 'PICKED' ? '#22c55e' : '#fbbf24',
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(layer)

        stopMarker.bindPopup(`
          <div style="font-family: inherit; font-size: 11px;">
            <b>Stop #${i + 1}: ${stop.name}</b><br/>
            <span>${stop.address}</span><br/>
            <span style="font-weight: bold; color: ${stop.status === 'PICKED' ? '#16a34a' : '#f59e0b'};">
              Status: ${stop.status === 'PICKED' ? 'Boarded ✓' : 'Next in Queue'}
            </span>
          </div>
        `)
      })
    })
  }, [filteredShifts, showGeofenceClusters])

  // Center on selected shift
  const handleSelectShiftInList = (shift: LiveShiftCab) => {
    setSelectedShift(shift)
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
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-extrabold">Sedan & SUV</span>
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

            {/* Back to Standard Command Center */}
            <button
              onClick={() => navigate('/')}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2.5 py-2 flex items-center gap-1 ml-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Standard Dashboard</span>
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

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>Driver: {shift.driverName}</span>
                    <span className="font-bold text-sky-800">
                      {shift.seatsUsed}/{shift.capacity} Seats Filled
                    </span>
                  </div>

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
        isOpen={isModalOpen}
        initialView={modalInitialView}
        onClose={() => setIsModalOpen(false)}
        onOpenRechargeModal={() => {
          setIsModalOpen(false)
          navigate('/wallet')
        }}
      />
    </div>
  )
}
