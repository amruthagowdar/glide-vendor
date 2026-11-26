import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  MapPin,
  Navigation,
  Clock,
  Calendar,
  Check,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  MessageCircle,
  Loader2,
  Building2,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export const ShareLocationPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const employeeName = searchParams.get('name') || 'Employee'
  const tripDate = searchParams.get('tripDate') || new Date().toISOString().split('T')[0]
  const pickupTime = searchParams.get('pickup') || '08:30 AM'
  const tripType = searchParams.get('type') || 'Login'

  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [address, setAddress] = useState<string>('')
  const [isCopied, setIsCopied] = useState(false)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  // Reverse geocode coords to address
  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      )
      if (res.ok) {
        const data = await res.json()
        if (data && data.display_name) {
          setAddress(data.display_name)
          return
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
          if (parts.length > 0) {
            setAddress(parts.join(', '))
            return
          }
        }
      }
    } catch {}

    setAddress(`Home Location at (${lat.toFixed(5)}, ${lng.toFixed(5)})`)
  }

  // Request GPS Location
  const requestLocation = () => {
    setIsLoading(true)
    setErrorMsg(null)

    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your mobile browser. Please share your location from Google Maps directly.')
      setIsLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        setIsLoading(false)
        await fetchAddress(lat, lng)
      },
      (err) => {
        setIsLoading(false)
        if (err.code === 1) {
          // PERMISSION_DENIED
          setErrorMsg(
            'Location access was blocked. Please enable Location/GPS in your browser or phone settings, then tap Retry.'
          )
        } else if (err.code === 2) {
          // POSITION_UNAVAILABLE
          setErrorMsg(
            'GPS Location is currently turned off on your device. Please turn ON Location/GPS in your phone notification bar and tap Retry.'
          )
        } else {
          setErrorMsg(
            'Unable to acquire your GPS location. Please make sure Location/GPS is turned on and try again.'
          )
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    requestLocation()
  }, [])

  // Initialize or update Leaflet map once coordinates are acquired
  useEffect(() => {
    if (!coords || !mapContainerRef.current) return

    const timer = setTimeout(() => {
      const L = (window as any).L
      if (!L) return

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([coords.lat, coords.lng], 17)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map)

        const marker = L.marker([coords.lat, coords.lng], { draggable: true }).addTo(map)
        marker.bindPopup(`<b>${employeeName}'s Residence</b><br>📍 Drag pin to fine-tune exact door`).openPopup()

        marker.on('dragend', async () => {
          const pos = marker.getLatLng()
          setCoords({ lat: pos.lat, lng: pos.lng })
          await fetchAddress(pos.lat, pos.lng)
        })

        mapInstanceRef.current = map
        markerRef.current = marker
      } else {
        mapInstanceRef.current.setView([coords.lat, coords.lng], 17)
        if (markerRef.current) {
          markerRef.current.setLatLng([coords.lat, coords.lng])
        }
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [coords])

  const mapsUrl = coords ? `https://maps.google.com/?q=${coords.lat},${coords.lng}` : ''

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    if (!coords) return
    const text = encodeURIComponent(
      `Hi Atharva Travels, here is my confirmed home ${tripType === 'Login' ? 'pickup' : 'drop'} location for my upcoming shift on ${tripDate} (Pickup: ${pickupTime}):\n\n` +
      `📍 Coordinates: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}\n` +
      (address ? `🏠 Address: ${address}\n` : '') +
      `🗺️ Google Maps: ${mapsUrl}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  // Copy details
  const handleCopy = () => {
    if (!coords) return
    const text =
      `Atharva Travels Home Location for ${employeeName}:\n` +
      `Coordinates: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}\n` +
      (address ? `Address: ${address}\n` : '') +
      `Google Maps: ${mapsUrl}`
    navigator.clipboard.writeText(text)
    setIsCopied(true)
    toast.success('Location copied to clipboard!')
    setTimeout(() => setIsCopied(false), 2500)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      <Toaster position="top-center" />

      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-3.5 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                Atharva Travels
              </h1>
              <span className="text-[10px] text-slate-500 font-medium">ETS Corporate Fleet</span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Location Share
          </span>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4">
        {/* Welcome Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Welcome
              </span>
              <h2 className="text-lg font-bold text-slate-900">{employeeName}</h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
              <Navigation className="w-5 h-5" />
            </div>
          </div>

          {/* Shift Details */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Trip Date</span>
                <span className="font-bold text-slate-800">{tripDate}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Scheduled Pickup</span>
                <span className="font-bold text-blue-700">{pickupTime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* GPS Detection Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>Your Live Home Location</span>
            </h3>
            {coords && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3" />
                GPS Acquired
              </span>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <div>
                <p className="text-sm font-bold text-slate-800">Detecting your location...</p>
                <p className="text-xs text-slate-500 mt-0.5">Please allow location access when prompted</p>
              </div>
            </div>
          )}

          {/* Error State: Location turned off */}
          {!isLoading && errorMsg && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-900">Location is turned off or denied</p>
                  <p className="text-xs text-amber-800 leading-relaxed">{errorMsg}</p>
                </div>
              </div>

              <div className="bg-white/80 p-3 rounded-lg border border-amber-200/60 text-[11px] text-slate-700 space-y-1">
                <p className="font-bold text-slate-900">How to turn on Location:</p>
                <p>1. Swipe down from top of screen to open your phone's notification panel.</p>
                <p>2. Tap the <b>Location / GPS</b> icon to turn it ON.</p>
                <p>3. Tap the blue button below to retry.</p>
              </div>

              <button
                type="button"
                onClick={requestLocation}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Turn On & Retry Location</span>
              </button>
            </div>
          )}

          {/* Location Acquired State */}
          {!isLoading && coords && (
            <div className="space-y-3">
              {/* Interactive Mini Map */}
              <div
                ref={mapContainerRef}
                className="w-full h-44 rounded-xl border border-slate-200 overflow-hidden shadow-inner z-0"
              />

              {/* Resolved Address */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Resolved Street Address
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold">
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-800 leading-snug">
                  {address || 'Fetching address details...'}
                </p>
              </div>

              <p className="text-[11px] text-slate-500 text-center">
                📍 You can drag the red pin on the map to fine-tune your exact door.
              </p>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send Location via WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Location Copied!' : 'Copy Location & Link'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-[11px] text-slate-400">
        Atharva Travels &bull; Corporate Employee Transportation
      </footer>
    </div>
  )
}
