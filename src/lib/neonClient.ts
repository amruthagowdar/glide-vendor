import { neon } from '@neondatabase/serverless'
import type { Trip, Driver, Vehicle } from '../types'

const NEON_CONNECTION_STRING =
  import.meta.env.VITE_DATABASE_URL ||
  'postgresql://neondb_owner:npg_GZF3HWDPRuY2@ep-misty-cherry-bhqscm82-pooler.c-10.eu-central-1.aws.neon.tech/neondb?sslmode=require'

export const ATHARVA_COMPANY_ID = '36d01e54-22de-487f-9cf6-7ead893c87f2'

const sql = neon(NEON_CONNECTION_STRING)

export async function fetchTripsFromNeon(): Promise<Trip[]> {
  try {
    const rows = await sql`
      SELECT 
        t.id,
        t.trip_no,
        t.service_type,
        t.passenger_name,
        t.passenger_phone,
        t.pickup,
        t.drop,
        t.scheduled_date,
        t.scheduled_time,
        t.trip_amount,
        t.commission_rate,
        t.commission_amount,
        t.driver_payable,
        t.trip_status,
        t.payment_status,
        t.notes,
        t.created_at,
        t.updated_at,
        d.id as driver_id,
        v.registration_no as vehicle_reg_no
      FROM trips t
      LEFT JOIN drivers d ON t.driver_id = d.id
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      WHERE t.company_id = ${ATHARVA_COMPANY_ID}
      ORDER BY t.created_at DESC
    `

    const formatted: Trip[] = rows.map((r: any) => {
      let dateStr = ''
      if (r.scheduled_date instanceof Date) {
        dateStr = r.scheduled_date.toISOString().split('T')[0]
      } else if (typeof r.scheduled_date === 'string') {
        dateStr = r.scheduled_date.split('T')[0]
      }

      let timeStr = String(r.scheduled_time || '10:00:00').slice(0, 5)

      let status = (r.trip_status || 'CONFIRMED').toUpperCase()
      if (status === 'SCHEDULED') status = 'CONFIRMED'

      const amount = Number(r.trip_amount) || 1200
      const commissionRate = Number(r.commission_rate) || 0.15
      const commissionAmount = Number(r.commission_amount) || Math.round(amount * commissionRate)
      const driverPayable = Number(r.driver_payable) || amount - commissionAmount

      return {
        id: String(r.id),
        tripNo: String(r.trip_no || `TRP-${Math.floor(100000 + Math.random() * 900000)}`),
        serviceType: r.service_type || 'RAC',
        passengerName: r.passenger_name || 'Passenger',
        passengerPhone: r.passenger_phone || '',
        pickup: r.pickup || '',
        drop: r.drop || '',
        scheduledDate: dateStr || new Date().toISOString().split('T')[0],
        scheduledTime: timeStr,
        driverId: r.driver_id || undefined,
        driverName: r.driver_id ? 'Assigned Driver' : 'Unassigned',
        vehicleRegNo: r.vehicle_reg_no || undefined,
        tripAmount: amount,
        commissionRate,
        commissionAmount,
        driverPayable,
        tripStatus: status as any,
        paymentStatus: (r.payment_status || 'PAID') as any,
        notes: r.notes || '',
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      }
    })

    if (formatted.length > 0) {
      localStorage.setItem('glide_mock_trips', JSON.stringify(formatted))
    }

    return formatted
  } catch (err) {
    console.warn('Neon DB fetch failed, falling back to local cache:', err)
    const cached = localStorage.getItem('glide_mock_trips')
    return cached ? JSON.parse(cached) : []
  }
}

export async function createTripInNeon(payload: any): Promise<Trip> {
  const tripNo = payload.tripNo || `TRP-${Math.floor(100000 + Math.random() * 900000)}`
  const tripAmount = Number(payload.tripAmount) || 1200
  const serviceType = payload.serviceType || 'RAC'
  const scheduledDate = payload.scheduledDate || new Date().toISOString().split('T')[0]
  const scheduledTime = payload.scheduledTime || '10:00:00'
  const timeWithSec = scheduledTime.length === 5 ? `${scheduledTime}:00` : scheduledTime

  try {
    const [inserted] = await sql`
      INSERT INTO trips (
        trip_no,
        source,
        company_id,
        service_type,
        passenger_name,
        passenger_phone,
        pickup,
        drop,
        scheduled_date,
        scheduled_time,
        trip_amount,
        trip_status,
        payment_status,
        payment_method,
        financial_source,
        notes
      ) VALUES (
        ${tripNo},
        'VENDOR',
        ${ATHARVA_COMPANY_ID},
        ${serviceType},
        ${payload.passengerName || 'Passenger'},
        ${payload.passengerPhone || '0000000000'},
        ${payload.pickup || 'Pickup Location'},
        ${payload.drop || 'Drop Location'},
        ${scheduledDate},
        ${timeWithSec},
        ${tripAmount},
        'CONFIRMED',
        'PAID',
        'VENDOR_WALLET',
        'VENDOR_WALLET',
        ${payload.notes || 'Created via Atharva Travels Vendor Portal'}
      )
      RETURNING *
    `

    const newTrip: Trip = {
      id: String(inserted.id),
      tripNo: inserted.trip_no,
      serviceType: inserted.service_type,
      passengerName: inserted.passenger_name,
      passengerPhone: inserted.passenger_phone,
      pickup: inserted.pickup,
      drop: inserted.drop,
      scheduledDate,
      scheduledTime: scheduledTime.slice(0, 5),
      tripAmount,
      commissionRate: 0.15,
      commissionAmount: Math.round(tripAmount * 0.15),
      driverPayable: tripAmount - Math.round(tripAmount * 0.15),
      tripStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      notes: inserted.notes,
      createdAt: inserted.created_at ? new Date(inserted.created_at).toISOString() : new Date().toISOString(),
      updatedAt: inserted.updated_at ? new Date(inserted.updated_at).toISOString() : new Date().toISOString(),
    }

    const existing = JSON.parse(localStorage.getItem('glide_mock_trips') || '[]')
    localStorage.setItem('glide_mock_trips', JSON.stringify([newTrip, ...existing]))

    return newTrip
  } catch (err) {
    console.error('Failed to create trip in Neon DB:', err)
    const fallback: Trip = {
      id: `trip_${Date.now()}`,
      tripNo,
      serviceType,
      passengerName: payload.passengerName || 'Passenger',
      passengerPhone: payload.passengerPhone || '0000000000',
      pickup: payload.pickup || '',
      drop: payload.drop || '',
      scheduledDate,
      scheduledTime: scheduledTime.slice(0, 5),
      tripAmount,
      commissionRate: 0.15,
      commissionAmount: Math.round(tripAmount * 0.15),
      driverPayable: tripAmount - Math.round(tripAmount * 0.15),
      tripStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      notes: payload.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const existing = JSON.parse(localStorage.getItem('glide_mock_trips') || '[]')
    localStorage.setItem('glide_mock_trips', JSON.stringify([fallback, ...existing]))
    return fallback
  }
}

export async function deleteTripFromNeon(idOrTripNo: string): Promise<boolean> {
  try {
    await sql`
      DELETE FROM trips 
      WHERE (id::text = ${idOrTripNo} OR trip_no = ${idOrTripNo}) 
        AND company_id = ${ATHARVA_COMPANY_ID}
    `
    const existing: Trip[] = JSON.parse(localStorage.getItem('glide_mock_trips') || '[]')
    const updated = existing.filter((t) => t.id !== idOrTripNo && t.tripNo !== idOrTripNo)
    localStorage.setItem('glide_mock_trips', JSON.stringify(updated))
    return true
  } catch (err) {
    console.error('Delete from Neon DB failed:', err)
    return false
  }
}
