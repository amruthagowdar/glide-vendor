import { neon } from '@neondatabase/serverless'
import type { Trip, Driver, Vehicle, DashboardData, Wallet, WalletTransaction, ServiceType, TripStatus } from '../types'

const NEON_CONNECTION_STRING =
  import.meta.env.VITE_DATABASE_URL ||
  'postgresql://neondb_owner:npg_GZF3HWDPRuY2@ep-misty-cherry-bhqscm82-pooler.c-10.eu-central-1.aws.neon.tech/neondb?sslmode=require'

export const ATHARVA_COMPANY_ID = '36d01e54-22de-487f-9cf6-7ead893c87f2'
export const ATHARVA_VENDOR_ID = '3ce8e980-7ae4-4678-acae-04e2628ae0ce'
export const ATHARVA_WALLET_ID = '6d8d3885-a461-40f1-8353-8d285488dd1e'

const sql = neon(NEON_CONNECTION_STRING)

// =========================================================================
// 1. TRIPS MANAGEMENT (NEON DB)
// =========================================================================

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
      WHERE t.company_id = ${ATHARVA_COMPANY_ID} OR t.company_id IS NULL OR t.company_id = ${ATHARVA_VENDOR_ID}
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
      if (status === 'CONFIRMED' && r.trip_no && String(r.trip_no).startsWith('ETS-') && !r.driver_id) {
        status = 'TRIP_CREATED'
      }

      let serviceType: ServiceType = 'RAC'
      if (r.service_type === 'ETS' || (r.trip_no && String(r.trip_no).startsWith('ETS-'))) {
        serviceType = 'ETS'
      } else if (r.service_type) {
        serviceType = r.service_type as ServiceType
      }

      const amount = Number(r.trip_amount) || 1200
      const commissionRate = Number(r.commission_rate) || 0.15
      const commissionAmount = Number(r.commission_amount) || Math.round(amount * commissionRate)
      const driverPayable = Number(r.driver_payable) || amount - commissionAmount

      return {
        id: String(r.id),
        tripNo: String(r.trip_no || `TRP-${Math.floor(100000 + Math.random() * 900000)}`),
        serviceType,
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

    // Seamless sync: merge any locally stored trips so no trip is ever missed or dropped before sync
    const localTrips: Trip[] = JSON.parse(localStorage.getItem('glide_mock_trips') || '[]')
    const remoteTripNos = new Set(formatted.map((t) => t.tripNo))
    const unsynced = localTrips.filter((lt) => !remoteTripNos.has(lt.tripNo))

    // Background sync unsynced trips to Neon DB
    if (unsynced.length > 0) {
      unsynced.forEach((t) => {
        createTripInNeon(t).catch((e) => console.warn('Background sync trip:', e))
      })
    }

    const merged = [...formatted, ...unsynced]
    localStorage.setItem('glide_mock_trips', JSON.stringify(merged))

    return merged
  } catch (err) {
    console.warn('Neon DB fetch failed, falling back to local cache:', err)
    const cached = localStorage.getItem('glide_mock_trips')
    return cached ? JSON.parse(cached) : []
  }
}

export async function createTripInNeon(payload: any): Promise<Trip> {
  const tripNo = payload.tripNo || `TRP-${Math.floor(100000 + Math.random() * 900000)}`
  const tripAmount = Number(payload.tripAmount) || 1200
  const serviceType = payload.serviceType || (String(payload.tripNo || '').startsWith('ETS-') ? 'ETS' : 'RAC')
  const tripStatus = payload.tripStatus || 'TRIP_CREATED'
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
        ${tripStatus},
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
      serviceType: (inserted.service_type || serviceType) as ServiceType,
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
      tripStatus: (inserted.trip_status || tripStatus) as TripStatus,
      paymentStatus: 'PAID',
      notes: inserted.notes,
      createdAt: inserted.created_at ? new Date(inserted.created_at).toISOString() : new Date().toISOString(),
      updatedAt: inserted.updated_at ? new Date(inserted.updated_at).toISOString() : new Date().toISOString(),
    }

    // Auto-debit prepaid wallet in Neon DB for strict wallet balance tracking
    if (tripAmount > 0) {
      try {
        const currentWallet = await fetchWalletFromNeon()
        const prevBalance = currentWallet.balance
        const newBalance = Math.max(0, prevBalance - tripAmount)

        await sql`
          UPDATE wallets
          SET balance = ${newBalance},
              updated_at = NOW()
          WHERE id = ${ATHARVA_WALLET_ID} OR entity_id = ${ATHARVA_VENDOR_ID}
        `
        const [txRow] = await sql`
          INSERT INTO wallet_transactions (
            wallet_id,
            type,
            amount,
            previous_balance,
            new_balance,
            reference,
            description,
            related_trip_id,
            created_at
          ) VALUES (
            ${ATHARVA_WALLET_ID},
            'DEBIT',
            ${tripAmount},
            ${prevBalance},
            ${newBalance},
            ${'TRIP-' + tripNo},
            ${'Trip booking fare: ' + tripNo},
            ${inserted.id},
            NOW()
          )
          RETURNING *
        `
        localStorage.setItem('glide_mock_wallet_balance', String(newBalance))
        const existingTxs: WalletTransaction[] = JSON.parse(localStorage.getItem('glide_mock_txs') || '[]')
        const newTx: WalletTransaction = {
          id: String(txRow?.id || `tx_${Date.now()}`),
          type: 'DEBIT',
          amount: tripAmount,
          previousBalance: prevBalance,
          newBalance: newBalance,
          reference: 'TRIP-' + tripNo,
          description: 'Trip booking fare: ' + tripNo,
          relatedTripId: String(inserted.id),
          createdAt: new Date().toISOString(),
        }
        localStorage.setItem('glide_mock_txs', JSON.stringify([newTx, ...existingTxs]))
      } catch (wErr) {
        console.warn('Neon DB wallet balance debit warning:', wErr)
      }
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
    const prevBalance = parseFloat(localStorage.getItem('glide_mock_wallet_balance') || '2500')
    const newBalance = Math.max(0, prevBalance - tripAmount)
    localStorage.setItem('glide_mock_wallet_balance', String(newBalance))
    const fallbackTx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'DEBIT',
      amount: tripAmount,
      previousBalance: prevBalance,
      newBalance: newBalance,
      reference: 'TRIP-' + tripNo,
      description: 'Trip booking fare: ' + tripNo,
      createdAt: new Date().toISOString(),
    }
    const existingTxs: WalletTransaction[] = JSON.parse(localStorage.getItem('glide_mock_txs') || '[]')
    localStorage.setItem('glide_mock_txs', JSON.stringify([fallbackTx, ...existingTxs]))

    const existing = JSON.parse(localStorage.getItem('glide_mock_trips') || '[]')
    localStorage.setItem('glide_mock_trips', JSON.stringify([fallback, ...existing]))
    return fallback
  }
}

export async function updateTripInNeon(id: string, payload: any): Promise<Trip | null> {
  try {
    const status = payload.tripStatus || payload.status || null
    const notes = payload.notes !== undefined ? payload.notes : null
    const tripAmount = payload.tripAmount !== undefined ? Number(payload.tripAmount) : null

    // Check if fare increased (e.g. Fare Boost) so wallet debit is synced
    let fareDiff = 0
    let tripNo = id
    if (tripAmount !== null) {
      try {
        const prevRows = await sql`
          SELECT trip_no, trip_amount FROM trips WHERE (id::text = ${id} OR trip_no = ${id}) LIMIT 1
        `
        if (prevRows.length > 0) {
          tripNo = prevRows[0].trip_no
          const oldFare = Number(prevRows[0].trip_amount) || 0
          if (tripAmount > oldFare) {
            fareDiff = tripAmount - oldFare
          }
        }
      } catch (e) {
        console.warn('Fare check warning:', e)
      }
    }

    const rows = await sql`
      UPDATE trips
      SET trip_status = COALESCE(${status}::trip_status, trip_status),
          notes = COALESCE(${notes}, notes),
          trip_amount = COALESCE(${tripAmount}, trip_amount),
          updated_at = NOW()
      WHERE (id::text = ${id} OR trip_no = ${id})
      RETURNING *
    `
    if (rows.length > 0) {
      const r = rows[0]
      const amount = Number(r.trip_amount) || 1200
      const commissionRate = 0.15
      const commissionAmount = Math.round(amount * commissionRate)
      const driverPayable = amount - commissionAmount

      // If fare was boosted, auto-debit the fare increase from wallet so balance remains synced
      if (fareDiff > 0) {
        try {
          const currentWallet = await fetchWalletFromNeon()
          const prevBalance = currentWallet.balance
          const newBalance = Math.max(0, prevBalance - fareDiff)
          await sql`
            UPDATE wallets
            SET balance = ${newBalance}, updated_at = NOW()
            WHERE id = ${ATHARVA_WALLET_ID} OR entity_id = ${ATHARVA_VENDOR_ID}
          `
          const [txRow] = await sql`
            INSERT INTO wallet_transactions (
              wallet_id, type, amount, previous_balance, new_balance, reference, description, related_trip_id, created_at
            ) VALUES (
              ${ATHARVA_WALLET_ID}, 'DEBIT', ${fareDiff}, ${prevBalance}, ${newBalance}, ${'BOOST-' + tripNo}, ${'Trip fare boost: ' + tripNo + ' (+₹' + fareDiff + ')'}, ${r.id}, NOW()
            )
            RETURNING *
          `
          localStorage.setItem('glide_mock_wallet_balance', String(newBalance))
          const existingTxs: WalletTransaction[] = JSON.parse(localStorage.getItem('glide_mock_txs') || '[]')
          const boostTx: WalletTransaction = {
            id: String(txRow?.id || `tx_${Date.now()}`),
            type: 'DEBIT',
            amount: fareDiff,
            previousBalance: prevBalance,
            newBalance,
            reference: 'BOOST-' + tripNo,
            description: 'Trip fare boost: ' + tripNo + ' (+₹' + fareDiff + ')',
            relatedTripId: String(r.id),
            createdAt: new Date().toISOString(),
          }
          localStorage.setItem('glide_mock_txs', JSON.stringify([boostTx, ...existingTxs]))
        } catch (bErr) {
          console.warn('Fare boost wallet debit warning:', bErr)
        }
      }

      const updatedTrip: Trip = {
        id: String(r.id),
        tripNo: r.trip_no,
        serviceType: r.service_type,
        passengerName: r.passenger_name,
        passengerPhone: r.passenger_phone,
        pickup: r.pickup,
        drop: r.drop,
        scheduledDate:
          r.scheduled_date instanceof Date
            ? r.scheduled_date.toISOString().split('T')[0]
            : String(r.scheduled_date || '').split('T')[0],
        scheduledTime: String(r.scheduled_time || '10:00').slice(0, 5),
        tripAmount: amount,
        commissionRate,
        commissionAmount,
        driverPayable,
        tripStatus: r.trip_status,
        paymentStatus: r.payment_status || 'PAID',
        notes: r.notes,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      }

      const existing: Trip[] = JSON.parse(localStorage.getItem('glide_mock_trips') || '[]')
      const updatedList = existing.map((t) => (t.id === id || t.tripNo === id ? updatedTrip : t))
      localStorage.setItem('glide_mock_trips', JSON.stringify(updatedList))
      return updatedTrip
    }
    return null
  } catch (err) {
    console.error('Update trip in Neon DB failed:', err)
    const existing: Trip[] = JSON.parse(localStorage.getItem('glide_mock_trips') || '[]')
    const updated = existing.map((t) => {
      if (t.id === id || t.tripNo === id) {
        return {
          ...t,
          ...(payload.tripStatus ? { tripStatus: payload.tripStatus } : {}),
          ...(payload.notes ? { notes: payload.notes } : {}),
          ...(payload.tripAmount !== undefined ? { tripAmount: Number(payload.tripAmount) } : {}),
          updatedAt: new Date().toISOString(),
        }
      }
      return t
    })
    localStorage.setItem('glide_mock_trips', JSON.stringify(updated))
    return updated.find((t) => t.id === id || t.tripNo === id) || null
  }
}

export async function deleteTripFromNeon(idOrTripNo: string): Promise<boolean> {
  try {
    // 1. Look up trip before deletion to determine if a refund is due
    let tripToRefund: { id: string; trip_no: string; trip_amount: number; trip_status: string } | null = null
    try {
      const tripRows = await sql`
        SELECT id, trip_no, trip_amount, trip_status 
        FROM trips 
        WHERE (id::text = ${idOrTripNo} OR trip_no = ${idOrTripNo}) 
        LIMIT 1
      `
      if (tripRows.length > 0) {
        tripToRefund = {
          id: String(tripRows[0].id),
          trip_no: String(tripRows[0].trip_no),
          trip_amount: Number(tripRows[0].trip_amount) || 0,
          trip_status: String(tripRows[0].trip_status || ''),
        }
      }
    } catch (lookupErr) {
      console.warn('Trip lookup before delete notice:', lookupErr)
    }

    // Fallback: check local trips if not found in DB
    if (!tripToRefund) {
      const localTrips: Trip[] = JSON.parse(localStorage.getItem('glide_mock_trips') || '[]')
      const matched = localTrips.find((t) => t.id === idOrTripNo || t.tripNo === idOrTripNo)
      if (matched) {
        tripToRefund = {
          id: matched.id,
          trip_no: matched.tripNo,
          trip_amount: Number(matched.tripAmount) || 0,
          trip_status: matched.tripStatus,
        }
      }
    }

    // 2. If trip is deleted before completion, automatically refund 100% of the fare back to wallet
    if (
      tripToRefund &&
      tripToRefund.trip_amount > 0 &&
      tripToRefund.trip_status !== 'COMPLETED' &&
      tripToRefund.trip_status !== 'TRIP_COMPLETED'
    ) {
      try {
        const currentWallet = await fetchWalletFromNeon()
        const prevBalance = currentWallet.balance
        const refundAmount = tripToRefund.trip_amount
        const newBalance = prevBalance + refundAmount

        await sql`
          UPDATE wallets
          SET balance = ${newBalance}, updated_at = NOW()
          WHERE id = ${ATHARVA_WALLET_ID} OR entity_id = ${ATHARVA_VENDOR_ID}
        `

        const [txRow] = await sql`
          INSERT INTO wallet_transactions (
            wallet_id,
            type,
            amount,
            previous_balance,
            new_balance,
            reference,
            description,
            related_trip_id,
            created_at
          ) VALUES (
            ${ATHARVA_WALLET_ID},
            'CREDIT',
            ${refundAmount},
            ${prevBalance},
            ${newBalance},
            ${'REFUND-' + tripToRefund.trip_no},
            ${'Refund for cancelled trip: ' + tripToRefund.trip_no},
            ${tripToRefund.id},
            NOW()
          )
          RETURNING *
        `

        localStorage.setItem('glide_mock_wallet_balance', String(newBalance))
        const existingTxs: WalletTransaction[] = JSON.parse(localStorage.getItem('glide_mock_txs') || '[]')
        const refundTx: WalletTransaction = {
          id: String(txRow?.id || `tx_${Date.now()}`),
          type: 'CREDIT',
          amount: refundAmount,
          previousBalance: prevBalance,
          newBalance,
          reference: 'REFUND-' + tripToRefund.trip_no,
          description: 'Refund for cancelled trip: ' + tripToRefund.trip_no,
          relatedTripId: String(tripToRefund.id),
          createdAt: new Date().toISOString(),
        }
        localStorage.setItem('glide_mock_txs', JSON.stringify([refundTx, ...existingTxs]))
      } catch (refundErr) {
        console.warn('Trip cancellation refund warning:', refundErr)
      }
    }

    // 3. Delete from Neon DB
    await sql`
      DELETE FROM trips 
      WHERE (id::text = ${idOrTripNo} OR trip_no = ${idOrTripNo})
    `

    // 4. Clean from local trips cache
    const existing: Trip[] = JSON.parse(localStorage.getItem('glide_mock_trips') || '[]')
    const updated = existing.filter((t) => t.id !== idOrTripNo && t.tripNo !== idOrTripNo)
    localStorage.setItem('glide_mock_trips', JSON.stringify(updated))

    // 5. Clean from ETS shift manifests to eliminate split-brain ghost shifts on ETS map
    try {
      const savedShifts = localStorage.getItem('ETS_DISPATCHED_SHIFTS')
      if (savedShifts) {
        const shifts = JSON.parse(savedShifts)
        if (Array.isArray(shifts)) {
          const cleaned = shifts.filter((s: any) => s.id !== idOrTripNo && s.shiftCode !== idOrTripNo)
          localStorage.setItem('ETS_DISPATCHED_SHIFTS', JSON.stringify(cleaned))
          window.dispatchEvent(new Event('ets_shift_created'))
        }
      }
    } catch {
      // ignore
    }

    return true
  } catch (err) {
    console.error('Delete from Neon DB failed:', err)
    return false
  }
}

// =========================================================================
// 2. WALLET & TRANSACTIONS MANAGEMENT (NEON DB)
// =========================================================================

export async function fetchWalletFromNeon(): Promise<Wallet> {
  try {
    const rows = await sql`
      SELECT id, balance, entity_type, entity_id
      FROM wallets
      WHERE id = ${ATHARVA_WALLET_ID} OR entity_id = ${ATHARVA_VENDOR_ID}
      LIMIT 1
    `
    if (rows.length > 0) {
      const w = rows[0]
      const balance = parseFloat(w.balance || 0)
      localStorage.setItem('glide_mock_wallet_balance', String(balance))
      return {
        id: String(w.id),
        balance,
        entityType: w.entity_type,
        entityId: String(w.entity_id),
      }
    }
  } catch (err) {
    console.warn('Neon DB fetchWallet failed, falling back to local cache:', err)
  }
  const balance = parseFloat(localStorage.getItem('glide_mock_wallet_balance') || '2500')
  return {
    id: ATHARVA_WALLET_ID,
    balance,
    entityType: 'VENDOR',
    entityId: ATHARVA_VENDOR_ID,
  }
}

export async function fetchTransactionsFromNeon(
  params?: Record<string, string>
): Promise<WalletTransaction[]> {
  try {
    const typeFilter = params?.type
    let rows: any[] = []
    if (typeFilter && (typeFilter === 'CREDIT' || typeFilter === 'DEBIT')) {
      rows = await sql`
        SELECT id, wallet_id, type, amount, previous_balance, new_balance, reference, description, related_trip_id, created_at
        FROM wallet_transactions
        WHERE wallet_id = ${ATHARVA_WALLET_ID} AND type = ${typeFilter}
        ORDER BY created_at DESC
      `
    } else {
      rows = await sql`
        SELECT id, wallet_id, type, amount, previous_balance, new_balance, reference, description, related_trip_id, created_at
        FROM wallet_transactions
        WHERE wallet_id = ${ATHARVA_WALLET_ID}
        ORDER BY created_at DESC
      `
    }
    const formatted: WalletTransaction[] = rows.map((r: any) => ({
      id: String(r.id),
      type: r.type,
      amount: parseFloat(r.amount || 0),
      previousBalance: parseFloat(r.previous_balance || 0),
      newBalance: parseFloat(r.new_balance || 0),
      reference: r.reference || '',
      description: r.description || '',
      relatedTripId: r.related_trip_id ? String(r.related_trip_id) : undefined,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }))
    // Seamless sync: merge any locally stored transactions so nothing is dropped
    const localTxs: WalletTransaction[] = JSON.parse(localStorage.getItem('glide_mock_txs') || '[]')
    const remoteRefs = new Set(formatted.map((t) => t.reference || t.id))
    const unsyncedTxs = localTxs.filter((lt) => !remoteRefs.has(lt.reference || lt.id))
    const mergedTxs = [...formatted, ...unsyncedTxs]
    localStorage.setItem('glide_mock_txs', JSON.stringify(mergedTxs))
    return mergedTxs
  } catch (err) {
    console.warn('Neon DB fetchTransactions failed, falling back to local cache:', err)
    const cached = localStorage.getItem('glide_mock_txs')
    return cached ? JSON.parse(cached) : []
  }
}

export async function rechargeWalletInNeon(
  amount: number,
  reference: string = `PAY-RZP-${Date.now()}`,
  description: string = 'Razorpay Instant Wallet Top-Up'
): Promise<{ newBalance: number; transaction: WalletTransaction }> {
  try {
    const currentWallet = await fetchWalletFromNeon()
    const prevBalance = currentWallet.balance
    const newBalance = prevBalance + amount

    await sql`
      UPDATE wallets
      SET balance = ${newBalance}, updated_at = NOW()
      WHERE id = ${ATHARVA_WALLET_ID}
    `

    const [tx] = await sql`
      INSERT INTO wallet_transactions (
        wallet_id,
        type,
        amount,
        previous_balance,
        new_balance,
        reference,
        description,
        created_at
      ) VALUES (
        ${ATHARVA_WALLET_ID},
        'CREDIT',
        ${amount},
        ${prevBalance},
        ${newBalance},
        ${reference},
        ${description},
        NOW()
      )
      RETURNING *
    `

    const newTx: WalletTransaction = {
      id: String(tx.id),
      type: 'CREDIT',
      amount,
      previousBalance: prevBalance,
      newBalance,
      reference,
      description,
      createdAt: new Date().toISOString(),
    }

    localStorage.setItem('glide_mock_wallet_balance', String(newBalance))
    const existingTxs: WalletTransaction[] = JSON.parse(localStorage.getItem('glide_mock_txs') || '[]')
    localStorage.setItem('glide_mock_txs', JSON.stringify([newTx, ...existingTxs]))

    return { newBalance, transaction: newTx }
  } catch (err) {
    console.error('Neon DB recharge failed, saving locally:', err)
    const prevBalance = parseFloat(localStorage.getItem('glide_mock_wallet_balance') || '2500')
    const newBalance = prevBalance + amount
    localStorage.setItem('glide_mock_wallet_balance', String(newBalance))
    const fallbackTx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'CREDIT',
      amount,
      previousBalance: prevBalance,
      newBalance,
      reference,
      description,
      createdAt: new Date().toISOString(),
    }
    const existingTxs: WalletTransaction[] = JSON.parse(localStorage.getItem('glide_mock_txs') || '[]')
    localStorage.setItem('glide_mock_txs', JSON.stringify([fallbackTx, ...existingTxs]))
    return { newBalance, transaction: fallbackTx }
  }
}

export async function withdrawWalletInNeon(
  amount: number,
  method: string = 'BANK_TRANSFER',
  details?: any
): Promise<{ balance: number; transaction: WalletTransaction }> {
  try {
    const currentWallet = await fetchWalletFromNeon()
    const prevBalance = currentWallet.balance
    const newBalance = Math.max(0, prevBalance - amount)
    const reference = `WDR-${Date.now()}`
    const description = `Payout Withdrawal (${method})`

    await sql`
      UPDATE wallets
      SET balance = ${newBalance}, updated_at = NOW()
      WHERE id = ${ATHARVA_WALLET_ID}
    `

    const [tx] = await sql`
      INSERT INTO wallet_transactions (
        wallet_id,
        type,
        amount,
        previous_balance,
        new_balance,
        reference,
        description,
        created_at
      ) VALUES (
        ${ATHARVA_WALLET_ID},
        'DEBIT',
        ${amount},
        ${prevBalance},
        ${newBalance},
        ${reference},
        ${description},
        NOW()
      )
      RETURNING *
    `

    const newTx: WalletTransaction = {
      id: String(tx.id),
      type: 'DEBIT',
      amount,
      previousBalance: prevBalance,
      newBalance,
      reference,
      description,
      createdAt: new Date().toISOString(),
    }

    localStorage.setItem('glide_mock_wallet_balance', String(newBalance))
    const existingTxs: WalletTransaction[] = JSON.parse(localStorage.getItem('glide_mock_txs') || '[]')
    localStorage.setItem('glide_mock_txs', JSON.stringify([newTx, ...existingTxs]))

    return { balance: newBalance, transaction: newTx }
  } catch (err) {
    console.error('Neon DB withdraw failed:', err)
    const prevBalance = parseFloat(localStorage.getItem('glide_mock_wallet_balance') || '0')
    const newBalance = Math.max(0, prevBalance - amount)
    localStorage.setItem('glide_mock_wallet_balance', String(newBalance))
    const fallbackTx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'DEBIT',
      amount,
      previousBalance: prevBalance,
      newBalance,
      reference: `WDR-${Date.now()}`,
      description: `Payout Withdrawal (${method})`,
      createdAt: new Date().toISOString(),
    }
    return { balance: newBalance, transaction: fallbackTx }
  }
}

export async function deleteTransactionFromNeon(id: string): Promise<boolean> {
  try {
    await sql`
      DELETE FROM wallet_transactions
      WHERE id::text = ${id} AND wallet_id = ${ATHARVA_WALLET_ID}
    `
    const existing: WalletTransaction[] = JSON.parse(localStorage.getItem('glide_mock_txs') || '[]')
    localStorage.setItem('glide_mock_txs', JSON.stringify(existing.filter((t) => t.id !== id)))
    return true
  } catch (err) {
    console.error('Delete transaction from Neon DB failed:', err)
    return false
  }
}

export async function updateTransactionInNeon(
  id: string,
  payload: Partial<WalletTransaction>
): Promise<WalletTransaction | null> {
  try {
    const desc = payload.description
    const ref = payload.reference
    const rows = await sql`
      UPDATE wallet_transactions
      SET description = COALESCE(${desc}, description),
          reference = COALESCE(${ref}, reference)
      WHERE id::text = ${id} AND wallet_id = ${ATHARVA_WALLET_ID}
      RETURNING *
    `
    if (rows.length > 0) {
      const updated = rows[0]
      return {
        id: String(updated.id),
        type: updated.type,
        amount: parseFloat(updated.amount),
        previousBalance: parseFloat(updated.previous_balance),
        newBalance: parseFloat(updated.new_balance),
        reference: updated.reference,
        description: updated.description,
        createdAt: new Date(updated.created_at).toISOString(),
      }
    }
  } catch (err) {
    console.error('Update transaction in Neon DB failed:', err)
  }
  return null
}

// =========================================================================
// 3. DRIVERS & VEHICLES (NEON DB)
// =========================================================================

export async function fetchDriversFromNeon(): Promise<Driver[]> {
  try {
    const rows = await sql`
      SELECT d.*, v.registration_no as vehicle_reg_no, v.model as vehicle_model
      FROM drivers d
      LEFT JOIN driver_vehicles dv ON d.id = dv.driver_id
      LEFT JOIN vehicles v ON dv.vehicle_id = v.id
      WHERE d.company_id = ${ATHARVA_COMPANY_ID}
      ORDER BY d.created_at DESC
    `
    if (rows.length > 0) {
      const list: Driver[] = rows.map((r: any) => ({
        id: String(r.id),
        name: r.name || 'Assigned Driver',
        phone: r.phone || '',
        licenseNo: r.license_no || '',
        isActive: Boolean(r.is_active),
        vehicleRegNo: r.vehicle_reg_no || undefined,
        vehicleModel: r.vehicle_model || undefined,
        activeTrips: Number(r.total_trips || 0),
        companyId: String(r.company_id),
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }))
      localStorage.setItem('glide_mock_drivers', JSON.stringify(list))
      return list
    }
  } catch (err) {
    console.warn('Neon DB fetchDrivers failed:', err)
  }
  const cached = localStorage.getItem('glide_mock_drivers')
  return cached ? JSON.parse(cached) : []
}

export async function fetchVehiclesFromNeon(): Promise<Vehicle[]> {
  try {
    const rows = await sql`
      SELECT v.*, d.name as driver_name, d.id as driver_id
      FROM vehicles v
      LEFT JOIN driver_vehicles dv ON v.id = dv.vehicle_id
      LEFT JOIN drivers d ON dv.driver_id = d.id
      WHERE v.company_id = ${ATHARVA_COMPANY_ID}
      ORDER BY v.created_at DESC
    `
    if (rows.length > 0) {
      const list: Vehicle[] = rows.map((r: any) => ({
        id: String(r.id),
        registrationNo: r.registration_no || 'KA-01-MJ-5821',
        type: r.type || 'Sedan',
        model: r.model || 'Swift Dzire',
        capacity: Number(r.capacity || 4),
        isActive: Boolean(r.is_active),
        driverId: r.driver_id ? String(r.driver_id) : undefined,
        driverName: r.driver_name || undefined,
        companyId: String(r.company_id),
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }))
      localStorage.setItem('glide_mock_vehicles', JSON.stringify(list))
      return list
    }
  } catch (err) {
    console.warn('Neon DB fetchVehicles failed:', err)
  }
  const cached = localStorage.getItem('glide_mock_vehicles')
  return cached ? JSON.parse(cached) : []
}

// =========================================================================
// 4. DASHBOARD AGGREGATE (NEON DB)
// =========================================================================

export async function fetchDashboardFromNeon(): Promise<DashboardData> {
  const [trips, wallet, txs, drivers] = await Promise.all([
    fetchTripsFromNeon(),
    fetchWalletFromNeon(),
    fetchTransactionsFromNeon(),
    fetchDriversFromNeon(),
  ])

  return {
    todayTrips: {
      total: trips.length,
      pending: trips.filter((t) => t.tripStatus === 'PENDING' || t.tripStatus === 'TRIP_CREATED').length,
      confirmed: trips.filter((t) => t.tripStatus === 'CONFIRMED').length,
      inProgress: trips.filter((t) =>
        ['IN_PROGRESS', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'TRIP_STARTED'].includes(t.tripStatus)
      ).length,
      completed: trips.filter((t) => t.tripStatus === 'COMPLETED').length,
      cancelled: trips.filter((t) => t.tripStatus === 'CANCELLED').length,
    },
    walletBalance: wallet.balance,
    lowBalanceThreshold: 1000,
    activeDrivers: drivers.filter((d) => d.isActive).length,
    totalDrivers: drivers.length,
    upcomingTrips: trips.filter((t) => ['PENDING', 'CONFIRMED', 'TRIP_CREATED'].includes(t.tripStatus)),
    recentTrips: trips.slice(0, 10),
    recentTransactions: txs.slice(0, 5),
  }
}

// =========================================================================
// 5. CORPORATE EMPLOYEES ROSTER (NEON DB)
// =========================================================================

export interface CorporateEmployee {
  id: string
  name: string
  phone: string
  company: string
  address: string
  lat: number
  lng: number
  department?: string
  gender?: 'MALE' | 'FEMALE'
}

export async function fetchCorporateEmployeesFromNeon(): Promise<CorporateEmployee[]> {
  try {
    const rows = await sql`
      SELECT id, name, phone, address, lat, lng, department, gender, company_id
      FROM corporate_employees
      WHERE company_id = ${ATHARVA_COMPANY_ID}
      ORDER BY created_at DESC
    `
    const list: CorporateEmployee[] = rows.map((r: any) => ({
      id: String(r.id),
      name: String(r.name || ''),
      phone: String(r.phone || ''),
      company: 'Atharva Tech Hub',
      address: String(r.address || ''),
      lat: Number(r.lat) || 12.9298,
      lng: Number(r.lng) || 77.6743,
      department: r.department || 'General',
      gender: (r.gender || 'FEMALE') as 'MALE' | 'FEMALE',
    }))
    // Store in localStorage as sync cache
    localStorage.setItem('ETS_SAVED_EMPLOYEES', JSON.stringify(list))
    return list
  } catch (err) {
    console.warn('Neon DB fetchCorporateEmployees failed:', err)
    const cached = localStorage.getItem('ETS_SAVED_EMPLOYEES')
    return cached ? JSON.parse(cached) : []
  }
}

export async function insertCorporateEmployeeInNeon(emp: CorporateEmployee): Promise<CorporateEmployee> {
  try {
    await sql`
      INSERT INTO corporate_employees (
        id, company_id, vendor_id, name, phone, address, lat, lng, department, gender, created_at, updated_at
      ) VALUES (
        ${emp.id},
        ${ATHARVA_COMPANY_ID},
        ${ATHARVA_VENDOR_ID},
        ${emp.name},
        ${emp.phone},
        ${emp.address},
        ${emp.lat || 12.9298},
        ${emp.lng || 77.6743},
        ${emp.department || 'General'},
        ${emp.gender || 'FEMALE'},
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        department = EXCLUDED.department,
        gender = EXCLUDED.gender,
        updated_at = NOW()
    `
  } catch (err) {
    console.warn('Neon DB insertCorporateEmployee failed:', err)
  }
  return emp
}

export async function bulkInsertCorporateEmployeesInNeon(employees: CorporateEmployee[]): Promise<void> {
  for (const emp of employees) {
    await insertCorporateEmployeeInNeon(emp)
  }
}

export async function deleteCorporateEmployeeInNeon(id: string): Promise<boolean> {
  try {
    await sql`
      DELETE FROM corporate_employees
      WHERE id = ${id} AND company_id = ${ATHARVA_COMPANY_ID}
    `
    const cached = localStorage.getItem('ETS_SAVED_EMPLOYEES')
    if (cached) {
      const list: CorporateEmployee[] = JSON.parse(cached)
      const updated = list.filter((e) => e.id !== id)
      localStorage.setItem('ETS_SAVED_EMPLOYEES', JSON.stringify(updated))
    }
    return true
  } catch (err) {
    console.warn('Neon DB deleteCorporateEmployee failed:', err)
    return false
  }
}

export async function bulkDeleteCorporateEmployeesInNeon(ids: string[]): Promise<boolean> {
  try {
    await sql`
      DELETE FROM corporate_employees
      WHERE id = ANY(${ids}) AND company_id = ${ATHARVA_COMPANY_ID}
    `
    const cached = localStorage.getItem('ETS_SAVED_EMPLOYEES')
    if (cached) {
      const list: CorporateEmployee[] = JSON.parse(cached)
      const idSet = new Set(ids)
      const updated = list.filter((e) => !idSet.has(e.id))
      localStorage.setItem('ETS_SAVED_EMPLOYEES', JSON.stringify(updated))
    }
    return true
  } catch (err) {
    console.warn('Neon DB bulkDeleteCorporateEmployees failed:', err)
    return false
  }
}

