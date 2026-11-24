import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import toast from 'react-hot-toast'
import { getMockResponse } from './mockData'

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

// Request interceptor — attach JWT or short-circuit in static demo mode
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // If deployed on static host (Netlify) without a configured backend endpoint, serve mock directly
    if (isStaticOrUnreachableHost()) {
      const mock = getMockResponse(config.url, config.method, config.data)
      if (mock !== null) {
        config.adapter = async () => ({
          data: mock,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
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
  (response) => {
    // If static host returns index.html for unmatched /api routes
    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
      const mock = getMockResponse(response.config.url, response.config.method, response.config.data)
      if (mock !== null) {
        return {
          ...response,
          data: mock,
        }
      }
    }
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    // Fallback to mock data if network failed or endpoint not found on static host
    if (originalRequest) {
      const url = originalRequest.url
      const method = originalRequest.method || 'get'
      const requestData = originalRequest.data
      const mock = getMockResponse(url, method, requestData)
      if (mock !== null) {
        return {
          data: mock,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: originalRequest,
        }
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
  // Wallet
  getWallet: () => api.get('/vendor/wallet'),
  getTransactions: (params?: Record<string, string>) => api.get('/vendor/wallet/transactions', { params }),
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
