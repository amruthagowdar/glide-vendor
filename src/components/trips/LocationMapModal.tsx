import React, { useState, useEffect, useRef } from 'react'
import { Modal } from '../ui/Modal'
import { MapPin, Search, ExternalLink, Check, Navigation2 } from 'lucide-react'

interface LocationMapModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectLocation: (address: string, lat?: number, lng?: number) => void
  title?: string
  initialAddress?: string
}

const POPULAR_HUBS = [
  { name: 'Manyata Tech Park', address: 'Manyata Tech Park, Hebbal, Bengaluru, 560045', lat: 13.0475, lng: 77.6202 },
  { name: 'Indiranagar 100ft Rd', address: '100 Feet Rd, Indiranagar, Bengaluru, 560038', lat: 12.9784, lng: 77.6408 },
  { name: 'Koramangala 4th Block', address: '80 Feet Rd, 4th Block, Koramangala, Bengaluru, 560034', lat: 12.9352, lng: 77.6245 },
  { name: 'MG Road Metro', address: 'MG Road, Shanthala Nagar, Ashok Nagar, Bengaluru, 560001', lat: 12.9756, lng: 77.6066 },
  { name: 'Whitefield ITPL', address: 'ITPL Main Rd, Whitefield, Bengaluru, 560066', lat: 12.9863, lng: 77.7383 },
  { name: 'Electronic City Ph 1', address: 'Hosur Rd, Electronic City Phase 1, Bengaluru, 560100', lat: 12.8452, lng: 77.6602 },
  { name: 'HSR Layout Sector 1', address: '27th Main Rd, Sector 1, HSR Layout, Bengaluru, 560102', lat: 12.9121, lng: 77.6446 },
  { name: 'Hebbal Flyover', address: 'Hebbal Flyover, Bellary Rd, Bengaluru, 560024', lat: 13.0358, lng: 77.5970 },
  { name: 'Bellandur EcoSpace', address: 'Outer Ring Rd, Bellandur, Bengaluru, 560103', lat: 12.9260, lng: 77.6833 },
]

export const LocationMapModal: React.FC<LocationMapModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  title = 'Select Bengaluru Location on Map',
  initialAddress = '',
}) => {
  const [selectedAddress, setSelectedAddress] = useState(initialAddress)
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({ lat: 12.9716, lng: 77.5946 })
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  useEffect(() => {
    if (initialAddress) {
      setSelectedAddress(initialAddress)
      setSearchQuery(initialAddress)
    }
  }, [initialAddress])

  // Initialize Leaflet Map when modal opens
  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      return
    }

    const timer = setTimeout(() => {
      const L = (window as any).L
      if (!L || !mapContainerRef.current) return

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([selectedCoords.lat, selectedCoords.lng], 13)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map)

        const marker = L.marker([selectedCoords.lat, selectedCoords.lng], { draggable: true }).addTo(map)
        marker.bindPopup('<b>Selected Location</b><br>Drag pin or click map to change').openPopup()

        marker.on('dragend', async () => {
          const pos = marker.getLatLng()
          setSelectedCoords({ lat: pos.lat, lng: pos.lng })
          reverseGeocode(pos.lat, pos.lng)
        })

        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng)
          setSelectedCoords({ lat: e.latlng.lat, lng: e.latlng.lng })
          reverseGeocode(e.latlng.lat, e.latlng.lng)
        })

        mapInstanceRef.current = map
        markerRef.current = marker
      } else {
        mapInstanceRef.current.invalidateSize()
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [isOpen])

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      if (data && data.display_name) {
        setSelectedAddress(data.display_name)
      } else {
        setSelectedAddress(`Location at (${lat.toFixed(4)}, ${lng.toFixed(4)}), Bengaluru`)
      }
    } catch {
      setSelectedAddress(`Location at (${lat.toFixed(4)}, ${lng.toFixed(4)}), Bengaluru`)
    }
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const q = encodeURIComponent(`${searchQuery}, Bengaluru, Karnataka`)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`)
      const results = await res.json()
      if (results && results.length > 0) {
        const item = results[0]
        const lat = parseFloat(item.lat)
        const lng = parseFloat(item.lon)
        setSelectedCoords({ lat, lng })
        setSelectedAddress(item.display_name)

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 15)
          markerRef.current.setLatLng([lat, lng])
          markerRef.current.bindPopup(`<b>${item.display_name}</b>`).openPopup()
        }
      }
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectHub = (hub: typeof POPULAR_HUBS[0]) => {
    setSelectedCoords({ lat: hub.lat, lng: hub.lng })
    setSelectedAddress(hub.address)
    setSearchQuery(hub.name)

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([hub.lat, hub.lng], 15)
      markerRef.current.setLatLng([hub.lat, hub.lng])
      markerRef.current.bindPopup(`<b>${hub.name}</b><br>${hub.address}`).openPopup()
    }
  }

  const handleConfirm = () => {
    onSelectLocation(selectedAddress || searchQuery, selectedCoords.lat, selectedCoords.lng)
    onClose()
  }

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    selectedAddress || `${selectedCoords.lat},${selectedCoords.lng}`
  )}`

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
          >
            <span>Open in Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedAddress && !searchQuery}
              className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm Location</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search locality or landmark in Bengaluru (e.g. Indiranagar, ITPL Whitefield)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 text-xs sm:text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="btn-accent text-xs px-4 py-2 font-bold whitespace-nowrap"
          >
            {isSearching ? 'Searching...' : 'Search Map'}
          </button>
        </form>

        {/* Quick Hub Chips */}
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Popular Bengaluru Hubs:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_HUBS.slice(0, 7).map((hub) => (
              <button
                key={hub.name}
                type="button"
                onClick={() => handleSelectHub(hub)}
                className="px-2.5 py-1 text-[11px] rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition-colors border border-slate-200/60"
              >
                {hub.name}
              </button>
            ))}
          </div>
        </div>

        {/* Map Container */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner h-[280px]">
          <div ref={mapContainerRef} className="w-full h-full" />
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-semibold text-slate-700 shadow border border-slate-200 pointer-events-none z-[1000]">
            📍 Click map or drag pin to pick location
          </div>
        </div>

        {/* Selected Address Display */}
        <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-start gap-2.5 text-xs">
          <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-blue-950">Selected Address: </span>
            <span className="text-blue-900 font-medium break-words">
              {selectedAddress || searchQuery || 'Click on the map or choose a popular hub above'}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
