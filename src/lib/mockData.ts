import type {
  User,
  Driver,
  Vehicle,
  Trip,
  Wallet,
  WalletTransaction,
  Notification,
  DashboardData,
} from '../types'
import { logAuditEvent } from './auditLogger'

const DEMO_USER: User = {
  id: 'usr_harish_atharva',
  name: 'Harish Gowda',
  email: 'harish@atharvatravels.com',
  phone: '+91 98765 43210',
  role: 'VENDOR_ADMIN',
  companyId: 'cmp_atharva_travels',
  companyName: 'Atharva Travels',
}

const INITIAL_DRIVERS: Driver[] = []

const INITIAL_VEHICLES: Vehicle[] = []

const INITIAL_TRIPS: Trip[] = []

const INITIAL_TRANSACTIONS: WalletTransaction[] = []

const INITIAL_NOTIFICATIONS: Notification[] = []

// State persistence in LocalStorage
function getStored<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key)
    if (!val) return fallback
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed)) {
      return parsed.filter((item: any) => {
        if (!item || !item.id) return false
        const id = String(item.id)
        return (
          !id.startsWith('drv_0') &&
          !id.startsWith('veh_0') &&
          !id.startsWith('trip_0') &&
          !id.startsWith('tx_0') &&
          !id.startsWith('notif_0') &&
          !id.startsWith('shift-')
        )
      }) as T
    }
    return parsed
  } catch {
    return fallback
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    // ignore
  }
}

export function getMockResponse(
  url?: string,
  method: string = 'get',
  requestData?: unknown
): unknown | null {
  if (!url) return null
  const m = method.toLowerCase()
  const cleanUrl = url.split('?')[0]

  // 1. Auth Login
  if (cleanUrl.endsWith('/auth/login')) {
    return {
      status: 'success',
      data: {
        accessToken: 'glide_demo_vendor_token_harish',
        refreshToken: 'glide_demo_vendor_refresh_harish',
        user: DEMO_USER,
      },
    }
  }

  // 2. Auth Refresh
  if (cleanUrl.endsWith('/auth/refresh')) {
    return {
      status: 'success',
      data: {
        accessToken: 'glide_demo_vendor_token_harish_refreshed',
      },
    }
  }

  // 3. Auth Logout
  if (cleanUrl.endsWith('/auth/logout')) {
    return { status: 'success', data: { message: 'Logged out successfully' } }
  }

  // 4. Vendor Dashboard
  if (cleanUrl.endsWith('/vendor/dashboard')) {
    const trips = getStored<Trip[]>('glide_mock_trips', INITIAL_TRIPS)
    const walletBalance = getStored<number>('glide_mock_wallet_balance', 0)
    const drivers = getStored<Driver[]>('glide_mock_drivers', INITIAL_DRIVERS)
    const txs = getStored<WalletTransaction[]>('glide_mock_txs', INITIAL_TRANSACTIONS)

    const dashboard: DashboardData = {
      todayTrips: {
        total: trips.length,
        pending: trips.filter((t) => t.tripStatus === 'PENDING').length,
        confirmed: trips.filter((t) => t.tripStatus === 'CONFIRMED').length,
        inProgress: trips.filter((t) => t.tripStatus === 'IN_PROGRESS').length,
        completed: trips.filter((t) => t.tripStatus === 'COMPLETED').length,
        cancelled: trips.filter((t) => t.tripStatus === 'CANCELLED').length,
      },
      walletBalance,
      lowBalanceThreshold: 1000,
      activeDrivers: drivers.filter((d) => d.isActive).length,
      totalDrivers: drivers.length,
      upcomingTrips: trips.filter((t) => ['PENDING', 'CONFIRMED'].includes(t.tripStatus)),
      recentTrips: trips.slice(0, 10),
      recentTransactions: txs.slice(0, 5),
    }

    return { status: 'success', data: dashboard }
  }

  // 5. Vendor Wallet
  if (cleanUrl.endsWith('/vendor/wallet')) {
    const balance = getStored<number>('glide_mock_wallet_balance', 0)
    const wallet: Wallet = {
      id: 'wal_atharva_01',
      balance,
      entityType: 'VENDOR',
      entityId: 'cmp_atharva_travels',
    }
    return { status: 'success', data: wallet }
  }

  // 6. Vendor Wallet Transactions
  if (cleanUrl.endsWith('/vendor/wallet/transactions')) {
    const txs = getStored<WalletTransaction[]>('glide_mock_txs', INITIAL_TRANSACTIONS)
    return {
      status: 'success',
      data: txs,
      total: txs.length,
      page: 1,
      totalPages: 1,
    }
  }

  // 7. Wallet Recharge Order & Verify
  if (cleanUrl.endsWith('/vendor/wallet/recharge-order')) {
    const amount = Number((requestData as any)?.amount) || 5000
    if (amount > 100000) {
      return {
        status: 'error',
        message: 'Daily recharge limit of ₹1,00,000 exceeded',
      }
    }
    return {
      status: 'success',
      data: {
        orderId: `order_${Date.now()}`,
        amount,
        currency: 'INR',
        keyId: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
      },
    }
  }

  if (cleanUrl.endsWith('/vendor/wallet/recharge-verify')) {
    const currentBalance = getStored<number>('glide_mock_wallet_balance', 0)
    const amount = Number((requestData as any)?.amount) || 2500
    const newBalance = currentBalance + amount
    setStored('glide_mock_wallet_balance', newBalance)
    return {
      status: 'success',
      data: {
        verified: true,
        newBalance,
      },
    }
  }

  // Wallet Withdrawal (Only allowed if NO ongoing trips)
  if (cleanUrl.endsWith('/vendor/wallet/withdraw') && m === 'post') {
    const trips = getStored<Trip[]>('glide_mock_trips', INITIAL_TRIPS)
    const ongoing = trips.filter((t) =>
      ['PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(t.tripStatus)
    )
    if (ongoing.length > 0) {
      throw new Error(`Cannot withdraw funds while ${ongoing.length} active trip(s) are currently ongoing.`)
    }

    const payload = (typeof requestData === 'string' ? JSON.parse(requestData) : requestData) || {}
    const amountToWithdraw = Number(payload.amount) || 0
    const currentBalance = getStored<number>('glide_mock_wallet_balance', 24850)

    if (amountToWithdraw <= 0 || amountToWithdraw > currentBalance) {
      throw new Error('Invalid withdrawal amount.')
    }

    const newBalance = currentBalance - amountToWithdraw
    setStored('glide_mock_wallet_balance', newBalance)

    const txs = getStored<WalletTransaction[]>('glide_mock_txs', INITIAL_TRANSACTIONS)
    const newTx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'DEBIT',
      amount: amountToWithdraw,
      previousBalance: currentBalance,
      newBalance,
      description: `Vendor Wallet Settlement Withdrawal (${payload.method === 'UPI' ? 'UPI' : 'Bank Account IMPS'})`,
      reference: `WTH-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toISOString(),
    }
    setStored('glide_mock_txs', [newTx, ...txs])

    return {
      status: 'success',
      data: {
        newBalance,
        withdrawnAmount: amountToWithdraw,
        transaction: newTx,
      },
    }
  }

  // 8. Vendor Trips
  if (cleanUrl.endsWith('/vendor/trips/create') && m === 'post') {
    const trips = getStored<Trip[]>('glide_mock_trips', INITIAL_TRIPS)
    const payload = (typeof requestData === 'string' ? JSON.parse(requestData) : requestData) || {}
    const tripAmount = Number(payload.tripAmount) || 1200
    const newTrip: Trip = {
      id: `trip_${Date.now()}`,
      tripNo: `TRP-${Math.floor(100000 + Math.random() * 900000)}`,
      serviceType: payload.serviceType || 'RAC',
      passengerName: payload.passengerName || 'Passenger',
      passengerPhone: payload.passengerPhone || '+91 98000 00000',
      pickup: payload.pickup || 'Kempegowda Intl Airport - Terminal 1 (T1)',
      drop: payload.drop || 'Bengaluru City',
      scheduledDate: payload.scheduledDate || '2026-11-24',
      scheduledTime: payload.scheduledTime || '10:00',
      tripAmount,
      commissionRate: 0.15,
      commissionAmount: Math.round(tripAmount * 0.15),
      driverPayable: tripAmount - 10 - Math.round(tripAmount * 0.15),
      tripStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      notes: payload.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const updated = [newTrip, ...trips]
    setStored('glide_mock_trips', updated)

    // Debit wallet
    const currentBalance = getStored<number>('glide_mock_wallet_balance', 24850)
    const newBalance = Math.max(0, currentBalance - tripAmount)
    setStored('glide_mock_wallet_balance', newBalance)

    // Add debit transaction
    const txs = getStored<WalletTransaction[]>('glide_mock_txs', INITIAL_TRANSACTIONS)
    const newTx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'DEBIT',
      amount: tripAmount,
      previousBalance: currentBalance,
      newBalance,
      description: `Advance Escrow for ${newTrip.tripNo} (${newTrip.serviceType})`,
      reference: newTrip.tripNo,
      relatedTripId: newTrip.id,
      createdAt: new Date().toISOString(),
    }
    setStored('glide_mock_txs', [newTx, ...txs])

    return { status: 'success', data: newTrip }
  }

  if (cleanUrl.endsWith('/vendor/trips') && m === 'get') {
    const trips = getStored<Trip[]>('glide_mock_trips', INITIAL_TRIPS)
    return {
      status: 'success',
      data: trips,
      total: trips.length,
      page: 1,
      totalPages: 1,
    }
  }

  // Delete Trip
  if (cleanUrl.includes('/vendor/trips/') && m === 'delete') {
    const id = cleanUrl.split('/vendor/trips/')[1]?.split('/')[0]
    const trips = getStored<Trip[]>('glide_mock_trips', INITIAL_TRIPS)
    const target = trips.find((t) => t.id === id || t.tripNo === id)
    const updated = trips.filter((t) => t.id !== id && t.tripNo !== id)
    setStored('glide_mock_trips', updated)

    if (target) {
      logAuditEvent({
        action: 'TRIP_DELETED',
        entityType: 'TRIP',
        entityId: target.id,
        entityTitle: `Trip ${target.tripNo} (${target.serviceType})`,
        performedBy: 'Vendor Admin',
        summary: `Deleted trip ${target.tripNo} for passenger ${target.passengerName}`,
        details: { deleted: target },
      })
    }

    return { status: 'success', data: { id, deleted: true } }
  }

  // Update / Edit Trip
  if (cleanUrl.includes('/vendor/trips/') && (m === 'patch' || m === 'put')) {
    const id = cleanUrl.split('/vendor/trips/')[1]?.split('/')[0]
    const trips = getStored<Trip[]>('glide_mock_trips', INITIAL_TRIPS)
    const index = trips.findIndex((t) => t.id === id || t.tripNo === id)
    const payload = (typeof requestData === 'string' ? JSON.parse(requestData) : requestData) || {}

    if (index !== -1) {
      const prev = trips[index]
      const updatedTrip = {
        ...prev,
        ...payload,
        updatedAt: new Date().toISOString(),
      }
      trips[index] = updatedTrip
      setStored('glide_mock_trips', trips)

      logAuditEvent({
        action: 'TRIP_EDITED',
        entityType: 'TRIP',
        entityId: updatedTrip.id,
        entityTitle: `Trip ${updatedTrip.tripNo} (${updatedTrip.serviceType})`,
        performedBy: 'Vendor Admin',
        summary: `Updated trip ${updatedTrip.tripNo} details`,
        details: { previous: prev, updated: updatedTrip },
      })

      return { status: 'success', data: updatedTrip }
    }
    return { status: 'error', message: 'Trip not found' }
  }

  // Delete Wallet Transaction
  if (cleanUrl.includes('/vendor/wallet/transactions/') && m === 'delete') {
    const id = cleanUrl.split('/vendor/wallet/transactions/')[1]?.split('/')[0]
    const txs = getStored<WalletTransaction[]>('glide_mock_txs', INITIAL_TRANSACTIONS)
    const target = txs.find((t) => t.id === id)
    const updated = txs.filter((t) => t.id !== id)
    setStored('glide_mock_txs', updated)

    if (target) {
      logAuditEvent({
        action: 'WALLET_TX_DELETED',
        entityType: 'WALLET_TRANSACTION',
        entityId: target.id,
        entityTitle: `Transaction ${target.reference || target.id}`,
        performedBy: 'Vendor Admin',
        summary: `Deleted wallet transaction: ${target.description}`,
        details: { deleted: target },
      })
    }

    return { status: 'success', data: { id, deleted: true } }
  }

  // Update / Edit Wallet Transaction
  if (cleanUrl.includes('/vendor/wallet/transactions/') && (m === 'patch' || m === 'put')) {
    const id = cleanUrl.split('/vendor/wallet/transactions/')[1]?.split('/')[0]
    const txs = getStored<WalletTransaction[]>('glide_mock_txs', INITIAL_TRANSACTIONS)
    const index = txs.findIndex((t) => t.id === id)
    const payload = (typeof requestData === 'string' ? JSON.parse(requestData) : requestData) || {}

    if (index !== -1) {
      const prev = txs[index]
      const updatedTx = {
        ...prev,
        ...payload,
      }
      txs[index] = updatedTx
      setStored('glide_mock_txs', txs)

      logAuditEvent({
        action: 'WALLET_TX_EDITED',
        entityType: 'WALLET_TRANSACTION',
        entityId: updatedTx.id,
        entityTitle: `Transaction ${updatedTx.reference || updatedTx.id}`,
        performedBy: 'Vendor Admin',
        summary: `Updated wallet transaction: ${updatedTx.description}`,
        details: { previous: prev, updated: updatedTx },
      })

      return { status: 'success', data: updatedTx }
    }
    return { status: 'error', message: 'Transaction not found' }
  }

  // 9. Vendor Drivers
  if (cleanUrl.endsWith('/vendor/drivers')) {
    const drivers = getStored<Driver[]>('glide_mock_drivers', INITIAL_DRIVERS)
    return {
      status: 'success',
      data: drivers,
      total: drivers.length,
    }
  }

  // 10. Vendor Vehicles
  if (cleanUrl.endsWith('/vendor/vehicles')) {
    const vehicles = getStored<Vehicle[]>('glide_mock_vehicles', INITIAL_VEHICLES)
    return {
      status: 'success',
      data: vehicles,
      total: vehicles.length,
    }
  }

  // 11. Vendor Notifications
  if (cleanUrl.endsWith('/vendor/notifications')) {
    const notifs = getStored<Notification[]>('glide_mock_notifs', INITIAL_NOTIFICATIONS)
    return {
      status: 'success',
      data: notifs,
      total: notifs.length,
    }
  }

  if (cleanUrl.includes('/notifications') && cleanUrl.endsWith('/read')) {
    return { status: 'success', data: { marked: true } }
  }

  if (cleanUrl.endsWith('/notifications/mark-all-read')) {
    return { status: 'success', data: { markedAll: true } }
  }

  // 12. Reports
  if (cleanUrl.includes('/vendor/reports/trips')) {
    const trips = getStored<Trip[]>('glide_mock_trips', [])
    const completed = trips.filter((t) => t.tripStatus === 'COMPLETED')
    const cancelled = trips.filter((t) => t.tripStatus === 'CANCELLED')
    const totalRev = completed.reduce((sum, t) => sum + (t.tripAmount || 0), 0)

    return {
      status: 'success',
      data: {
        totalTrips: trips.length,
        completedTrips: completed.length,
        cancelledTrips: cancelled.length,
        totalRevenue: totalRev,
        byService: {
          RAC: {
            count: trips.filter((t) => t.serviceType === 'RAC').length,
            revenue: trips
              .filter((t) => t.serviceType === 'RAC' && t.tripStatus === 'COMPLETED')
              .reduce((sum, t) => sum + (t.tripAmount || 0), 0),
          },
          OUTSTATION: {
            count: trips.filter((t) => t.serviceType === 'OUTSTATION').length,
            revenue: trips
              .filter((t) => t.serviceType === 'OUTSTATION' && t.tripStatus === 'COMPLETED')
              .reduce((sum, t) => sum + (t.tripAmount || 0), 0),
          },
          PACKAGE: {
            count: trips.filter((t) => t.serviceType === 'PACKAGE').length,
            revenue: trips
              .filter((t) => t.serviceType === 'PACKAGE' && t.tripStatus === 'COMPLETED')
              .reduce((sum, t) => sum + (t.tripAmount || 0), 0),
          },
        },
        byStatus: {
          COMPLETED: completed.length,
          CANCELLED: cancelled.length,
          IN_PROGRESS: trips.filter((t) => t.tripStatus === 'IN_PROGRESS').length,
          CONFIRMED: trips.filter((t) => t.tripStatus === 'CONFIRMED').length,
          PENDING: trips.filter((t) => t.tripStatus === 'PENDING').length,
          DRIVER_ASSIGNED: trips.filter((t) => t.tripStatus === 'DRIVER_ASSIGNED').length,
          EN_ROUTE: trips.filter((t) => t.tripStatus === 'EN_ROUTE').length,
          ARRIVED: trips.filter((t) => t.tripStatus === 'ARRIVED').length,
        },
      },
    }
  }

  if (cleanUrl.includes('/vendor/reports/financial')) {
    const trips = getStored<Trip[]>('glide_mock_trips', [])
    const completed = trips.filter((t) => t.tripStatus === 'COMPLETED')
    const totalRev = completed.reduce((sum, t) => sum + (t.tripAmount || 0), 0)
    const totalComm = completed.reduce((sum, t) => sum + (t.commissionAmount || 0), 0)
    const totalPayable = completed.reduce((sum, t) => sum + (t.driverPayable || 0), 0)

    return {
      status: 'success',
      data: {
        totalRevenue: totalRev,
        totalCommission: totalComm,
        totalDriverPayable: totalPayable,
        netEarnings: totalComm,
        byDate: [],
      },
    }
  }

  if (cleanUrl.includes('/vendor/reports/driver-performance')) {
    const drivers = getStored<Driver[]>('glide_mock_drivers', [])
    const trips = getStored<Trip[]>('glide_mock_trips', [])
    return {
      status: 'success',
      data: drivers.map((d) => {
        const driverTrips = trips.filter((t) => t.driverId === d.id)
        const completedTrips = driverTrips.filter((t) => t.tripStatus === 'COMPLETED')
        return {
          driverId: d.id,
          driverName: d.name,
          totalTrips: driverTrips.length,
          completedTrips: completedTrips.length,
          cancelledTrips: driverTrips.filter((t) => t.tripStatus === 'CANCELLED').length,
          totalEarnings: completedTrips.reduce((sum, t) => sum + (t.driverPayable || 0), 0),
          rating: 5.0,
        }
      }),
    }
  }

  return null
}
