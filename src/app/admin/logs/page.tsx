'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/layout/admin-layout'
import { 
  FileText, 
  Search, 
  Filter,
  Download,
  Eye,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Building2,
  CreditCard,
  Shield,
  Calendar,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface AuditLogEntry {
  id: string
  action: string
  actorId: string
  actorEmail: string
  actorRole: string
  targetId?: string
  targetType?: string
  details: any
  ipAddress: string
  userAgent: string
  timestamp: string
}

interface LogsResponse {
  logs: AuditLogEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<LogsResponse['pagination'] | null>(null)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [dateRange, setDateRange] = useState('24h')
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Mock data for demonstration since audit logging is not fully implemented in DB
  const mockLogs: AuditLogEntry[] = [
    {
      id: 'audit_1',
      action: 'USER_CREATED',
      actorId: 'admin_1',
      actorEmail: 'admin@tightship.com',
      actorRole: 'ADMIN',
      targetId: 'user_123',
      targetType: 'user',
      details: { email: 'newuser@example.com', role: 'STAFF', organizationId: 'org_456' },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      timestamp: new Date(Date.now() - 30000).toISOString()
    },
    {
      id: 'audit_2',
      action: 'ORGANIZATION_SUSPENDED',
      actorId: 'admin_1',
      actorEmail: 'admin@tightship.com',
      actorRole: 'ADMIN',
      targetId: 'org_789',
      targetType: 'organization',
      details: { reason: 'Payment failure', organizationName: 'Test Restaurant Group' },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      timestamp: new Date(Date.now() - 120000).toISOString()
    },
    {
      id: 'audit_3',
      action: 'SUBSCRIPTION_CANCELLED',
      actorId: 'admin_1',
      actorEmail: 'admin@tightship.com',
      actorRole: 'ADMIN',
      targetId: 'sub_101',
      targetType: 'subscription',
      details: { reason: 'Admin action', planName: 'Professional Plan' },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      timestamp: new Date(Date.now() - 300000).toISOString()
    },
    {
      id: 'audit_4',
      action: 'ADMIN_LOGIN',
      actorId: 'admin_2',
      actorEmail: 'superadmin@tightship.com',
      actorRole: 'OWNER',
      targetId: 'admin_2',
      targetType: 'user',
      details: { loginMethod: 'credentials' },
      ipAddress: '10.0.1.50',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      timestamp: new Date(Date.now() - 600000).toISOString()
    },
    {
      id: 'audit_5',
      action: 'BULK_ACTION_PERFORMED',
      actorId: 'admin_1',
      actorEmail: 'admin@tightship.com',
      actorRole: 'ADMIN',
      targetType: 'system',
      details: { action: 'LIST_USERS', count: 45, filters: { role: 'all', status: 'active' } },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      timestamp: new Date(Date.now() - 900000).toISOString()
    }
  ]

  useEffect(() => {
    fetchLogs()
  }, [page, search, actionFilter, roleFilter, dateRange])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      
      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 500))
      
      let filteredLogs = [...mockLogs]
      
      // Apply filters
      if (search) {
        filteredLogs = filteredLogs.filter(log => 
          log.actorEmail.toLowerCase().includes(search.toLowerCase()) ||
          log.action.toLowerCase().includes(search.toLowerCase()) ||
          JSON.stringify(log.details).toLowerCase().includes(search.toLowerCase())
        )
      }
      
      if (actionFilter !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.action.includes(actionFilter))
      }
      
      if (roleFilter !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.actorRole === roleFilter)
      }
      
      // Date range filter
      const now = new Date()
      let cutoffDate = new Date()
      switch (dateRange) {
        case '1h':
          cutoffDate.setHours(cutoffDate.getHours() - 1)
          break
        case '24h':
          cutoffDate.setDate(cutoffDate.getDate() - 1)
          break
        case '7d':
          cutoffDate.setDate(cutoffDate.getDate() - 7)
          break
        case '30d':
          cutoffDate.setDate(cutoffDate.getDate() - 30)
          break
      }
      
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= cutoffDate)
      
      setLogs(filteredLogs)
      setPagination({
        page,
        limit: 20,
        total: filteredLogs.length,
        totalPages: Math.ceil(filteredLogs.length / 20)
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    if (action.includes('USER')) return <User className="h-4 w-4" />
    if (action.includes('ORGANIZATION')) return <Building2 className="h-4 w-4" />
    if (action.includes('SUBSCRIPTION')) return <CreditCard className="h-4 w-4" />
    if (action.includes('ADMIN') || action.includes('LOGIN')) return <Shield className="h-4 w-4" />
    return <Info className="h-4 w-4" />
  }

  const getActionColor = (action: string) => {
    if (action.includes('CREATED')) return 'bg-green-100 text-green-800'
    if (action.includes('DELETED') || action.includes('SUSPENDED') || action.includes('CANCELLED')) return 'bg-red-100 text-red-800'
    if (action.includes('UPDATED') || action.includes('UPGRADED')) return 'bg-blue-100 text-blue-800'
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'bg-purple-100 text-purple-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getRoleColor = (role: string) => {
    const colorMap = {
      OWNER: 'bg-purple-100 text-purple-800',
      ADMIN: 'bg-red-100 text-red-800',
      MANAGER: 'bg-blue-100 text-blue-800',
      STAFF: 'bg-green-100 text-green-800'
    }
    return colorMap[role] || colorMap.STAFF
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatUserAgent = (userAgent: string) => {
    // Simple user agent parsing for display
    if (userAgent.includes('Macintosh')) return 'macOS Safari'
    if (userAgent.includes('Windows')) return 'Windows Chrome'
    if (userAgent.includes('Linux')) return 'Linux'
    return 'Unknown Browser'
  }

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'Actor', 'Role', 'Target', 'IP Address', 'Details'].join(','),
      ...logs.map(log => [
        log.timestamp,
        log.action,
        log.actorEmail,
        log.actorRole,
        log.targetId || '',
        log.ipAddress,
        JSON.stringify(log.details).replace(/,/g, ';')
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  return (
    <AdminLayout 
      title="System Logs" 
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'System Logs' }]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Logs</h1>
            <p className="mt-2 text-sm text-gray-700">
              View and monitor all system audit logs and user activities
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={exportLogs}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Logs
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 w-full"
              />
            </div>
            <div>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value)
                  setPage(1)
                }}
                className="pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 w-full"
              >
                <option value="all">All Actions</option>
                <option value="USER">User Actions</option>
                <option value="ORGANIZATION">Organization Actions</option>
                <option value="SUBSCRIPTION">Subscription Actions</option>
                <option value="ADMIN">Admin Actions</option>
              </select>
            </div>
            <div>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value)
                  setPage(1)
                }}
                className="pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 w-full"
              >
                <option value="all">All Roles</option>
                <option value="OWNER">Owner</option>
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="STAFF">Staff</option>
              </select>
            </div>
            <div>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value)
                  setPage(1)
                }}
                className="pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 w-full"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              {pagination && `${pagination.total} log entries`}
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-2 text-sm text-red-700">{error}</p>
                <button
                  onClick={fetchLogs}
                  className="mt-2 text-sm text-red-800 underline hover:text-red-900"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Logs table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No logs found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search ? 'No logs match your search criteria.' : 'No audit logs available for the selected time range.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {logs.map((log) => (
                <li key={log.id}>
                  <div className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start min-w-0 flex-1">
                        <button
                          onClick={() => toggleLogExpansion(log.id)}
                          className="flex-shrink-0 mr-3 mt-1 text-gray-400 hover:text-gray-600"
                        >
                          {expandedLogs.has(log.id) ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                        </button>
                        <div className="flex-shrink-0 mr-3 mt-1">
                          {getActionIcon(log.action)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                              {log.action.replace(/_/g, ' ')}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(log.actorRole)}`}>
                              {log.actorRole}
                            </span>
                          </div>
                          <div className="flex items-center mt-1 space-x-4">
                            <p className="text-sm text-gray-900">
                              <span className="font-medium">{log.actorEmail}</span>
                              {log.targetId && log.targetType && (
                                <span className="text-gray-500"> → {log.targetType}: {log.targetId}</span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center mt-1 space-x-4 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatTimestamp(log.timestamp)}</span>
                            </div>
                            <span>IP: {log.ipAddress}</span>
                            <span>{formatUserAgent(log.userAgent)}</span>
                          </div>
                          
                          {/* Expanded details */}
                          {expandedLogs.has(log.id) && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-md">
                              <h4 className="text-xs font-medium text-gray-900 mb-2">Details:</h4>
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-xs text-gray-500">
                                  <strong>Full User Agent:</strong> {log.userAgent}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedLog(log)
                            setShowDetailModal(true)
                          }}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedLog && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900">Audit Log Details</h3>
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedLog(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Action</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.action.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                    <p className="mt-1 text-sm text-gray-900">{formatTimestamp(selectedLog.timestamp)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Actor</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.actorEmail}</p>
                    <p className="text-xs text-gray-500">Role: {selectedLog.actorRole}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedLog.targetType && selectedLog.targetId 
                        ? `${selectedLog.targetType}: ${selectedLog.targetId}`
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">IP Address</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLog.ipAddress}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">User Agent</label>
                  <p className="mt-1 text-sm text-gray-900 break-all">{selectedLog.userAgent}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Action Details</label>
                  <pre className="bg-gray-50 p-3 rounded-md text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedLog(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Note about mock data */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <Info className="h-5 w-5 text-blue-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Demo Data</h3>
              <p className="mt-2 text-sm text-blue-700">
                This interface is displaying mock audit log data for demonstration. 
                In production, this would connect to the actual audit logging system 
                implemented in the AuditLogService.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}