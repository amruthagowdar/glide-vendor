/**
 * ETS Road-based Route Optimizer and OSRM Road Geometry Service
 */

export interface GeoPoint {
  lat: number
  lng: number
  name?: string
  address?: string
}

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
  status: 'BOARDING' | 'ON_ROUTE' | 'ARRIVED' | 'COMPLETED'
  currentCoords: { lat: number; lng: number }
  hubCoords: { lat: number; lng: number }
  driverHomeCoords?: { lat: number; lng: number }
  currentStepIndex?: number // 0: at driver home, 1..N: at stop k, N+1: arrived at hub
  stops: { name: string; address: string; lat: number; lng: number; status: 'PICKED' | 'NEXT' | 'PENDING'; pickupTime?: string }[]
}

export interface ShiftStageInfo {
  stageIndex: number
  totalStages: number
  stageTitle: string
  stageDesc: string
  statusBadge: string
  seatsFilled: number
  currentCoords: { lat: number; lng: number }
  remainingWaypoints: { lat: number; lng: number }[]
  updatedStops: { name: string; address: string; lat: number; lng: number; status: 'PICKED' | 'NEXT' | 'PENDING' }[]
}

/**
 * Returns stage telemetry and road waypoints for a live shift:
 * - Stage 0: Driver at home depot, heading to Stop 1 (Farthest).
 * - Stage 1 to N: Driver picks up employee at Stop k, heading to next stop or hub.
 * - Stage N+1: Arrived at destination Corporate Hub.
 */
export function getShiftStageInfo(shift: LiveShiftCab): ShiftStageInfo {
  const orderedStops = sortStopsFarthestFirst(shift.stops, shift.hubCoords)
  const totalStops = orderedStops.length
  const totalStages = totalStops + 1 // Stage 0 to totalStops

  // Driver home default (e.g. BTM Layout / Jayanagar area)
  const driverHome = shift.driverHomeCoords || {
    lat: shift.hubCoords.lat + 0.076,
    lng: shift.hubCoords.lng - 0.067,
  }

  const rawIndex = shift.currentStepIndex ?? 0
  const stageIndex = Math.max(0, Math.min(rawIndex, totalStages))

  let currentCoords: { lat: number; lng: number }
  let remainingWaypoints: { lat: number; lng: number }[] = []
  let stageTitle = ''
  let stageDesc = ''
  let statusBadge = ''
  let seatsFilled = 0

  if (stageIndex === 0) {
    // Driver at home
    currentCoords = driverHome
    seatsFilled = 0
    stageTitle = 'Driver En Route to Stop #1'
    stageDesc = `Driver dispatched from home. Traveling to first pickup: ${orderedStops[0]?.name || 'Employee 1'} (Farthest from hub).`
    statusBadge = 'DISPATCHED'
    remainingWaypoints = [
      driverHome,
      ...orderedStops.map((s) => ({ lat: s.lat, lng: s.lng })),
      { lat: shift.hubCoords.lat, lng: shift.hubCoords.lng },
    ]
  } else if (stageIndex <= totalStops) {
    // At Stop #stageIndex
    const currentStop = orderedStops[stageIndex - 1]
    currentCoords = { lat: currentStop.lat, lng: currentStop.lng }
    seatsFilled = stageIndex

    const isLastStop = stageIndex === totalStops
    if (isLastStop) {
      stageTitle = `Stop #${stageIndex}: ${currentStop.name} (Nearest to Hub)`
      stageDesc = `All ${totalStops} employees boarded! Driving directly to ${shift.hubName} along shortest road path.`
      statusBadge = 'HEADING TO HUB'
      remainingWaypoints = [
        { lat: currentStop.lat, lng: currentStop.lng },
        { lat: shift.hubCoords.lat, lng: shift.hubCoords.lng },
      ]
    } else {
      const nextStop = orderedStops[stageIndex]
      stageTitle = `Stop #${stageIndex}: ${currentStop.name} Boarded`
      stageDesc = `${currentStop.name} picked up (${seatsFilled}/${totalStops} seats). Route updated: heading ~10 km to Stop #${stageIndex + 1} (${nextStop?.name}).`
      statusBadge = 'ON ROUTE'
      remainingWaypoints = [
        { lat: currentStop.lat, lng: currentStop.lng },
        ...orderedStops.slice(stageIndex).map((s) => ({ lat: s.lat, lng: s.lng })),
        { lat: shift.hubCoords.lat, lng: shift.hubCoords.lng },
      ]
    }
  } else {
    // Stage N+1: Arrived at Corporate Hub
    currentCoords = { lat: shift.hubCoords.lat, lng: shift.hubCoords.lng }
    seatsFilled = totalStops
    stageTitle = `Arrived at ${shift.hubName}`
    stageDesc = `Escort-compliant corporate arrival confirmed at ${shift.hubName}. Shift completed successfully.`
    statusBadge = 'ARRIVED'
    remainingWaypoints = [{ lat: shift.hubCoords.lat, lng: shift.hubCoords.lng }]
  }

  // Update stops statuses
  const updatedStops = orderedStops.map((s, idx) => {
    let status: 'PICKED' | 'NEXT' | 'PENDING' = 'PENDING'
    if (stageIndex > idx + 1 || (stageIndex === idx + 1)) {
      status = 'PICKED'
    } else if (stageIndex === idx) {
      status = 'NEXT'
    }
    return {
      ...s,
      status,
    }
  })

  return {
    stageIndex,
    totalStages,
    stageTitle,
    stageDesc,
    statusBadge,
    seatsFilled,
    currentCoords,
    remainingWaypoints,
    updatedStops,
  }
}

/**
 * Progresses shift to the next or specified stage and returns the updated shift object
 */
export function progressShiftStage(shift: LiveShiftCab, targetIndex?: number): LiveShiftCab {
  const orderedStops = sortStopsFarthestFirst(shift.stops, shift.hubCoords)
  const totalStages = orderedStops.length + 1

  let nextIndex: number
  if (typeof targetIndex === 'number') {
    nextIndex = Math.max(0, Math.min(targetIndex, totalStages))
  } else {
    const cur = shift.currentStepIndex ?? 0
    nextIndex = cur >= totalStages ? 0 : cur + 1
  }

  const stageInfo = getShiftStageInfo({
    ...shift,
    currentStepIndex: nextIndex,
  })

  return {
    ...shift,
    currentStepIndex: nextIndex,
    currentCoords: stageInfo.currentCoords,
    seatsUsed: stageInfo.seatsFilled,
    status: nextIndex >= totalStages ? 'ARRIVED' : 'ON_ROUTE',
    stops: stageInfo.updatedStops,
  }
}

/**
 * Sorts employee stops for Inbound / Login Shift:
 * 1. Stop 1: Farthest employee from the corporate office hub.
 * 2. Intermediate stops: Picked up in sequence as the vehicle approaches the office.
 * 3. Last Stop: The nearest employee to the office hub.
 * 4. Destination: Final leg into the corporate office hub in the shortest road path.
 */
export function sortStopsFarthestFirst<T extends { lat: number; lng: number }>(
  stops: T[],
  hubCoords: { lat: number; lng: number }
): T[] {
  return [...stops].sort((a, b) => {
    const distA = Math.hypot(Number(a.lat) - hubCoords.lat, Number(a.lng) - hubCoords.lng)
    const distB = Math.hypot(Number(b.lat) - hubCoords.lat, Number(b.lng) - hubCoords.lng)
    return distB - distA // Farthest first, nearest last
  })
}

/**
 * Queries the Open Source Routing Machine (OSRM) driving API to retrieve the
 * exact turn-by-turn road geometry along actual streets, flyovers, and highways.
 */
export async function fetchOSRMRoute(
  waypoints: { lat: number; lng: number }[]
): Promise<[number, number][]> {
  if (!waypoints || waypoints.length < 2) return []

  try {
    // GeoJSON coordinates order is [longitude, latitude]
    const coordString = waypoints
      .map((p) => `${Number(p.lng).toFixed(5)},${Number(p.lat).toFixed(5)}`)
      .join(';')

    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`
    const res = await fetch(url)

    if (!res.ok) throw new Error(`OSRM HTTP status ${res.status}`)

    const json = await res.json()
    if (json.code === 'Ok' && json.routes?.[0]?.geometry?.coordinates) {
      // Convert [lng, lat] to Leaflet [lat, lng]
      return json.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng])
    }
  } catch (err) {
    console.warn('OSRM road routing fallback to direct waypoints:', err)
  }

  // Graceful fallback to waypoints in case of offline / network outage
  return waypoints.map((p) => [Number(p.lat), Number(p.lng)])
}

/**
 * Calculates total road distance in kilometers along a polyline
 */
export function calculateRouteDistanceKm(coords: [number, number][]): number {
  if (!coords || coords.length < 2) return 0
  let totalMeters = 0
  for (let i = 0; i < coords.length - 1; i++) {
    const [lat1, lng1] = coords[i]
    const [lat2, lng2] = coords[i + 1]
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    totalMeters += 6371000 * c
  }
  return totalMeters / 1000
}

/**
 * Known Bengaluru landmark and hub coordinates for instant high-accuracy resolution
 */
const BENGALURU_LANDMARK_MAP: { keywords: string[]; lat: number; lng: number; displayName: string }[] = [
  {
    keywords: ['kailaseshwara', 'balepet', 'chikkapete', 'chickpete', 'chickpet'],
    lat: 12.9716,
    lng: 77.5756,
    displayName: 'Balepet / Chickpete Central',
  },
  {
    keywords: ['kempegowda', 'airport', 'kia', 'terminal 1', 'terminal 2', 'bial', 't1', 't2', 'airport terminal'],
    lat: 13.1986,
    lng: 77.7066,
    displayName: 'Kempegowda Intl Airport (KIA)',
  },
  {
    keywords: ['manyata', 'hebbal'],
    lat: 13.0475,
    lng: 77.6202,
    displayName: 'Manyata Tech Park (Hebbal)',
  },
  {
    keywords: ['electronic city', 'e-city', 'atharva tech hub'],
    lat: 12.8399,
    lng: 77.6770,
    displayName: 'Electronic City Tech Hub',
  },
  {
    keywords: ['whitefield', 'itpl'],
    lat: 12.9863,
    lng: 77.7383,
    displayName: 'Whitefield (ITPL)',
  },
  {
    keywords: ['indiranagar', '100ft rd', '100 feet road'],
    lat: 12.9784,
    lng: 77.6408,
    displayName: 'Indiranagar',
  },
  {
    keywords: ['koramangala'],
    lat: 12.9352,
    lng: 77.6245,
    displayName: 'Koramangala',
  },
  {
    keywords: ['hsr', 'hsr layout'],
    lat: 12.9121,
    lng: 77.6446,
    displayName: 'HSR Layout',
  },
  {
    keywords: ['bellandur', 'ecospace', 'outer ring rd', 'outer ring road'],
    lat: 12.9260,
    lng: 77.6833,
    displayName: 'Bellandur EcoSpace',
  },
  {
    keywords: ['mahadevapura'],
    lat: 12.9900,
    lng: 77.7000,
    displayName: 'Mahadevapura',
  },
  {
    keywords: ['marathahalli', 'marathalli'],
    lat: 12.9569,
    lng: 77.7011,
    displayName: 'Marathahalli',
  },
  {
    keywords: ['btm', 'btm layout'],
    lat: 12.9166,
    lng: 77.6101,
    displayName: 'BTM Layout',
  },
  {
    keywords: ['jayanagar'],
    lat: 12.9250,
    lng: 77.5938,
    displayName: 'Jayanagar',
  },
  {
    keywords: ['jp nagar', 'jayaprakash nagar'],
    lat: 12.9063,
    lng: 77.5857,
    displayName: 'JP Nagar',
  },
  {
    keywords: ['mg road', 'brigade road', 'church street', 'ashok nagar'],
    lat: 12.9756,
    lng: 77.6066,
    displayName: 'MG Road Central',
  },
  {
    keywords: ['majestic', 'ksr', 'city railway station', 'kempegowda bus station'],
    lat: 12.9781,
    lng: 77.5696,
    displayName: 'Majestic / KSR Railway Station',
  },
  {
    keywords: ['yeshwanthpur', 'yesvantpur'],
    lat: 13.0285,
    lng: 77.5408,
    displayName: 'Yeshwanthpur',
  },
  {
    keywords: ['malleshwaram', 'malleswaram'],
    lat: 13.0031,
    lng: 77.5643,
    displayName: 'Malleshwaram',
  },
  {
    keywords: ['rajajinagar'],
    lat: 12.9982,
    lng: 77.5530,
    displayName: 'Rajajinagar',
  },
  {
    keywords: ['kudlu gate', 'kudlu'],
    lat: 12.8750,
    lng: 77.6500,
    displayName: 'Kudlu Gate',
  },
  {
    keywords: ['yelahanka'],
    lat: 13.1007,
    lng: 77.5963,
    displayName: 'Yelahanka',
  },
  {
    keywords: ['devanahalli'],
    lat: 13.2483,
    lng: 77.7126,
    displayName: 'Devanahalli',
  },
  {
    keywords: ['silk board', 'central silk board'],
    lat: 12.9176,
    lng: 77.6238,
    displayName: 'Silk Board Junction',
  },
  {
    keywords: ['banashankari'],
    lat: 12.9255,
    lng: 77.5468,
    displayName: 'Banashankari',
  },
  {
    keywords: ['kengeri'],
    lat: 12.9081,
    lng: 77.4842,
    displayName: 'Kengeri',
  },
  {
    keywords: ['sarjapur'],
    lat: 12.8590,
    lng: 77.7869,
    displayName: 'Sarjapur Road',
  },
  {
    keywords: ['kadubeesanahalli', 'prestige tech park'],
    lat: 12.9360,
    lng: 77.6970,
    displayName: 'Kadubeesanahalli / Prestige Tech Park',
  },
]

/**
 * Resolves any address string to realistic Bengaluru coordinates:
 * 1. Checks matching keywords against major landmark and tech corridors
 * 2. If unknown, generates deterministic coordinates in Bengaluru metropolitan area
 */
export function resolveBengaluruCoords(address: string): { lat: number; lng: number; displayName: string } {
  if (!address || typeof address !== 'string') {
    return { lat: 12.9716, lng: 77.5946, displayName: 'Bengaluru Central' }
  }

  const lower = address.toLowerCase()

  for (const entry of BENGALURU_LANDMARK_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return {
        lat: entry.lat,
        lng: entry.lng,
        displayName: entry.displayName,
      }
    }
  }

  // Deterministic fallback based on address hash in Bengaluru bounds
  let hash = 0
  for (let i = 0; i < address.length; i++) {
    hash = (hash << 5) - hash + address.charCodeAt(i)
    hash |= 0
  }
  const latOffset = ((Math.abs(hash) % 1000) / 1000 - 0.5) * 0.12
  const lngOffset = ((Math.abs(hash >> 3) % 1000) / 1000 - 0.5) * 0.12

  return {
    lat: Number((12.9716 + latOffset).toFixed(4)),
    lng: Number((77.5946 + lngOffset).toFixed(4)),
    displayName: address.split(',')[0] || 'Bengaluru Location',
  }
}

/**
 * Builds rich HTML hover card for the Vehicle / Driver marker on the map
 */
export function buildVehicleHoverCardHtml(shift: LiveShiftCab, stageInfo: ShiftStageInfo): string {
  const onboardEmployees = stageInfo.updatedStops.filter((s) => s.status === 'PICKED')
  const nextEmployee = stageInfo.updatedStops.find((s) => s.status === 'NEXT')

  return `
    <div style="font-family: inherit; font-size: 11px; min-width: 230px; line-height: 1.4;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 5px; border-bottom: 1px solid #334155; padding-bottom: 4px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 14px;">🚖</span>
          <b style="color: #f8fafc; font-size: 12px;">${shift.vehicleNo}</b>
        </div>
        <span style="background: ${stageInfo.stageIndex >= stageInfo.totalStages ? '#059669' : '#0284c7'}; color: white; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
          ${stageInfo.statusBadge}
        </span>
      </div>

      <div style="color: #cbd5e1; font-size: 10px; margin-bottom: 5px;">
        <div><b>Driver:</b> <span style="color: #ffffff; font-weight: bold;">${shift.driverName}</span> ${shift.driverPhone ? `(${shift.driverPhone})` : ''}</div>
        <div><b>Vehicle:</b> ${shift.vehicleType} • ${shift.shiftCode}</div>
        <div><b>Destination:</b> <span style="color: #38bdf8;">${shift.hubName}</span></div>
        <div style="margin-top: 2px;"><b>Status:</b> <span style="color: #38bdf8; font-weight: bold;">${stageInfo.stageTitle}</span></div>
      </div>

      <!-- Live Passengers Currently Inside Cab -->
      <div style="margin-top: 5px; padding-top: 4px; border-top: 1px dashed #475569;">
        <div style="display: flex; justify-content: space-between; font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; margin-bottom: 3px;">
          <span>Onboard in Cab</span>
          <span style="color: #38bdf8;">${onboardEmployees.length}/${shift.capacity} Seats</span>
        </div>
        ${
          onboardEmployees.length > 0
            ? onboardEmployees
                .map(
                  (e) => `
                <div style="display: flex; align-items: center; gap: 5px; color: #4ade80; font-size: 10px; font-weight: 600; padding: 1px 0;">
                  <span>✓</span>
                  <span>${e.name}</span>
                  <span style="color: #94a3b8; font-size: 9px; font-weight: normal;">(Boarded)</span>
                </div>
              `
                )
                .join('')
            : `<div style="color: #94a3b8; font-size: 10px; font-style: italic;">No passengers inside cab yet (En route to Stop #1)</div>`
        }
      </div>

      <!-- Next Pickup Waiting at Home -->
      ${
        nextEmployee
          ? `
          <div style="margin-top: 5px; padding-top: 4px; border-top: 1px dashed #475569;">
            <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #f59e0b; margin-bottom: 2px;">
              Next Target Pickup:
            </div>
            <div style="color: #f1f5f9; font-size: 10px; font-weight: bold;">
              ${nextEmployee.name} <span style="color: #facc15; font-size: 9px;">(Waiting at Home)</span>
            </div>
            <div style="color: #94a3b8; font-size: 9px; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${nextEmployee.address}
            </div>
          </div>
          `
          : stageInfo.stageIndex >= stageInfo.totalStages
          ? `<div style="margin-top: 5px; color: #34d399; font-size: 10px; font-weight: bold;">✓ Arrived & Verified at ${shift.hubName}</div>`
          : `<div style="margin-top: 5px; color: #38bdf8; font-size: 10px; font-weight: bold;">Driving to ${shift.hubName} (Shortest Road Route)</div>`
      }
    </div>
  `
}

/**
 * Builds rich HTML hover card for Employee Stop pins on the map
 */
export function buildEmployeeHoverCardHtml(
  stop: { name: string; address: string; lat: number; lng: number; status: 'PICKED' | 'NEXT' | 'PENDING' },
  idx: number,
  totalStops: number,
  shift: LiveShiftCab,
  stageInfo: ShiftStageInfo
): string {
  const isPicked = stop.status === 'PICKED'
  const isNext = stop.status === 'NEXT'
  const isFarthest = idx === 0
  const isNearest = idx === totalStops - 1

  // Approximate distance from current vehicle location
  const dLat = (Number(stop.lat) - stageInfo.currentCoords.lat) * 111
  const dLng =
    (Number(stop.lng) - stageInfo.currentCoords.lng) *
    111 *
    Math.cos((stageInfo.currentCoords.lat * Math.PI) / 180)
  const distKm = Math.hypot(dLat, dLng)

  return `
    <div style="font-family: inherit; font-size: 11px; min-width: 220px; line-height: 1.4;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 5px; border-bottom: 1px solid #334155; padding-bottom: 4px;">
        <div style="display: flex; align-items: center; gap: 5px;">
          <span style="font-size: 13px;">👤</span>
          <b style="color: #f8fafc; font-size: 12px;">${stop.name}</b>
        </div>
        <span style="background: ${isPicked ? '#059669' : isNext ? '#0284c7' : '#d97706'}; color: white; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
          ${isPicked ? 'IN CAB (BOARDED)' : isNext ? 'NEXT PICKUP 📍' : 'AT HOME (WAITING)'}
        </span>
      </div>

      <div style="color: #cbd5e1; font-size: 10px; space-y: 2px;">
        <div style="margin-bottom: 2px;">
          <b>Current Location:</b> 
          <span style="color: ${isPicked ? '#4ade80' : '#facc15'}; font-weight: bold;">
            ${isPicked ? `Inside Cab ${shift.vehicleNo} with Driver ${shift.driverName}` : 'At Home (Waiting for Driver)'}
          </span>
        </div>
        <div style="margin-bottom: 2px;"><b>Pickup Address:</b> <span style="color: #f1f5f9;">${stop.address}</span></div>
        <div style="margin-bottom: 2px;"><b>Assigned Cab:</b> <span style="color: #38bdf8;">${shift.vehicleNo} (${shift.vehicleType})</span></div>
        <div style="margin-bottom: 2px;"><b>Assigned Driver:</b> <span style="color: #ffffff;">${shift.driverName}</span></div>
        <div style="margin-bottom: 2px;"><b>Destination Hub:</b> <span style="color: #ffffff;">${shift.hubName}</span></div>
        <div style="margin-bottom: 2px;">
          <b>Stop Sequence:</b> Stop #${idx + 1} of ${totalStops} ${
            isFarthest ? '(Farthest - First Pickup)' : isNearest ? '(Nearest - Last Pickup)' : ''
          }
        </div>

        ${
          isPicked
            ? `
            <div style="margin-top: 5px; padding-top: 4px; border-top: 1px dashed #475569; color: #4ade80; font-weight: bold; font-size: 10px;">
              ✓ Boarded successfully — currently traveling towards corporate office
            </div>
            `
            : `
            <div style="margin-top: 5px; padding-top: 4px; border-top: 1px dashed #475569; color: #38bdf8; font-weight: bold; font-size: 10px;">
              Driver is currently ~${distKm.toFixed(1)} km away from this pickup point
            </div>
            `
        }
      </div>
    </div>
  `
}

/**
 * Builds HTML for employee pin DivIcon with explicit name badge and live status
 */
export function buildEmployeePinDivIconHtml(
  stop: { name: string; status: 'PICKED' | 'NEXT' | 'PENDING' },
  idx: number,
  isPicked: boolean,
  isNext: boolean,
  isFarthest: boolean
): string {
  const bgColor = isPicked ? '#059669' : isNext ? '#0284c7' : isFarthest ? '#e11d48' : '#d97706'
  const statusLabel = isPicked ? 'In Cab ✓' : isNext ? 'Next 📍' : 'At Home'

  return `
    <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
      <div style="background: ${bgColor}; color: white; padding: 2px 7px; border-radius: 9999px; font-weight: 800; font-size: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; gap: 4px; white-space: nowrap; pointer-events: auto;">
        <span>${isPicked ? '✓' : idx + 1}</span>
        <span>${stop.name}</span>
        <span style="background: rgba(255,255,255,0.25); padding: 1px 4px; border-radius: 9999px; font-size: 8px; text-transform: uppercase;">${statusLabel}</span>
      </div>
      <div style="width: 2px; height: 5px; background: ${bgColor};"></div>
      <div style="width: 8px; height: 8px; border-radius: 50%; background: ${bgColor}; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
    </div>
  `
}
