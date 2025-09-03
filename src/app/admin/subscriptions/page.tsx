'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/layout/admin-layout'
import { 
  CreditCard, 
  Search, 
  Plus,
  Edit,
  Pause,
  Play,
  Building2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Filter,
  DollarSign,
  Calendar,
  TrendingUp,
  Clock
} from 'lucide-react'

interface Subscription {
  id: string
  status: 'ACTIVE' | 'CANCELLED' | 'INCOMPLETE' | 'PAST_DUE' | 'TRIALING'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelledAt?: string
  createdAt: string
  organizations: {
    id: string
    name: string
    slug: string
  }
  subscriptionPlan: {
    id: string
    name: string
    tier: string
    priceMonthly: number
    features: any
  }
}

interface SubscriptionsResponse {
  subscriptions: Subscription[]
  summary: {
    active: number
    cancelled: number
    incomplete: number
    pastDue: number
    total: number
    mrr: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [summary, setSummary] = useState<SubscriptionsResponse['summary'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<SubscriptionsResponse['pagination'] | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planTypeFilter, setPlanTypeFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchSubscriptions()
  }, [page, search, statusFilter, planTypeFilter])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        status: statusFilter,
        planType: planTypeFilter
      })

      const response = await fetch(`/api/admin/subscriptions?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions')
      }

      const data: SubscriptionsResponse = await response.json()
      setSubscriptions(data.subscriptions)
      setSummary(data.summary)
      setPagination(data.pagination)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSubscriptionAction = async (subscriptionId: string, action: string, data?: any) => {
    try {
      setActionLoading(subscriptionId)
      
      const response = await fetch('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId,
          action,
          ...data
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Action failed')
      }

      // Refresh the list
      fetchSubscriptions()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'CANCELLED':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'INCOMPLETE':
        return <Clock className="h-5 w-5 text-gray-500" />
      case 'TRIALING':
        return <TrendingUp className="h-5 w-5 text-blue-500" />
      case 'PAST_DUE':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <XCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    const colorMap = {
      ACTIVE: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      INCOMPLETE: 'bg-gray-100 text-gray-800',
      TRIALING: 'bg-blue-100 text-blue-800',
      PAST_DUE: 'bg-yellow-100 text-yellow-800'
    }
    return colorMap[status] || colorMap.INCOMPLETE
  }

  const getPlanTypeColor = (type: string) => {
    const colorMap = {
      FREE: 'bg-gray-100 text-gray-800',
      PAID: 'bg-blue-100 text-blue-800',
      ENTERPRISE: 'bg-purple-100 text-purple-800'
    }
    return colorMap[type] || colorMap.FREE
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isExpiringSoon = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const daysUntilExpiry = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0
  }

  return (
    <AdminLayout 
      title="Subscriptions" 
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Subscriptions' }]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage all subscriptions and billing
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Subscription
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                      <dd className="text-lg font-medium text-gray-900">{summary.active}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <XCircle className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Cancelled</dt>
                      <dd className="text-lg font-medium text-gray-900">{summary.cancelled}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Incomplete</dt>
                      <dd className="text-lg font-medium text-gray-900">{summary.incomplete}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Past Due</dt>
                      <dd className="text-lg font-medium text-gray-900">{summary.pastDue}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CreditCard className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total</dt>
                      <dd className="text-lg font-medium text-gray-900">{summary.total}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">MRR</dt>
                      <dd className="text-lg font-medium text-gray-900">{formatCurrency(summary.mrr)}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search organizations..."
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
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 w-full"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="INCOMPLETE">Incomplete</option>
                <option value="TRIALING">Trialing</option>
                <option value="PAST_DUE">Past Due</option>
              </select>
            </div>
            <div>
              <select
                value={planTypeFilter}
                onChange={(e) => {
                  setPlanTypeFilter(e.target.value)
                  setPage(1)
                }}
                className="pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 w-full"
              >
                <option value="all">All Plan Types</option>
                <option value="FREE">Free</option>
                <option value="PAID">Paid</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              {pagination && `${pagination.total} total subscriptions`}
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
                  onClick={fetchSubscriptions}
                  className="mt-2 text-sm text-red-800 underline hover:text-red-900"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subscriptions table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No subscriptions</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search ? 'No subscriptions match your search.' : 'No subscriptions found.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {subscriptions.map((subscription) => (
                <li key={subscription.id}>
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          {getStatusIcon(subscription.status)}
                        </div>
                        <div className="ml-4 min-w-0 flex-1">
                          <div className="flex items-center space-x-3">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {subscription.organizations?.name}
                            </p>
                            <span className={`px-2 py-1 text-xs rounded ${getStatusColor(subscription.status)}`}>
                              {subscription.status}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded ${getPlanTypeColor(subscription.subscriptionPlan?.tier)}`}>
                              {subscription.subscriptionPlan?.name}
                            </span>
                          </div>
                          <div className="flex items-center mt-1 space-x-4">
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <DollarSign className="h-3 w-3" />
                              <span>{formatCurrency(subscription.subscriptionPlan?.priceMonthly || 0)}/month</span>
                            </div>
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                              </span>
                            </div>
                            {isExpiringSoon(subscription.currentPeriodEnd) && subscription.status === 'ACTIVE' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Expires Soon
                              </span>
                            )}
                          </div>
                          <div className="flex items-center mt-1 space-x-1 text-xs text-gray-500">
                            <Building2 className="h-3 w-3" />
                            <span>Org: {subscription.organizations?.slug}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Created: {formatDate(subscription.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {subscription.status === 'ACTIVE' && (
                          <>
                            <button
                              onClick={() => {
                                const days = prompt('Extend subscription by how many days?')
                                if (days && !isNaN(parseInt(days))) {
                                  handleSubscriptionAction(subscription.id, 'extend', { extensionDays: parseInt(days) })
                                }
                              }}
                              disabled={actionLoading === subscription.id}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                              <Calendar className="h-3 w-3 mr-1" />
                              Extend
                            </button>
                            <button
                              onClick={() => handleSubscriptionAction(subscription.id, 'cancel', { reason: 'Admin cancellation' })}
                              disabled={actionLoading === subscription.id}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                              <Pause className="h-3 w-3 mr-1" />
                              Cancel
                            </button>
                          </>
                        )}
                        
                        {subscription.status === 'CANCELLED' && (
                          <button
                            onClick={() => handleSubscriptionAction(subscription.id, 'reactivate')}
                            disabled={actionLoading === subscription.id}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Reactivate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6 rounded-lg shadow">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                disabled={page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{((page - 1) * pagination.limit) + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                    disabled={page === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Create Subscription Modal placeholder */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create Subscription</h3>
              <p className="text-sm text-gray-500 mb-4">
                This feature will be implemented with a form to create subscriptions for organizations.
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}