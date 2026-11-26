import React, { useState, useEffect, useRef } from 'react'
import { Modal } from '../ui/Modal'
import { MapPin, Search, ExternalLink, Check, Navigation2, X, Loader2 } from 'lucide-react'

interface LocationMapModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectLocation: (address: string, lat?: number, lng?: number) => void
  title?: string
  initialAddress?: string
}

export interface LocationSuggestion {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  type?: string
  district?: string
}

/**
 * Curated high-accuracy localities and landmarks for Bengaluru and Karnataka
 * Ensures 0ms instant matching for common localities, specially all "chik" variations.
 */
const KNOWN_LOCALITIES: LocationSuggestion[] = [
  // All common "Chik*" localities in Bengaluru & Karnataka
  {
    id: 'chik-chikkabanavara',
    name: 'Chikkabanavara',
    address: 'Chikkabanavara, Bengaluru North, Karnataka 560090',
    lat: 13.0827,
    lng: 77.5098,
    district: 'Bengaluru Urban',
  },
  {
    id: 'chik-chikmagalur',
    name: 'Chikmagalur (Chikkamagaluru)',
    address: 'Chikkamagaluru City, Chikmagalur District, Karnataka 577101',
    lat: 13.3161,
    lng: 75.7720,
    district: 'Chikkamagaluru',
  },
  {
    id: 'chik-chikkaballapur',
    name: 'Chikkaballapur',
    address: 'Chikkaballapur Town, Chikkaballapur District, Karnataka 562101',
    lat: 13.4355,
    lng: 77.7275,
    district: 'Chikkaballapur',
  },
  {
    id: 'chik-chikpet',
    name: 'Chikpet',
    address: 'Chikpet, Chickpet Metro Station area, Bengaluru, Karnataka 560053',
    lat: 12.9698,
    lng: 77.5760,
    district: 'Central Bengaluru',
  },
  {
    id: 'chik-chikkalasandra',
    name: 'Chikkalasandra',
    address: 'Chikkalasandra, Uttarahalli Hobli, Bengaluru South, Karnataka 560061',
    lat: 12.9128,
    lng: 77.5458,
    district: 'Bengaluru South',
  },
  {
    id: 'chik-chikkajala',
    name: 'Chikkajala',
    address: 'Chikkajala, Airport Road, Bengaluru North, Karnataka 562157',
    lat: 13.1678,
    lng: 77.6293,
    district: 'Bengaluru North',
  },
  {
    id: 'chik-chikka-tirupathi',
    name: 'Chikka Tirupathi',
    address: 'Chikka Tirupathi, Malur-Hosur Road, Bengaluru Rural, Karnataka 563160',
    lat: 12.8943,
    lng: 77.8540,
    district: 'Bengaluru Rural',
  },
  {
    id: 'chik-chikka-bidarakallu',
    name: 'Chikka Bidarakallu',
    address: 'Chikka Bidarakallu, Tumkur Road, Dasanapura, Bengaluru, Karnataka 560073',
    lat: 13.0645,
    lng: 77.4891,
    district: 'Bengaluru West',
  },
  {
    id: 'chik-chikkakannalli',
    name: 'Chikkakannalli',
    address: 'Chikkakannalli, Sarjapur Main Road, Bengaluru, Karnataka 560035',
    lat: 12.9056,
    lng: 77.6974,
    district: 'Bengaluru East',
  },
  {
    id: 'chik-chikkagubbi',
    name: 'Chikkagubbi',
    address: 'Chikkagubbi, Hennur Bagalur Main Road, Bengaluru, Karnataka 560077',
    lat: 13.0768,
    lng: 77.6698,
    district: 'Bengaluru North',
  },
  {
    id: 'chik-chikkabettahalli',
    name: 'Chikkabettahalli',
    address: 'Chikkabettahalli, Vidyaranyapura, Bengaluru North, Karnataka 560097',
    lat: 13.0850,
    lng: 77.5610,
    district: 'Bengaluru North',
  },
  {
    id: 'chik-chikkathogur',
    name: 'Chikkathogur',
    address: 'Chikkathogur, Electronic City Phase 1, Bengaluru, Karnataka 560100',
    lat: 12.8468,
    lng: 77.6710,
    district: 'Electronic City',
  },
  {
    id: 'chik-chikka-begur',
    name: 'Chikka Begur',
    address: 'Chikka Begur, Kudlu Gate, Hosur Road, Bengaluru, Karnataka 560068',
    lat: 12.8870,
    lng: 77.6380,
    district: 'Bengaluru South',
  },
  {
    id: 'chik-chikkabidarakallu-metro',
    name: 'Chikkabidarakallu (Jindal) Metro',
    address: 'Chikkabidarakallu Metro Station, Green Line, Bengaluru, Karnataka 560073',
    lat: 13.0552,
    lng: 77.4952,
    district: 'Namma Metro Green Line',
  },

  // Popular Corporate Hubs & Bengaluru Localities
  {
    id: 'hub-manyata',
    name: 'Manyata Tech Park',
    address: 'Manyata Tech Park, Nagavara / Hebbal, Outer Ring Road, Bengaluru, 560045',
    lat: 13.0475,
    lng: 77.6202,
    district: 'North Bengaluru',
  },
  {
    id: 'hub-indiranagar',
    name: 'Indiranagar 100ft Rd',
    address: '100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru, 560038',
    lat: 12.9784,
    lng: 77.6408,
    district: 'East Bengaluru',
  },
  {
    id: 'hub-koramangala',
    name: 'Koramangala 4th Block',
    address: '80 Feet Rd, 4th Block, Koramangala, Bengaluru, 560034',
    lat: 12.9352,
    lng: 77.6245,
    district: 'South Bengaluru',
  },
  {
    id: 'hub-mg-road',
    name: 'MG Road Metro',
    address: 'MG Road, Shanthala Nagar, Ashok Nagar, Bengaluru, 560001',
    lat: 12.9756,
    lng: 77.6066,
    district: 'Central Bengaluru',
  },
  {
    id: 'hub-whitefield',
    name: 'Whitefield ITPL',
    address: 'International Tech Park (ITPL), Whitefield Main Rd, Bengaluru, 560066',
    lat: 12.9863,
    lng: 77.7383,
    district: 'Whitefield',
  },
  {
    id: 'hub-ecity-1',
    name: 'Electronic City Phase 1',
    address: 'Hosur Rd, Electronic City Phase 1, Bengaluru, 560100',
    lat: 12.8452,
    lng: 77.6602,
    district: 'Electronic City',
  },
  {
    id: 'hub-ecity-2',
    name: 'Electronic City Phase 2',
    address: 'Electronic City Phase 2, Hosur Road, Bengaluru, 560100',
    lat: 12.8488,
    lng: 77.6830,
    district: 'Electronic City',
  },
  {
    id: 'hub-hsr',
    name: 'HSR Layout Sector 1',
    address: '27th Main Rd, Sector 1, HSR Layout, Bengaluru, 560102',
    lat: 12.9121,
    lng: 77.6446,
    district: 'South-East Bengaluru',
  },
  {
    id: 'hub-hebbal',
    name: 'Hebbal Flyover',
    address: 'Hebbal Flyover, Bellary Rd, Outer Ring Road, Bengaluru, 560024',
    lat: 13.0358,
    lng: 77.5970,
    district: 'North Bengaluru',
  },
  {
    id: 'hub-bellandur',
    name: 'Bellandur EcoSpace',
    address: 'Outer Ring Rd, RMZ EcoSpace, Bellandur, Bengaluru, 560103',
    lat: 12.9260,
    lng: 77.6833,
    district: 'Outer Ring Road',
  },
  {
    id: 'hub-marathahalli',
    name: 'Marathahalli Bridge',
    address: 'Marathahalli Bridge, Outer Ring Road, Bengaluru, Karnataka 560037',
    lat: 12.9591,
    lng: 77.6974,
    district: 'East Bengaluru',
  },
  {
    id: 'hub-btm',
    name: 'BTM Layout 2nd Stage',
    address: 'Outer Ring Road, BTM 2nd Stage, Bengaluru, Karnataka 560076',
    lat: 12.9165,
    lng: 77.6101,
    district: 'South Bengaluru',
  },
  {
    id: 'hub-jayanagar',
    name: 'Jayanagar 4th Block',
    address: 'Jayanagar 4th Block Shopping Complex, Bengaluru, Karnataka 560011',
    lat: 12.9298,
    lng: 77.5828,
    district: 'South Bengaluru',
  },
  {
    id: 'hub-jp-nagar',
    name: 'JP Nagar 6th Phase',
    address: 'Ring Road, JP Nagar 6th Phase, Bengaluru, Karnataka 560078',
    lat: 12.9063,
    lng: 77.5855,
    district: 'South Bengaluru',
  },
  {
    id: 'hub-malleshwaram',
    name: 'Malleshwaram 8th Cross',
    address: 'Margosa Road, Malleshwaram, Bengaluru, Karnataka 560003',
    lat: 13.0031,
    lng: 77.5702,
    district: 'West Bengaluru',
  },
  {
    id: 'hub-rajajinagar',
    name: 'Rajajinagar 1st Block',
    address: 'Dr Rajkumar Road, Rajajinagar, Bengaluru, Karnataka 560010',
    lat: 12.9982,
    lng: 77.5530,
    district: 'West Bengaluru',
  },
  {
    id: 'hub-yelahanka',
    name: 'Yelahanka New Town',
    address: 'Yelahanka New Town, Bengaluru North, Karnataka 560064',
    lat: 13.0998,
    lng: 77.5963,
    district: 'North Bengaluru',
  },
  {
    id: 'hub-airport-t1',
    name: 'Kempegowda Airport Terminal 1',
    address: 'Terminal 1, Kempegowda International Airport (BLR), Devanahalli, Bengaluru, Karnataka 560300',
    lat: 13.1989,
    lng: 77.7068,
    district: 'Airport (BLR)',
  },
  {
    id: 'hub-airport-t2',
    name: 'Kempegowda Airport Terminal 2',
    address: 'Terminal 2, Kempegowda International Airport (BLR), Devanahalli, Bengaluru, Karnataka 560300',
    lat: 13.2045,
    lng: 77.7120,
    district: 'Airport (BLR)',
  },
  {
    id: 'city-mysore',
    name: 'Mysuru (Mysore)',
    address: 'Mysuru City, Mysore District, Karnataka 570001',
    lat: 12.2958,
    lng: 76.6394,
    district: 'Mysuru',
  },
  {
    id: 'city-tumkur',
    name: 'Tumakuru (Tumkur)',
    address: 'Tumakuru City, Tumkur District, Karnataka 572101',
    lat: 13.3392,
    lng: 77.1017,
    district: 'Tumakuru',
  },
  {
    id: 'city-hassan',
    name: 'Hassan',
    address: 'Hassan City, Hassan District, Karnataka 573201',
    lat: 13.0033,
    lng: 76.1004,
    district: 'Hassan',
  },
  {
    id: 'city-mangaluru',
    name: 'Mangaluru (Mangalore)',
    address: 'Mangaluru City, Dakshina Kannada, Karnataka 575001',
    lat: 12.9141,
    lng: 74.8560,
    district: 'Dakshina Kannada',
  },
  {
    id: 'city-udupi',
    name: 'Udupi',
    address: 'Udupi City, Udupi District, Karnataka 576101',
    lat: 13.3409,
    lng: 74.7421,
    district: 'Udupi',
  },
  {
    id: 'city-shivamogga',
    name: 'Shivamogga (Shimoga)',
    address: 'Shivamogga City, Shimoga District, Karnataka 577201',
    lat: 13.9299,
    lng: 75.5681,
    district: 'Shivamogga',
  },
  {
    id: 'city-hubballi',
    name: 'Hubballi (Hubli)',
    address: 'Hubballi City, Dharwad District, Karnataka 580020',
    lat: 15.3647,
    lng: 75.1240,
    district: 'Dharwad',
  },
]

const POPULAR_HUBS = KNOWN_LOCALITIES.slice(14, 23)

export const LocationMapModal: React.FC<LocationMapModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  title = 'Select Location on Map',
  initialAddress = '',
}) => {
  const [selectedAddress, setSelectedAddress] = useState(initialAddress)
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({ lat: 12.9716, lng: 77.5946 })
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isLiveFetching, setIsLiveFetching] = useState(false)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<any>(null)
  const activeReqRef = useRef<number>(0)

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
      setShowDropdown(false)
      setSuggestions([])
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reverse geocoding when clicking or dragging marker
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      if (data && data.display_name) {
        setSelectedAddress(data.display_name)
      } else {
        setSelectedAddress(`Location at (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
      }
    } catch {
      setSelectedAddress(`Location at (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
    }
  }

  /**
   * Fast local search + debounced geocoder autocomplete
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    setActiveIndex(-1)

    const clean = val.trim().toLowerCase()
    if (!clean) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    // 1. Instant local filter (0ms delay)
    const localMatches = KNOWN_LOCALITIES.filter((loc) => {
      const nameMatch = loc.name.toLowerCase().includes(clean)
      const addrMatch = loc.address.toLowerCase().includes(clean)
      const distMatch = loc.district?.toLowerCase().includes(clean)
      return nameMatch || addrMatch || distMatch
    })

    // Sort to prioritize items whose name starts with the search query
    localMatches.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(clean)
      const bStarts = b.name.toLowerCase().startsWith(clean)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      return 0
    })

    setSuggestions(localMatches)
    setShowDropdown(true)

    // 2. Debounced online Nominatim query for any other place or specific address
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    if (clean.length >= 2) {
      const reqId = Date.now()
      activeReqRef.current = reqId
      setIsLiveFetching(true)

      debounceTimerRef.current = setTimeout(async () => {
        try {
          const q = encodeURIComponent(`${clean}, Karnataka, India`)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=6&addressdetails=1`
          )
          const data = await res.json()

          if (activeReqRef.current === reqId && Array.isArray(data)) {
            const onlineResults: LocationSuggestion[] = data.map((item: any, i: number) => ({
              id: `online-${item.place_id || i}`,
              name: item.name || item.display_name.split(',')[0],
              address: item.display_name,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              district: item.address?.state_district || item.address?.city || 'Karnataka',
            }))

            // Merge local and online, avoiding duplicate coordinates or identical names
            setSuggestions((prev) => {
              const seen = new Set(prev.map((p) => p.name.toLowerCase().trim()))
              const filteredOnline = onlineResults.filter((o) => !seen.has(o.name.toLowerCase().trim()))
              return [...prev, ...filteredOnline]
            })
          }
        } catch (err) {
          console.warn('Live geocode search error:', err)
        } finally {
          if (activeReqRef.current === reqId) {
            setIsLiveFetching(false)
          }
        }
      }, 300)
    } else {
      setIsLiveFetching(false)
    }
  }

  /**
   * Apply selected location to map and input
   */
  const applyLocation = (name: string, address: string, lat: number, lng: number) => {
    setSelectedCoords({ lat, lng })
    setSelectedAddress(address)
    setSearchQuery(name)
    setShowDropdown(false)
    setSuggestions([])

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lng], 15)
      markerRef.current.setLatLng([lat, lng])
      markerRef.current.bindPopup(`<b>${name}</b><br/><span style="font-size:11px">${address}</span>`).openPopup()
    }
  }

  // Handle manual Enter / click Search Map
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) return

    // If an item in dropdown is active or there is a top suggestion matching, pick it
    if (suggestions.length > 0) {
      const pick = activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0]
      applyLocation(pick.name, pick.address, pick.lat, pick.lng)
      return
    }

    setIsSearching(true)
    setShowDropdown(false)
    try {
      const q = encodeURIComponent(`${searchQuery}, Karnataka, India`)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`)
      const results = await res.json()
      if (results && results.length > 0) {
        const item = results[0]
        const lat = parseFloat(item.lat)
        const lng = parseFloat(item.lon)
        applyLocation(item.display_name.split(',')[0], item.display_name, lat, lng)
      }
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  // Keyboard navigation for dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        const item = suggestions[activeIndex]
        applyLocation(item.name, item.address, item.lat, item.lng)
      } else {
        handleSearchSubmit()
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  const handleSelectHub = (hub: typeof POPULAR_HUBS[0]) => {
    applyLocation(hub.name, hub.address, hub.lat, hub.lng)
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
        {/* Search Bar with Live Autocomplete */}
        <div ref={searchContainerRef} className="relative z-[2000]">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search locality (e.g. Chik, Indiranagar, ITPL Whitefield)..."
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0) setShowDropdown(true)
                }}
                className="input pl-10 pr-9 text-xs sm:text-sm font-medium w-full shadow-sm focus:ring-2 focus:ring-blue-500"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSuggestions([])
                    setShowDropdown(false)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="btn-accent text-xs px-4 py-2 font-bold whitespace-nowrap shadow-sm flex items-center gap-1.5"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                'Search Map'
              )}
            </button>
          </form>

          {/* Autocomplete Dropdown List */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-200/90 overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                <span>Suggested Localities</span>
                {isLiveFetching ? (
                  <span className="flex items-center gap-1 text-blue-600 font-normal">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Searching places...
                  </span>
                ) : (
                  <span>{suggestions.length} places found</span>
                )}
              </div>

              {suggestions.length > 0 ? (
                suggestions.map((loc, idx) => {
                  const isCurrentActive = idx === activeIndex
                  return (
                    <div
                      key={loc.id || `${loc.lat}-${loc.lng}-${idx}`}
                      onClick={() => applyLocation(loc.name, loc.address, loc.lat, loc.lng)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`px-3.5 py-2.5 flex items-start gap-2.5 cursor-pointer transition-colors ${
                        isCurrentActive ? 'bg-blue-50/90 text-blue-900' : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="p-1 rounded-lg bg-blue-100/80 text-blue-700 flex-shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold truncate text-slate-900">
                            {loc.name}
                          </p>
                          {loc.district && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium whitespace-nowrap">
                              {loc.district}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5 font-normal">
                          {loc.address}
                        </p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="px-4 py-3 text-center text-xs text-slate-500">
                  No matching locations found. Press "Search Map" to query broader Karnataka.
                </div>
              )}
            </div>
          )}
        </div>

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
              {selectedAddress || searchQuery || 'Click on the map or choose a location above'}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
