import React, { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Drawer } from '../ui/Modal'
import { StatusBadge, PaymentBadge } from '../ui/StatusBadge'
import { TripStatusTimeline } from '../ui/TripStatusTimeline'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { vendorApi } from '../../lib/api'
import toast from 'react-hot-toast'
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
  Radio,
  Zap,
  AlertCircle,
  TrendingUp,
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

  const queryClient = useQueryClient()
  const [isPushing, setIsPushing] = useState(false)
  const [searchSeconds, setSearchSeconds] = useState(0)
  const [selectedBoost, setSelectedBoost] = useState<number | null>(null)
  const [customBoost, setCustomBoost] = useState<string>('')
  const [isUpdatingFare, setIsUpdatingFare] = useState(false)
  const [showBoostPanel, setShowBoostPanel] = useState(false)

  // Track elapsed search seconds when searching for driver
  useEffect(() => {
    if (!isOpen || !trip || trip.tripStatus !== 'SEARCHING_DRIVER') {
      setSearchSeconds(0)
      return
    }

    const localPushed = localStorage.getItem(`glide_pushed_${trip.id}`)
    const notesMatch = trip.notes?.match(/\[PushedAt:\s*([^\]]+)\]/)
    let startTime = Date.now()

    if (localPushed) {
      startTime = Number(localPushed)
    } else if (notesMatch) {
      const parsed = new Date(notesMatch[1]).getTime()
      if (!isNaN(parsed)) startTime = parsed
    } else if (trip.updatedAt) {
      const parsed = new Date(trip.updatedAt).getTime()
      if (!isNaN(parsed)) startTime = parsed
    } else {
      localStorage.setItem(`glide_pushed_${trip.id}`, Date.now().toString())
    }

    const calcElapsed = () => Math.max(0, Math.floor((Date.now() - startTime) / 1000))
    setSearchSeconds(calcElapsed())

    const interval = setInterval(() => {
      setSearchSeconds(calcElapsed())
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, trip?.id, trip?.tripStatus, trip?.updatedAt, trip?.notes])

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

  // Parse financial breakdown (Option A: Platform Fee fixed ₹5, Convenience Fee 6% added on top)
  const getFinancialBreakdown = (currentTrip: Trip) => {
    const rawNotes = currentTrip.notes || ''
    const total = Number(currentTrip.tripAmount) || 0

    const baseMatch = rawNotes.match(/Agreed Base Fare:\s*₹?(\d+)/i) || rawNotes.match(/Agreed Fare:\s*₹?(\d+)/i)
    const platformMatch = rawNotes.match(/Platform Fee:\s*\+?₹?(\d+)/i)
    const convMatch = rawNotes.match(/Convenience Fee[^:]*:\s*\+?₹?(\d+)/i)
    const totalMatch = rawNotes.match(/Total Fare:\s*₹?(\d+)/i)

    if (baseMatch && platformMatch && convMatch) {
      const baseFare = Number(baseMatch[1])
      const platformFee = Number(platformMatch[1])
      const convenienceFee = Number(convMatch[1])
      const totalAmount = totalMatch ? Number(totalMatch[1]) : (baseFare + platformFee + convenienceFee)
      return { baseFare, platformFee, convenienceFee, totalAmount }
    }

    if (total > 0) {
      const platformFee = 5
      const baseFare = Math.max(0, Math.round((total - platformFee) / 1.06))
      const convenienceFee = Math.round(baseFare * 0.06)
      const totalAmount = total
      return { baseFare, platformFee, convenienceFee, totalAmount }
    }

    return { baseFare: 0, platformFee: 5, convenienceFee: 0, totalAmount: 0 }
  }

  // Extract clean vendor notes (removing system tags and internal bracketed metadata)
  const extractCleanVendorNotes = (rawNotes?: string) => {
    if (!rawNotes) return ''
    const cleaned = rawNotes
      .replace(/ETS\s+(LOGIN|LOGOUT)\s+Shift/gi, '')
      .replace(/\[Vehicle:[^\]]+\]/gi, '')
      .replace(/\[Model Year:[^\]]+\]/gi, '')
      .replace(/Hub:[^\[]+/gi, '')
      .replace(/\[Escort Guard:[^\]]+\]/gi, '')
      .replace(/\[Security Escort Guard:[^\]]+\]/gi, '')
      .replace(/\[Agreed Base Fare:[^\]]+\]/gi, '')
      .replace(/\[Agreed Fare:[^\]]+\]/gi, '')
      .replace(/\[Platform Fee:[^\]]+\]/gi, '')
      .replace(/\[Convenience Fee[^\]]+\]/gi, '')
      .replace(/\[Total Fare:[^\]]+\]/gi, '')
      .replace(/\[PushedAt:[^\]]+\]/gi, '')
      .replace(/\[Status:[^\]]+\]/gi, '')
      .replace(/Created via Atharva Travels Vendor Portal/gi, '')
      .replace(/\|/g, '')
      .trim()
    return cleaned
  }

  const financials = getFinancialBreakdown(trip)
  const vendorNotesClean = extractCleanVendorNotes(trip.notes)
  const modelYearMatch = trip.notes?.match(/\[Model Year:\s*([^\]]+)\]/i)
  const modelYear = modelYearMatch ? modelYearMatch[1].trim() : null
  const isETS = trip.serviceType === 'ETS' || String(trip.tripNo || '').startsWith('ETS-')

  const handlePushToDriver = async () => {
    if (!trip) return
    setIsPushing(true)
    try {
      const now = new Date().toISOString()
      const existingNotes = trip.notes || ''
      const updatedNotes = existingNotes.includes('[PushedAt:')
        ? existingNotes.replace(/\[PushedAt:[^\]]+\]/, `[PushedAt: ${now}]`)
        : `${existingNotes} [PushedAt: ${now}]`.trim()

      await vendorApi.updateTrip(trip.id, { tripStatus: 'SEARCHING_DRIVER', notes: updatedNotes })
      localStorage.setItem(`glide_pushed_${trip.id}`, Date.now().toString())
      setSearchSeconds(0)
      trip.tripStatus = 'SEARCHING_DRIVER'
      trip.notes = updatedNotes
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      toast.success(`Trip ${trip.tripNo} pushed to driver pool. Searching for nearby available drivers...`, {
        icon: '📡',
        duration: 4000,
      })
    } catch (err) {
      console.error('Failed to push to driver:', err)
      toast.error('Could not push to driver. Please try again.')
    } finally {
      setIsPushing(false)
    }
  }

  const handleApplyFareBoost = async (addedAmount: number) => {
    if (!trip || addedAmount <= 0) return
    setIsUpdatingFare(true)
    try {
      const current = getFinancialBreakdown(trip)
      const newBaseFare = current.baseFare + addedAmount
      const newConvFee = Math.round(newBaseFare * 0.06)
      const platformFee = 5
      const newTotalFare = newBaseFare + platformFee + newConvFee

      let notes = trip.notes || ''
      if (notes.includes('Agreed Base Fare:')) {
        notes = notes
          .replace(/\[Agreed Base Fare:\s*₹?\d+\]/gi, `[Agreed Base Fare: ₹${newBaseFare}]`)
          .replace(/\[Convenience Fee[^:]*:\s*\+?₹?\d+\]/gi, `[Convenience Fee (6%): +₹${newConvFee}]`)
          .replace(/\[Total Fare:\s*₹?\d+\]/gi, `[Total Fare: ₹${newTotalFare}]`)
      } else {
        notes = `${notes} [Agreed Base Fare: ₹${newBaseFare}] [Platform Fee: +₹5] [Convenience Fee (6%): +₹${newConvFee}] [Total Fare: ₹${newTotalFare}]`.trim()
      }

      const now = new Date().toISOString()
      notes = notes.includes('[PushedAt:')
        ? notes.replace(/\[PushedAt:[^\]]+\]/, `[PushedAt: ${now}]`)
        : `${notes} [PushedAt: ${now}]`.trim()

      await vendorApi.updateTrip(trip.id, {
        tripAmount: newTotalFare,
        notes,
        tripStatus: 'SEARCHING_DRIVER',
      })

      localStorage.setItem(`glide_pushed_${trip.id}`, Date.now().toString())
      setSearchSeconds(0)
      setSelectedBoost(null)
      setCustomBoost('')

      trip.tripAmount = newTotalFare
      trip.notes = notes

      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['trips'] })

      toast.success(
        `Fare increased by +₹${addedAmount}! New Total: ₹${newTotalFare} (Agreed: ₹${newBaseFare}, Conv (6%): ₹${newConvFee}). Re-broadcasted to drivers.`,
        { icon: '⚡', duration: 5000 }
      )
    } catch (err) {
      console.error('Failed to update trip fare:', err)
      toast.error('Could not update fare. Please try again.')
    } finally {
      setIsUpdatingFare(false)
    }
  }

  const activeBoostAmount = customBoost ? Math.max(0, Number(customBoost) || 0) : (selectedBoost || 0)
  const previewBaseFare = financials.baseFare + activeBoostAmount
  const previewConvFee = Math.round(previewBaseFare * 0.06)
  const previewPlatformFee = 5
  const previewTotalFare = previewBaseFare + previewPlatformFee + previewConvFee

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Trip ${trip.tripNo}`} width="w-[520px]">
      <div className="space-y-5">
        {/* Header Badges & Push to Driver Button */}
        <div className="flex items-center justify-between pb-3 border-b border-sky-100">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                isETS ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-sky-100 text-sky-800'
              }`}
            >
              {isETS ? 'ETS' : trip.serviceType}
            </span>
            <StatusBadge status={trip.tripStatus} />
          </div>
          <div className="flex items-center gap-2">
            <PaymentBadge status={trip.paymentStatus} />
            {trip.tripStatus !== 'COMPLETED' && trip.tripStatus !== 'CANCELLED' && (
              <button
                type="button"
                onClick={handlePushToDriver}
                disabled={isPushing || trip.tripStatus === 'SEARCHING_DRIVER'}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  trip.tripStatus === 'SEARCHING_DRIVER'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-amber-500/25'
                }`}
                title={
                  trip.tripStatus === 'SEARCHING_DRIVER'
                    ? 'Currently broadcasting to driver app'
                    : 'Push trip to driver pool'
                }
              >
                <Radio
                  className={`w-3.5 h-3.5 ${
                    trip.tripStatus === 'SEARCHING_DRIVER' ? 'animate-pulse text-amber-700' : 'text-white'
                  }`}
                />
                <span>{trip.tripStatus === 'SEARCHING_DRIVER' ? 'Searching Driver...' : 'Push to Driver'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Searching Driver Broadcast Banner & 2-Minute Fare Boost Panel */}
        {trip.tripStatus === 'SEARCHING_DRIVER' && (
          <div className="p-4 bg-gradient-to-b from-amber-50/90 via-orange-50/50 to-white rounded-2xl border border-amber-300 shadow-xs space-y-3.5 animate-in fade-in">
            {/* Header: Status + Elapsed Timer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-bold text-amber-950 text-xs sm:text-sm">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <span>Searching for Nearby Drivers</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-mono font-bold text-xs border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>
                  {Math.floor(searchSeconds / 60)
                    .toString()
                    .padStart(2, '0')}
                  :
                  {(searchSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* 2-Minute Inactivity Notification */}
            {searchSeconds >= 120 ? (
              <div className="p-3 bg-amber-100/90 rounded-xl border border-amber-300/80 flex items-start gap-2.5 text-xs text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">No driver accepted in 2 minutes!</p>
                  <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                    Trip has been broadcasting for over 2 minutes without an acceptance. Increase the trip fare below to incentivize nearby drivers to accept immediately.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-[11px] text-amber-800 bg-amber-50/80 px-3 py-1.5 rounded-lg border border-amber-200/60">
                <span>Broadcasting live on driver app ({Math.max(0, 120 - searchSeconds)}s until 2-min prompt)</span>
                <span className="font-bold text-amber-900">Incentive Boost Available</span>
              </div>
            )}

            {/* Fare Boost Options (Always visible when searching) */}
            <div className="pt-2 border-t border-amber-200/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>Select Trip Fare Incentive:</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Adds to Agreed Base Fare</span>
                </div>

                {/* Preset Increments & Custom Fare Input */}
                <div className="flex flex-wrap items-center gap-2">
                  {[20, 30, 50, 100].map((amt) => {
                    const isSelected = selectedBoost === amt && !customBoost
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setSelectedBoost(amt)
                          setCustomBoost('')
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs scale-105'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                        }`}
                      >
                        + ₹{amt}
                      </button>
                    )
                  })}

                  {/* Custom Fare Input */}
                  <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-200 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500">
                    <span className="text-xs font-bold text-slate-500">+ ₹</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="Custom"
                      value={customBoost}
                      onChange={(e) => {
                        setCustomBoost(e.target.value)
                        setSelectedBoost(null)
                      }}
                      className="w-16 text-xs font-bold text-slate-800 outline-none bg-transparent"
                    />
                  </div>
                </div>

                {/* Dynamic Fare Recalculation Preview Box */}
                {activeBoostAmount > 0 && (
                  <div className="p-3 bg-white/95 rounded-xl border border-amber-300 text-xs space-y-1.5 shadow-2xs animate-in fade-in">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>New Agreed Base Fare:</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(financials.baseFare)} →{' '}
                        <span className="text-amber-700">{formatCurrency(previewBaseFare)}</span>{' '}
                        <span className="text-[10px] text-emerald-600 font-semibold">(+₹{activeBoostAmount})</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500 text-[11px]">
                      <span>Platform Fee (fixed):</span>
                      <span className="font-semibold text-slate-700">+ ₹5</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Convenience Fee (6% of base):</span>
                      <span className="font-bold text-slate-900">
                        + {formatCurrency(previewConvFee)}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">
                          (+₹{previewConvFee - financials.convenienceFee})
                        </span>
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold text-sm">
                      <span className="text-slate-900">New Total Trip Fare:</span>
                      <span className="text-emerald-700 text-base font-extrabold">
                        {formatCurrency(previewTotalFare)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyFareBoost(activeBoostAmount)}
                      disabled={isUpdatingFare}
                      className="w-full mt-2.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-60"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {isUpdatingFare
                          ? 'Updating Fare & Re-broadcasting...'
                          : `Update Fare to ${formatCurrency(previewTotalFare)} & Re-broadcast`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
          </div>
        )}

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
                className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 backdrop-blur-md shadow-md transition-colors cursor-pointer"
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
                <p className="font-semibold text-emerald-800 text-[11px]">
                  {isETS ? 'Employee Pickup Location' : 'Customer Pickup Location'}
                </p>
                <p className="text-slate-800 text-xs font-medium leading-relaxed">{trip.pickup}</p>
              </div>
            </div>
            <div className="w-0.5 h-3 bg-sky-200 ml-1" />
            <div className="flex items-start gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-rose-800 text-[11px]">
                  {isETS ? 'Employee Drop Destination' : 'Customer Drop Destination'}
                </p>
                <p className="text-slate-800 text-xs font-medium leading-relaxed">{trip.drop}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Passenger / Employee Information */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-900 uppercase tracking-wider">
            <User className="w-4 h-4 text-sky-700" />
            <span>{isETS ? 'Employee Details' : 'Customer Details'}</span>
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
            {modelYear && (
              <div className="col-span-2 pt-1 border-t border-slate-100 flex items-center justify-between">
                <span className="text-slate-500">Vehicle Model Year:</span>
                <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                  {modelYear}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Financial & Payment Breakdown - Unfrozen */}
        <div className="card p-4 sm:p-5 bg-slate-50/80 rounded-2xl border border-sky-200/90 space-y-3 text-xs shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Financial & Payment Breakdown</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Active • Escrow Secured
            </span>
          </div>

          <div className="space-y-2 text-slate-600 pt-1">
            <div className="flex justify-between items-center text-slate-700">
              <span>Agreed Trip Fare:</span>
              <span className="font-bold text-slate-900 text-xs sm:text-sm">{formatCurrency(financials.baseFare)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-1">
                Platform Fee:
                <span className="text-[10px] text-slate-400 font-normal">(fixed)</span>
              </span>
              <span className="font-semibold text-slate-800">+ {formatCurrency(financials.platformFee)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-1">
                Convenience Fee (6%):
                <span className="text-[10px] text-slate-400 font-normal">(6% of agreed fare)</span>
              </span>
              <span className="font-semibold text-slate-800">+ {formatCurrency(financials.convenienceFee)}</span>
            </div>
            <div className="flex justify-between items-center font-bold text-emerald-700 pt-2.5 border-t border-slate-200 text-sm sm:text-base">
              <span>Total Trip Fare:</span>
              <span className="text-emerald-700 font-extrabold">{formatCurrency(financials.totalAmount)}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 pt-0.5">
            Wallet escrow debited and held in secure settlement for driver payout upon trip completion.
          </p>
        </div>

        {/* Vendor Notes */}
        <div className="card p-4 space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Notes / Instructions</span>
          </div>
          {vendorNotesClean ? (
            <p className="text-slate-800 font-medium whitespace-pre-wrap">{vendorNotesClean}</p>
          ) : (
            <p className="text-slate-400 italic text-[11px]">No additional notes or instructions provided by vendor.</p>
          )}
        </div>

        {/* Status Timeline */}
        <div className="card p-4 space-y-3">
          <h4 className="text-xs font-semibold text-sky-900 uppercase tracking-wider">
            Status History Timeline
          </h4>
          <TripStatusTimeline
            trip={trip}
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
