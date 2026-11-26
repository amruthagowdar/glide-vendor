import { useQuery } from '@tanstack/react-query'
import { vendorApi } from '../lib/api'
import type { Wallet } from '../types'

export function useWallet() {
  return useQuery<Wallet>({
    queryKey: ['wallet'],
    queryFn: async () => {
      const res = await vendorApi.getWallet()
      const data = res.data?.data || res.data || {}
      return {
        ...data,
        balance: parseFloat(data.balance ?? 0),
      }
    },
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  })
}

export function useNotificationCount() {
  return useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await vendorApi.getNotifications({ isRead: 'false', limit: '1' })
      const data = res.data?.data || res.data || {}
      return data.total || 0
    },
    refetchInterval: 30_000,
  })
}
