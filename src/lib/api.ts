import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// Request interceptor — attach JWT
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
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

// Response interceptor — auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
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
      if (!refreshToken) {
        processQueue(new Error('No refresh token'), null)
        isRefreshing = false
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
  // Notifications
  getNotifications: (params?: Record<string, string>) => api.get('/vendor/notifications', { params }),
  markNotificationRead: (id: string) => api.patch(`/vendor/notifications/${id}/read`),
  markAllRead: () => api.post('/vendor/notifications/mark-all-read'),
  // Reports
  getTripReport: (params: Record<string, string>) => api.get('/vendor/reports/trips', { params }),
  getFinancialReport: (params: Record<string, string>) => api.get('/vendor/reports/financial', { params }),
  getDriverPerformance: (params: Record<string, string>) => api.get('/vendor/reports/driver-performance', { params }),
}
