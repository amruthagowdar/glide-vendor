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

const DEMO_USER: User = {
  id: 'usr_harish_atharva',
  name: 'Harish Gowda',
  email: 'harish@atharvatravels.com',
  phone: '+91 98765 43210',
  role: 'VENDOR_ADMIN',
  companyId: 'cmp_atharva_travels',
  companyName: 'Atharva Travels',
}

const INITIAL_DRIVERS: Driver[] = [
  {
    id: 'drv_01',
    name: 'Rajesh Kumar',
    phone: '+91 98451 23456',
    licenseNo: 'KA-04-2018-00912',
    isActive: true,
    vehicleId: 'veh_01',
    vehicleRegNo: 'KA-04-ME-1122',
    vehicleModel: 'Toyota Innova Crysta',
    activeTrips: 1,
    companyId: 'cmp_atharva_travels',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'drv_02',
    name: 'Suresh Patil',
    phone: '+91 98452 34567',
    licenseNo: 'KA-01-2019-01824',
    isActive: true,
    vehicleId: 'veh_02',
    vehicleRegNo: 'KA-01-AB-3344',
    vehicleModel: 'Maruti Suzuki Dzire',
    activeTrips: 0,
    companyId: 'cmp_atharva_travels',
    createdAt: '2026-02-15T09:00:00Z',
  },
  {
    id: 'drv_03',
    name: 'Manjunath Gowda',
    phone: '+91 98453 45678',
    licenseNo: 'KA-51-2020-03211',
    isActive: true,
    vehicleId: 'veh_03',
    vehicleRegNo: 'KA-51-CD-5566',
    vehicleModel: 'Maruti Suzuki Ertiga',
    activeTrips: 1,
    companyId: 'cmp_atharva_travels',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'drv_04',
    name: 'Anand Kumar',
    phone: '+91 98454 56789',
    licenseNo: 'KA-05-2021-04192',
    isActive: true,
    vehicleId: 'veh_04',
    vehicleRegNo: 'KA-05-EF-7788',
    vehicleModel: 'Toyota Fortuner',
    activeTrips: 0,
    companyId: 'cmp_atharva_travels',
    createdAt: '2026-04-12T11:00:00Z',
  },
  {
    id: 'drv_05',
    name: 'Ramesh Babu',
    phone: '+91 98455 67890',
    licenseNo: 'KA-02-2022-05831',
    isActive: false,
    companyId: 'cmp_atharva_travels',
    createdAt: '2026-05-20T12:00:00Z',
  },
]

const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'veh_01',
    registrationNo: 'KA-04-ME-1122',
    type: 'Prime SUV 7+1',
    model: 'Toyota Innova Crysta',
    capacity: 7,
    isActive: true,
    driverId: 'drv_01',
    driverName: 'Rajesh Kumar',
    companyId: 'cmp_atharva_travels',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'veh_02',
    registrationNo: 'KA-01-AB-3344',
    type: 'Sedan 4+1',
    model: 'Maruti Suzuki Dzire',
    capacity: 4,
    isActive: true,
    driverId: 'drv_02',
    driverName: 'Suresh Patil',
    companyId: 'cmp_atharva_travels',
    createdAt: '2026-02-15T09:00:00Z',
  },
  {
    id: 'veh_03',
    registrationNo: 'KA-51-CD-5566',
    type: 'SUV 6+1',
    model: 'Maruti Suzuki Ertiga',
    capacity: 6,
    isActive: true,
    driverId: 'drv_03',
    driverName: 'Manjunath Gowda',
    companyId: 'cmp_atharva_travels',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'veh_04',
    registrationNo: 'KA-05-EF-7788',
    type: 'Prime SUV 7+1',
    model: 'Toyota Fortuner',
    capacity: 7,
    isActive: true,
    driverId: 'drv_04',
    driverName: 'Anand Kumar',
    companyId: 'cmp_atharva_travels',
    createdAt: '2026-04-12T11:00:00Z',
  },
  {
    id: 'veh_05',
    registrationNo: 'KA-03-GH-9900',
    type: 'Prime Sedan 4+1',
    model: 'Honda City',
    capacity: 4,
    isActive: true,
    companyId: 'cmp_atharva_travels',
    createdAt: '2026-06-01T10:00:00Z',
  },
]

const INITIAL_TRIPS: Trip[] = [
  {
    id: 'trip_01',
    tripNo: 'TRP-849201',
    serviceType: 'RAC',
    passengerName: 'Kavitha Hegde',
    passengerPhone: '+91 98450 11223',
    pickup: 'Kempegowda Intl Airport - Terminal 1 (T1)',
    drop: 'Indiranagar 100ft Road, Bengaluru',
    scheduledDate: '2026-11-24',
    scheduledTime: '10:30',
    driverId: 'drv_01',
    driverName: 'Rajesh Kumar',
    vehicleId: 'veh_01',
    vehicleRegNo: 'KA-04-ME-1122',
    tripAmount: 1350,
    commissionRate: 0.15,
    commissionAmount: 202.5,
    driverPayable: 1137.5,
    tripStatus: 'IN_PROGRESS',
    paymentStatus: 'PAID',
    notes: '[Vehicle: Sedan 4+1] Flight 6E-204 arrived on time',
    createdAt: '2026-11-24T04:30:00Z',
    updatedAt: '2026-11-24T05:00:00Z',
  },
  {
    id: 'trip_02',
    tripNo: 'TRP-849202',
    serviceType: 'RAC',
    passengerName: 'Nitin Sharma',
    passengerPhone: '+91 98451 99887',
    pickup: 'Koramangala 4th Block, Bengaluru',
    drop: 'Kempegowda Intl Airport - Terminal 2 (T2)',
    scheduledDate: '2026-11-24',
    scheduledTime: '13:00',
    driverId: 'drv_03',
    driverName: 'Manjunath Gowda',
    vehicleId: 'veh_03',
    vehicleRegNo: 'KA-51-CD-5566',
    tripAmount: 1450,
    commissionRate: 0.15,
    commissionAmount: 217.5,
    driverPayable: 1222.5,
    tripStatus: 'CONFIRMED',
    paymentStatus: 'PAID',
    notes: '[Vehicle: Prime Sedan 4+1] Terminal 2 International Departure',
    createdAt: '2026-11-24T04:45:00Z',
    updatedAt: '2026-11-24T04:45:00Z',
  },
  {
    id: 'trip_03',
    tripNo: 'TRP-849198',
    serviceType: 'RAC',
    passengerName: 'Amit Saxena',
    passengerPhone: '+91 98450 77665',
    pickup: 'Kempegowda Intl Airport - Terminal 1 (T1)',
    drop: 'Whitefield ITPL Main Road, Bengaluru',
    scheduledDate: '2026-11-24',
    scheduledTime: '08:15',
    driverId: 'drv_02',
    driverName: 'Suresh Patil',
    vehicleId: 'veh_02',
    vehicleRegNo: 'KA-01-AB-3344',
    tripAmount: 1480,
    commissionRate: 0.15,
    commissionAmount: 222,
    driverPayable: 1248,
    tripStatus: 'COMPLETED',
    paymentStatus: 'PAID',
    notes: '[Vehicle: Sedan 4+1] Completed successfully',
    createdAt: '2026-11-24T02:00:00Z',
    updatedAt: '2026-11-24T03:30:00Z',
  },
  {
    id: 'trip_04',
    tripNo: 'TRP-849185',
    serviceType: 'OUTSTATION',
    passengerName: 'Deepak Rao',
    passengerPhone: '+91 98450 55443',
    pickup: 'Jayanagar 4th Block, Bengaluru',
    drop: 'Mysuru Palace, Mysuru',
    scheduledDate: '2026-11-25',
    scheduledTime: '06:00',
    tripAmount: 4200,
    commissionRate: 0.15,
    commissionAmount: 630,
    driverPayable: 3560,
    tripStatus: 'PENDING',
    paymentStatus: 'PAID',
    notes: '[Vehicle: SUV 6+1] Weekend round-trip booking',
    createdAt: '2026-11-24T05:00:00Z',
    updatedAt: '2026-11-24T05:00:00Z',
  },
]

const INITIAL_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 'tx_01',
    type: 'CREDIT',
    amount: 10000,
    previousBalance: 14850,
    newBalance: 24850,
    description: 'Vendor Prepaid Wallet Topup (Razorpay #pay_Nx812903)',
    reference: 'pay_Nx812903',
    createdAt: '2026-11-24T03:00:00Z',
  },
  {
    id: 'tx_02',
    type: 'DEBIT',
    amount: 1350,
    previousBalance: 16200,
    newBalance: 14850,
    description: 'Booking Advance Escrow for TRP-849201 (BLR Airport Pickup)',
    reference: 'TRP-849201',
    relatedTripId: 'trip_01',
    createdAt: '2026-11-24T04:30:00Z',
  },
  {
    id: 'tx_03',
    type: 'DEBIT',
    amount: 1450,
    previousBalance: 17650,
    newBalance: 16200,
    description: 'Booking Advance Escrow for TRP-849202 (BLR Airport Drop T2)',
    reference: 'TRP-849202',
    relatedTripId: 'trip_02',
    createdAt: '2026-11-24T04:45:00Z',
  },
  {
    id: 'tx_04',
    type: 'CREDIT',
    amount: 5000,
    previousBalance: 12650,
    newBalance: 17650,
    description: 'Weekly Fleet Operations Bonus Credited',
    reference: 'SYS_BONUS_W47',
    createdAt: '2026-11-23T18:00:00Z',
  },
]

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif_01',
    title: 'Airport Booking Dispatched',
    message: 'Rajesh Kumar assigned to Kempegowda Terminal 1 pickup for Kavitha Hegde.',
    type: 'TRIP',
    isRead: false,
    relatedEntity: 'TRIP',
    relatedId: 'trip_01',
    createdAt: '2026-11-24T04:35:00Z',
  },
  {
    id: 'notif_02',
    title: 'Prepaid Wallet Recharged',
    message: '₹10,000 added successfully via Razorpay. Current balance: ₹24,850.',
    type: 'WALLET',
    isRead: false,
    relatedEntity: 'WALLET',
    createdAt: '2026-11-24T03:00:00Z',
  },
  {
    id: 'notif_03',
    title: 'Low Fare Minimum Enforced',
    message: 'Airport Transfer minimum ₹1,200 rule applied successfully across bookings.',
    type: 'SYSTEM',
    isRead: true,
    createdAt: '2026-11-23T20:00:00Z',
  },
]

// State persistence in LocalStorage
function getStored<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : fallback
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
    const walletBalance = getStored<number>('glide_mock_wallet_balance', 24850)
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
    const balance = getStored<number>('glide_mock_wallet_balance', 24850)
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
    return {
      status: 'success',
      data: {
        orderId: `order_${Date.now()}`,
        amount: 5000,
        currency: 'INR',
        keyId: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
      },
    }
  }

  if (cleanUrl.endsWith('/vendor/wallet/recharge-verify')) {
    const currentBalance = getStored<number>('glide_mock_wallet_balance', 24850)
    const newBalance = currentBalance + 5000
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
    return {
      status: 'success',
      data: {
        totalTrips: 184,
        completedTrips: 172,
        cancelledTrips: 4,
        totalRevenue: 284500,
        byService: {
          RAC: { count: 120, revenue: 168000 },
          OUTSTATION: { count: 48, revenue: 96500 },
          PACKAGE: { count: 16, revenue: 20000 },
        },
        byStatus: {
          COMPLETED: 172,
          CANCELLED: 4,
          IN_PROGRESS: 5,
          CONFIRMED: 3,
          PENDING: 0,
          DRIVER_ASSIGNED: 0,
          EN_ROUTE: 0,
          ARRIVED: 0,
        },
      },
    }
  }

  if (cleanUrl.includes('/vendor/reports/financial')) {
    return {
      status: 'success',
      data: {
        totalRevenue: 284500,
        totalCommission: 42675,
        totalDriverPayable: 239985,
        netEarnings: 42675,
        byDate: [
          { date: '19 Nov', revenue: 38000, commission: 5700, driverPayable: 32050 },
          { date: '20 Nov', revenue: 42000, commission: 6300, driverPayable: 35430 },
          { date: '21 Nov', revenue: 46000, commission: 6900, driverPayable: 38810 },
          { date: '22 Nov', revenue: 49000, commission: 7350, driverPayable: 41340 },
          { date: '23 Nov', revenue: 53000, commission: 7950, driverPayable: 44710 },
          { date: '24 Nov', revenue: 56500, commission: 8475, driverPayable: 47645 },
        ],
      },
    }
  }

  if (cleanUrl.includes('/vendor/reports/driver-performance')) {
    return {
      status: 'success',
      data: [
        { driverId: 'drv_01', driverName: 'Rajesh Kumar', totalTrips: 58, completedTrips: 56, cancelledTrips: 1, totalEarnings: 68400, rating: 4.9 },
        { driverId: 'drv_02', driverName: 'Suresh Patil', totalTrips: 46, completedTrips: 44, cancelledTrips: 1, totalEarnings: 54200, rating: 4.8 },
        { driverId: 'drv_03', driverName: 'Manjunath Gowda', totalTrips: 52, completedTrips: 50, cancelledTrips: 2, totalEarnings: 61800, rating: 4.9 },
        { driverId: 'drv_04', driverName: 'Anand Kumar', totalTrips: 28, completedTrips: 27, cancelledTrips: 0, totalEarnings: 35848, rating: 4.7 },
      ],
    }
  }

  return null
}
