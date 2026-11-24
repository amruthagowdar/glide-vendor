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
  status: 'BOARDING' | 'ON_ROUTE' | 'ARRIVED'
  currentCoords: { lat: number; lng: number }
  hubCoords: { lat: number; lng: number }
  stops: { name: string; address: string; lat: number; lng: number; status: 'PICKED' | 'NEXT' | 'PENDING' }[]
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
