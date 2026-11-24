import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Bell, CheckCheck, Clock } from 'lucide-react'
import { vendorApi } from '../lib/api'
import { formatDateTime } from '../lib/utils'
import type { Notification } from '../types'

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [filterType, setFilterType] = useState<string>('')

  const { data, isLoading } = useQuery<{ data: Notification[]; total: number }>({
    queryKey: ['notifications', filterType],
    queryFn: async () => {
      const params: Record<string, string> = { limit: '50' }
      if (filterType) params.type = filterType
      const res = await vendorApi.getNotifications(params)
      if (Array.isArray(res.data)) {
        return { data: res.data, total: res.data.length }
      }
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : []
      return {
        data: list,
        total: res.data?.total || list.length,
      }
    },
  })

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await vendorApi.markNotificationRead(id)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return (await vendorApi.markAllRead()).data
    },
    onSuccess: () => {
      toast.success('All notifications marked as read')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const notifications = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-xs text-slate-500 mt-1">
            Trip updates, driver alerts, wallet status, and platform announcements
          </p>
        </div>
        <button
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending || notifications.length === 0}
          className="btn-secondary text-sm flex items-center gap-1.5"
        >
          <CheckCheck className="w-4 h-4 text-sky-700" />
          <span>Mark All Read</span>
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-sky-100 pb-2">
        {['', 'TRIP', 'WALLET', 'DRIVER', 'SYSTEM'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterType === type
                ? 'bg-sky-900 text-white'
                : 'text-slate-600 hover:bg-sky-50'
            }`}
          >
            {type ? `${type} ALERTS` : 'ALL NOTIFICATIONS'}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="card overflow-hidden divide-y divide-sky-50">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-10 h-10 text-sky-200 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 text-sm">No notifications found</p>
            <p className="text-xs text-slate-400 mt-1">
              You are all caught up with your fleet updates.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                !n.isRead ? 'bg-sky-50/60' : 'bg-white hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                    !n.isRead ? 'bg-amber-500' : 'bg-transparent'
                  }`}
                />
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">{n.title}</h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{formatDateTime(n.createdAt)}</span>
                  </div>
                </div>
              </div>

              {!n.isRead && (
                <button
                  onClick={() => markReadMutation.mutate(n.id)}
                  title="Mark as read"
                  className="text-xs text-sky-700 hover:text-sky-900 font-semibold flex-shrink-0 p-1"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
