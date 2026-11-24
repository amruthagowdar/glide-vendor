/**
 * Audit Logger Service
 * Persistently stores all trip & wallet modifications and deletions.
 * Structured for direct integration with the future Admin Dashboard.
 */

export type AuditAction =
  | 'TRIP_DELETED'
  | 'TRIP_EDITED'
  | 'WALLET_TX_DELETED'
  | 'WALLET_TX_EDITED'

export interface AuditLogEntry {
  id: string
  timestamp: string
  action: AuditAction
  entityType: 'TRIP' | 'WALLET_TRANSACTION'
  entityId: string
  entityTitle: string
  performedBy: string
  summary: string
  details: {
    previous?: any
    updated?: any
    deleted?: any
  }
}

const AUDIT_STORAGE_KEY = 'glide_admin_audit_logs'

/**
 * Retrieves all stored audit logs
 */
export function getAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Logs a new audit event for later inspection in Admin Dashboard
 */
export function logAuditEvent(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
): AuditLogEntry {
  const existing = getAuditLogs()
  const newLog: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  }

  try {
    const updated = [newLog, ...existing]
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated.slice(0, 500)))
  } catch (err) {
    console.warn('Failed to persist audit log:', err)
  }

  // Also dispatch custom browser event for real-time listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('glide:audit_log_created', { detail: newLog })
    )
  }

  return newLog
}
