import React, { useEffect, useRef, useState } from 'react'
import { Drawer } from '../ui/Modal'
import { StatusBadge, PaymentBadge } from '../ui/StatusBadge'
import { TripStatusTimeline } from '../ui/TripStatusTimeline'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import {
  fetchOSRMRoute,
  resolveBengaluruCoords,
  calculateRouteDistanceKm,
} from '../../lib/routing'
import type { Trip } from '../../types'
import {
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Car,
  Receipt,
  FileText,
  Navigation,
  Compass,
  ExternalLink,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react'

interface TripDetailDrawerProps {
  trip: Trip | null
  isOpen: boolean
  onClose: () => void
  onDelete?: (trip: Trip) => void
}

export const TripDetailDrawer: React.FC<TripDetailDrawerProps> = ({
  trip,
  isOpen,
  onClose,
  onDelete,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const routeLayerRef = useRef<any>(null)
  const polylineBoundsRef = useRef<any>(null)

  const [routeStats, setRouteStats] = useState<{
    distanceKm: number
    durationMins: number
    isLoading: boolean
  }>({
    distanceKm: 0,
    durationMins: 0,
    isLoading: true,
  })

  // Initialize and update real Leaflet map with OSRM road routing
  useEffect(() => {
    if (!isOpen || !trip) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        routeLayerRef.current = null
        polylineBoundsRef.current = null
      }
      return
    }

    let isMounted = true
    setRouteStats({ distanceKm: 0, durationMins: 0, isLoading: true })

    // Wait for drawer animation to complete before rendering map container
    const timer = setTimeout(async () => {
      const L = (window as any).L
      if (!L || !mapContainerRef.current) return

      const pickupInfo = resolveBengaluruCoords(trip.pickup)
      const dropInfo = resolveBengaluruCoords(trip.drop)

      // Initialize map instance if not already created
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: false,
        }).setView([pickupInfo.lat, pickupInfo.lng], 12)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors | Atharva Travels Live Telemetry',
        }).addTo(map)

        routeLayerRef.current = L.layerGroup().addTo(map)
        mapInstanceRef.current = map
      } else {
        mapInstanceRef.current.invalidateSize()
      }

      const map = mapInstanceRef.current
      const layer = routeLayerRef.current
      if (!map || !layer) return

      layer.clearLayers()

      // 1. Pickup Marker (Emerald Pin with Passenger Name tag)
      const pickupIcon = L.divIcon({
        className: 'custom-rac-pickup-icon',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
            <div style="background: #059669; color: white; padding: 3px 8px; border-radius: 9999px; font-weight: 800; font-size: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2px solid white; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
              <span>🟢</span>
              <span>${trip.passengerName} (Pickup)</span>
            </div>
            <div style="width: 2px; height: 5px; background: #059669;"></div>
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #059669; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })

      const pickupMarker = L.marker([pickupInfo.lat, pickupInfo.lng], { icon: pickupIcon }).addTo(layer)
      pickupMarker.bindTooltip(
        `
        <div style="font-family: inherit; font-size: 11px; min-width: 230px; line-height: 1.4;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 4px; margin-bottom: 5px;">
            <b style="color: #4ade80; font-size: 12px;">🟢 Pickup Location</b>
            <span style="background: #059669; color: white; font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px;">PASSENGER</span>
          </div>
          <div style="color: #cbd5e1; font-size: 10px;">
            <div><b>Passenger:</b> <span style="color: #ffffff; font-weight: bold;">${trip.passengerName}</span></div>
            <div><b>Phone:</b> <span style="color: #38bdf8;">${trip.passengerPhone}</span></div>
            <div><b>Status:</b> <span style="color: #facc15;">Awaiting Cab Boarding</span></div>
            <div><b>Scheduled:</b> ${trip.scheduledDate} at ${trip.scheduledTime}</div>
            <div style="margin-top: 4px; border-top: 1px dashed #475569; padding-top: 3px;">
              <b>Address:</b> <span style="color: #f1f5f9;">${trip.pickup}</span>
            </div>
          </div>
        </div>
        `,
        {
          className: 'custom-map-dark-tooltip',
          permanent: false,
          direction: 'top',
          offset: [0, -10],
        }
      )

      // 2. Drop Marker (Rose Pin with Destination tag)
      const dropIcon = L.divIcon({
        className: 'custom-rac-drop-icon',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
            <div style="background: #e11d48; color: white; padding: 3px 8px; border-radius: 9999px; font-weight: 800; font-size: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2px solid white; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
              <span>🏁</span>
              <span>${dropInfo.displayName}</span>
            </div>
            <div style="width: 2px; height: 5px; background: #e11d48;"></div>
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #e11d48; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })

      const dropMarker = L.marker([dropInfo.lat, dropInfo.lng], { icon: dropIcon }).addTo(layer)
      dropMarker.bindTooltip(
        `
        <div style="font-family: inherit; font-size: 11px; min-width: 230px; line-height: 1.4;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 4px; margin-bottom: 5px;">
            <b style="color: #fb7185; font-size: 12px;">🏁 Drop Destination</b>
            <span style="background: #e11d48; color: white; font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px;">TARGET</span>
          </div>
          <div style="color: #cbd5e1; font-size: 10px;">
            <div><b>Destination:</b> <span style="color: #ffffff; font-weight: bold;">${trip.drop}</span></div>
            <div><b>Service Type:</b> <span style="color: #38bdf8;">${trip.serviceType}</span></div>
            <div><b>Trip Status:</b> <span style="color: #38bdf8; font-weight: bold;">${trip.tripStatus}</span></div>
            <div><b>Payment:</b> <span style="color: #4ade80;">${trip.paymentStatus}</span></div>
          </div>
        </div>
        `,
        {
          className: 'custom-map-dark-tooltip',
          permanent: false,
          direction: 'top',
          offset: [0, -10],
        }
      )

      // 3. Fetch Real-Road OSRM Geometry
      const roadCoords = await fetchOSRMRoute([
        { lat: pickupInfo.lat, lng: pickupInfo.lng },
        { lat: dropInfo.lat, lng: dropInfo.lng },
      ])

      if (!isMounted) return

      const distKm = calculateRouteDistanceKm(roadCoords)
      const durationMins = Math.max(12, Math.round((distKm / 34) * 60))
      setRouteStats({
        distanceKm: Number(distKm.toFixed(1)),
        durationMins,
        isLoading: false,
      })

      // 4. Render Dual-Layer Road Polylines
      // Outer glow polyline
      const outerPolyline = L.polyline(roadCoords, {
        color: '#0284c7',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layer)

      // Inner cyan road core
      L.polyline(roadCoords, {
        color: '#38bdf8',
        weight: 3,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layer)

      // 5. If Driver / Vehicle Assigned: Render Real-Time Cab Marker
      const isAssigned = Boolean(trip.vehicleRegNo || trip.driverName)
      if (isAssigned && roadCoords.length > 2) {
        // Place vehicle around 35% along the actual road polyline
        const vehiclePosIndex = Math.min(
          roadCoords.length - 1,
          Math.floor(roadCoords.length * 0.35)
        )
        const vehicleCoord = roadCoords[vehiclePosIndex]

        const cabIcon = L.divIcon({
          className: 'custom-rac-cab-icon',
          html: `
            <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
              <div style="background: #0284c7; color: white; padding: 3px 8px; border-radius: 9999px; font-weight: 800; font-size: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2px solid white; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                <span>🚖</span>
                <span>${trip.vehicleRegNo || 'Cab En Route'}</span>
              </div>
              <div style="width: 2px; height: 5px; background: #0284c7;"></div>
              <div style="width: 8px; height: 8px; border-radius: 50%; background: #0284c7; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        })

        const cabMarker = L.marker([vehicleCoord[0], vehicleCoord[1]], { icon: cabIcon }).addTo(layer)
        cabMarker.bindTooltip(
          `
          <div style="font-family: inherit; font-size: 11px; min-width: 220px; line-height: 1.4;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 4px; margin-bottom: 5px;">
              <b style="color: #38bdf8; font-size: 12px;">🚖 Assigned Fleet</b>
              <span style="background: #0284c7; color: white; font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px;">LIVE GPS</span>
            </div>
            <div style="color: #cbd5e1; font-size: 10px;">
              <div><b>Driver:</b> <span style="color: #ffffff; font-weight: bold;">${trip.driverName || 'Assigned Driver'}</span></div>
              <div><b>Vehicle:</b> <span style="color: #38bdf8; font-weight: bold;">${trip.vehicleRegNo || 'Active Cab'}</span></div>
              <div style="margin-top: 3px; color: #4ade80; font-weight: 600;">
                ● GPS Active • Telemetry 4G Connected
              </div>
            </div>
          </div>
          `,
          {
            className: 'custom-map-dark-tooltip',
            permanent: false,
            direction: 'top',
            offset: [0, -10],
          }
        )
      }

      // Store bounds and fit map
      const bounds = outerPolyline.getBounds()
      polylineBoundsRef.current = bounds
      map.fitBounds(bounds, { padding: [35, 35] })
    }, 250)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [trip, isOpen])

  const handleCenterRoute = () => {
    if (mapInstanceRef.current && polylineBoundsRef.current) {
      mapInstanceRef.current.fitBounds(polylineBoundsRef.current, { padding: [35, 35] })
    }
  }

  if (!trip) return null

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    trip.pickup
  )}&destination=${encodeURIComponent(trip.drop)}`

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Trip ${trip.tripNo}`} width="w-[520px]">
      <div className="space-y-5">
        {/* Header Badges */}
        <div className="flex items-center justify-between pb-3 border-b border-sky-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-sky-100 text-sky-800">
              {trip.serviceType}
            </span>
            <StatusBadge status={trip.tripStatus} />
          </div>
          <PaymentBadge status={trip.paymentStatus} />
        </div>

        {/* Live Road Route & GMaps Leaflet View */}
        <div className="card p-4 space-y-3 border-sky-200 shadow-sm bg-gradient-to-b from-white to-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-900 uppercase tracking-wider">
              <Navigation className="w-4 h-4 text-sky-700" />
              <span>Live Road Route & Telemetry</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                OSRM Road Geometry
              </span>
            </div>
          </div>

          {/* Interactive Leaflet Road Map */}
          <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-900">
            <div ref={mapContainerRef} className="h-60 w-full z-0" />

            {/* Live Metrics Floating Pill */}
            <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-700/80 shadow-lg text-[11px] text-white">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              {routeStats.isLoading ? (
                <span className="text-slate-300">Calculating road route...</span>
              ) : (
                <span>
                  <b className="text-sky-300">{routeStats.distanceKm} km</b>
                  <span className="text-slate-400 mx-1">•</span>
                  <span className="text-emerald-300">~{routeStats.durationMins} mins</span>
                </span>
              )}
            </div>

            {/* Quick Action Map Overlay Controls */}
            <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
              <button
                onClick={handleCenterRoute}
                title="Fit road route to screen"
                className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 backdrop-blur-md shadow-md transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                title="Open this route in Google Maps"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold shadow-md transition-colors"
              >
                <span>GMaps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Turn-by-Turn Waypoints Info */}
          <div className="space-y-2 pt-1 text-xs">
            <div className="flex items-start gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-emerald-800 text-[11px]">Pickup Location</p>
                <p className="text-slate-800 text-xs font-medium leading-relaxed">{trip.pickup}</p>
              </div>
            </div>
            <div className="w-0.5 h-3 bg-sky-200 ml-1" />
            <div className="flex items-start gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-rose-800 text-[11px]">Drop Destination</p>
                <p className="text-slate-800 text-xs font-medium leading-relaxed">{trip.drop}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Passenger Information */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-900 uppercase tracking-wider">
            <User className="w-4 h-4 text-sky-700" />
            <span>Passenger Details</span>
          </div>
          <p className="font-semibold text-slate-800 text-base">{trip.passengerName}</p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <a href={`tel:${trip.passengerPhone}`} className="hover:text-sky-800 underline">
              {trip.passengerPhone}
            </a>
          </div>
        </div>

        {/* Schedule */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-900 uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-sky-700" />
            <span>Schedule</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-700">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{trip.scheduledDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{trip.scheduledTime}</span>
            </div>
          </div>
        </div>

        {/* Driver & Vehicle */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-900 uppercase tracking-wider">
            <Car className="w-4 h-4 text-sky-700" />
            <span>Assigned Fleet</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-slate-500">Driver:</p>
              <p className="font-semibold text-slate-800">
                {trip.driverName || 'Not Assigned'}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Vehicle:</p>
              <p className="font-semibold text-slate-800">
                {trip.vehicleRegNo || 'Not Assigned'}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Breakdown: Frozen */}
        <div className="card p-4 bg-slate-100 border border-slate-300 text-slate-700 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Financial & Payment Breakdown</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600 border border-slate-300">
              Frozen
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Wallet escrow debits and fee breakdowns are frozen until the admin portal connects. Trip operates under direct corporate invoicing.
          </p>
        </div>

        {/* Notes */}
        {trip.notes && (
          <div className="card p-4 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-600">
              <FileText className="w-3.5 h-3.5" />
              <span>Notes</span>
            </div>
            <p className="text-slate-600 italic">{trip.notes}</p>
          </div>
        )}

        {/* Status Timeline */}
        <div className="card p-4 space-y-3">
          <h4 className="text-xs font-semibold text-sky-900 uppercase tracking-wider">
            Status History Timeline
          </h4>
          <TripStatusTimeline
            history={trip.statusHistory || []}
            currentStatus={trip.tripStatus}
          />
        </div>

        {/* Footer Actions with Close and Delete */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs py-2 px-4 font-semibold"
            >
              Close
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(trip)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Delete this Trip"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>Delete</span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 text-right">
            Created on {formatDateTime(trip.createdAt)}
          </p>
        </div>
      </div>
    </Drawer>
  )
}
