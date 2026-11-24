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
  stops: { name: string; address: string; lat: number; lng: number; status: 'PICKED' | 'NEXT' | 'PENDING' }[]
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
