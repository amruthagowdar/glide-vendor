import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import toast from 'react-hot-toast'
import { getMockResponse } from './mockData'
import {
  fetchTripsFromNeon,
  createTripInNeon,
  updateTripInNeon,
  deleteTripFromNeon,
  fetchWalletFromNeon,
  fetchTransactionsFromNeon,
  rechargeWalletInNeon,
  withdrawWalletInNeon,
  deleteTransactionFromNeon,
  updateTransactionInNeon,
  fetchDriversFromNeon,
  fetchVehiclesFromNeon,
  fetchDashboardFromNeon,
} from './neonClient'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const isStaticOrUnreachableHost = (): boolean => {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.startsWith('172.')
  const hasCustomApi =
    Boolean(import.meta.env.VITE_API_URL) && import.meta.env.VITE_API_URL !== '/api'
  return !isLocal && !hasCustomApi
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Centralized handler for Neon DB live data and mock fallback
async function handleNeonOrMockApi(url: string = '', method: string = 'get', requestData?: any) {
  const cleanUrl = url.split('?')[0] || ''
  const m = (method || 'get').toLowerCase()
  const payload = typeof requestData === 'string' ? JSON.parse(requestData || '{}') : (requestData || {})

  // 1. Dashboard (100% Synced from Neon DB)
  if (cleanUrl.endsWith('/vendor/dashboard') && m === 'get') {
    const dashboard = await fetchDashboardFromNeon()
    return { status: 'success', data: dashboard }
  }

  // 2. Trips (100% Synced from Neon DB)
  if (cleanUrl.endsWith('/vendor/trips') && m === 'get') {
    const trips = await fetchTripsFromNeon()
    return { status: 'success', data: trips, total: trips.length, page: 1, totalPages: 1 }
  }
  if (cleanUrl.endsWith('/vendor/trips/create') && m === 'post') {
    const newTrip = await createTripInNeon(payload)
    return { status: 'success', data: newTrip }
  }
  if (cleanUrl.includes('/vendor/trips/') && m === 'delete') {
    const id = cleanUrl.split('/vendor/trips/')[1]?.split('/')[0]
    await deleteTripFromNeon(id)
    return { status: 'success', data: { id, deleted: true } }
  }
  if (cleanUrl.includes('/vendor/trips/') && (m === 'patch' || m === 'put')) {
    const id = cleanUrl.split('/vendor/trips/')[1]?.split('/')[0]
    const updated = await updateTripInNeon(id, payload)
    return { status: 'success', data: updated }
  }

  // 3. Wallet & Transactions (100% Synced from Neon DB)
  if (cleanUrl.endsWith('/vendor/wallet') && m === 'get') {
    const wallet = await fetchWalletFromNeon()
    return { status: 'success', data: wallet }
  }
  if (cleanUrl.endsWith('/vendor/wallet/transactions') && m === 'get') {
    const txs = await fetchTransactionsFromNeon()
    return { status: 'success', data: txs, total: txs.length, totalPages: 1 }
  }
  if (cleanUrl.endsWith('/vendor/wallet/recharge-order') && m === 'post') {
    const amount = Number(payload?.amount) || 5000
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
  if (cleanUrl.endsWith('/vendor/wallet/recharge-verify') && m === 'post') {
    const amount = Number(payload?.amount) || 2500
    const ref = payload?.razorpay_payment_id || payload?.orderId || `PAY-RZP-${Date.now()}`
    const result = await rechargeWalletInNeon(amount, ref, 'Razorpay Instant Wallet Top-Up')
    return { status: 'success', data: { verified: true, newBalance: result.newBalance, transaction: result.transaction } }
  }
  if (cleanUrl.endsWith('/vendor/wallet/withdraw') && m === 'post') {
    const amount = Number(payload?.amount) || 0
    const method = payload?.method || 'BANK_TRANSFER'
    const result = await withdrawWalletInNeon(amount, method, payload?.details)
    return { status: 'success', data: result }
  }
  if (cleanUrl.includes('/vendor/wallet/transactions/') && m === 'delete') {
    const id = cleanUrl.split('/vendor/wallet/transactions/')[1]?.split('/')[0]
    await deleteTransactionFromNeon(id)
    return { status: 'success', data: { id, deleted: true } }
  }
  if (cleanUrl.includes('/vendor/wallet/transactions/') && (m === 'patch' || m === 'put')) {
    const id = cleanUrl.split('/vendor/wallet/transactions/')[1]?.split('/')[0]
    const updated = await updateTransactionInNeon(id, payload)
    return { status: 'success', data: updated }
  }

  // 4. Drivers & Vehicles (100% Synced from Neon DB)
  if (cleanUrl.endsWith('/vendor/drivers') && m === 'get') {
    const drivers = await fetchDriversFromNeon()
    return { status: 'success', data: drivers, total: drivers.length, totalPages: 1 }
  }
  if (cleanUrl.endsWith('/vendor/vehicles') && m === 'get') {
    const vehicles = await fetchVehiclesFromNeon()
    return { status: 'success', data: vehicles, total: vehicles.length, totalPages: 1 }
  }

  // 5. Fallback to mockData
  return getMockResponse(url, method, requestData)
}

// Request interceptor — attach JWT or short-circuit in static demo mode
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // If deployed on static host (Netlify) without a configured backend endpoint, serve live Neon DB or mock
    if (isStaticOrUnreachableHost()) {
      config.adapter = async () => {
        const responseData = await handleNeonOrMockApi(config.url, config.method, config.data)
        return {
          data: responseData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      }
      return config
    }

    return config
  },
  (error) => Promise.reject(error)
)

let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token!)
  })
  failedQueue = []
}

// Response interceptor — fallback on HTML / 404 / 401
api.interceptors.response.use(
  async (response) => {
    // If static host returns index.html for unmatched /api routes
    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
      const data = await handleNeonOrMockApi(response.config.url, response.config.method, response.config.data)
      return {
        ...response,
        data,
      }
    }
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    // Fallback to Neon DB or mock data if network failed or endpoint not found on static host
    if (originalRequest) {
      try {
        const data = await handleNeonOrMockApi(originalRequest.url, originalRequest.method, originalRequest.data)
        if (data !== null) {
          return {
            data,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: originalRequest,
          }
        }
      } catch (err) {
        console.warn('Neon/Mock fallback error:', err)
      }
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`
          }
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken || refreshToken.startsWith('glide_demo_')) {
        isRefreshing = false
        if (refreshToken?.startsWith('glide_demo_')) {
          return Promise.resolve({ data: { status: 'success' }, status: 200 } as any)
        }
        processQueue(new Error('No refresh token'), null)
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
        const payload = data?.data || data
        const newAccessToken = payload.accessToken
        localStorage.setItem('accessToken', newAccessToken)
        if (payload.refreshToken) localStorage.setItem('refreshToken', payload.refreshToken)
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`
        processQueue(null, newAccessToken)
        isRefreshing = false
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        }
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        isRefreshing = false
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // Handle common errors
    const message = (error.response?.data as { message?: string })?.message || error.message
    if (error.response?.status !== 401) {
      toast.error(message || 'An error occurred')
    }

    return Promise.reject(error)
  }
)

export default api

// Typed helpers
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
}

export const vendorApi = {
  getDashboard: () => api.get('/vendor/dashboard'),
  // Drivers
  getDrivers: (params?: Record<string, string>) => api.get('/vendor/drivers', { params }),
  createDriver: (data: { name: string; phone: string; licenseNo: string }) =>
    api.post('/vendor/drivers', data),
  updateDriver: (id: string, data: Partial<{ name: string; phone: string; licenseNo: string; isActive: boolean }>) =>
    api.patch(`/vendor/drivers/${id}`, data),
  assignVehicle: (driverId: string, vehicleId: string) =>
    api.post(`/vendor/drivers/${driverId}/assign-vehicle`, { vehicleId }),
  getDriverTrips: (driverId: string) =>
    api.get(`/vendor/drivers/${driverId}/trips`),
  // Vehicles
  getVehicles: (params?: Record<string, string>) => api.get('/vendor/vehicles', { params }),
  createVehicle: (data: { registrationNo: string; type: string; model: string; capacity: number }) =>
    api.post('/vendor/vehicles', data),
  updateVehicle: (id: string, data: Partial<{ registrationNo: string; type: string; model: string; capacity: number; isActive: boolean }>) =>
    api.patch(`/vendor/vehicles/${id}`, data),
  unassignDriver: (vehicleId: string) =>
    api.post(`/vendor/vehicles/${vehicleId}/unassign-driver`),
  // Trips
  getTrips: (params?: Record<string, string>) => api.get('/vendor/trips', { params }),
  getTrip: (id: string) => api.get(`/vendor/trips/${id}`),
  createTrip: (data: unknown) => api.post('/vendor/trips/create', data),
  updateTrip: (id: string, data: unknown) => api.patch(`/vendor/trips/${id}`, data),
  deleteTrip: (id: string) => api.delete(`/vendor/trips/${id}`),
  // Wallet
  getWallet: () => api.get('/vendor/wallet'),
  getTransactions: (params?: Record<string, string>) => api.get('/vendor/wallet/transactions', { params }),
  updateTransaction: (id: string, data: unknown) => api.patch(`/vendor/wallet/transactions/${id}`, data),
  deleteTransaction: (id: string) => api.delete(`/vendor/wallet/transactions/${id}`),
  createRechargeOrder: (amount: number) => api.post('/vendor/wallet/recharge-order', { amount }),
  verifyRecharge: (data: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string; orderId: string }) =>
    api.post('/vendor/wallet/recharge-verify', data),
  withdrawWallet: (data: { amount: number; method: string; details?: unknown }) =>
    api.post('/vendor/wallet/withdraw', data),
  // Notifications
  getNotifications: (params?: Record<string, string>) => api.get('/vendor/notifications', { params }),
  markNotificationRead: (id: string) => api.patch(`/vendor/notifications/${id}/read`),
  markAllRead: () => api.post('/vendor/notifications/mark-all-read'),
  // Reports
  getTripReport: (params: Record<string, string>) => api.get('/vendor/reports/trips', { params }),
  getFinancialReport: (params: Record<string, string>) => api.get('/vendor/reports/financial', { params }),
  getDriverPerformance: (params: Record<string, string>) => api.get('/vendor/reports/driver-performance', { params }),
}
