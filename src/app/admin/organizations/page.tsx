'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/layout/admin-layout'
import { 
  Building2, 
  Search, 
  Plus,
  Edit,
  Pause,
  Play,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Filter
} from 'lucide-react'

interface Organization {
  id: string
  name: string
  slug: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    users: number
    restaurants: number
  }
  subscription?: {
    id: string
    status: string
    plan: {
      name: string
      type: string
    }
  }
  owner?: {
    id: string
    name: string
    email: string
  }
}

interface OrganizationsResponse {
  organizations: Organization[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<OrganizationsResponse['pagination'] | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchOrganizations()
  }, [page, search, statusFilter])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        status: statusFilter
      })

      const response = await fetch(`/api/admin/organizations?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch organizations')
      }

      const data: OrganizationsResponse = await response.json()
      setOrganizations(data.organizations)
      setPagination(data.pagination)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleOrgAction = async (orgId: string, action: string, data?: any) => {
    try {
      setActionLoading(orgId)
      
      const response = await fetch('/api/admin/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          action,
          ...data
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Action failed')
      }

      // Refresh the list
      fetchOrganizations()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    )
  }

  const getSubscriptionBadge = (subscription?: Organization['subscription']) => {
    if (!subscription) {
      return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">No Plan</span>
    }

    const colorMap = {
      ACTIVE: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      EXPIRED: 'bg-gray-100 text-gray-800',
      PAST_DUE: 'bg-yellow-100 text-yellow-800'
    }

    return (
      <span className={`px-2 py-1 text-xs rounded ${colorMap[subscription.status] || colorMap.EXPIRED}`}>
        {subscription.plan.name} ({subscription.status})
      </span>
    )
  }

  return (
    <AdminLayout 
      title="Organizations" 
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Organizations' }]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage all organizations and their subscriptions
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Organization
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="relative">
              <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 w-full"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              {pagination && `${pagination.total} total organizations`}
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
                  onClick={fetchOrganizations}
                  className="mt-2 text-sm text-red-800 underline hover:text-red-900"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Organizations table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : organizations.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No organizations</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search ? 'No organizations match your search.' : 'Get started by creating a new organization.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {organizations.map((org) => (
                <li key={org.id}>
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          {getStatusIcon(org.isActive)}
                        </div>
                        <div className="ml-4 min-w-0 flex-1">
                          <div className="flex items-center space-x-3">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {org.name}
                            </p>
                            {getSubscriptionBadge(org.subscription)}
                          </div>
                          <div className="flex items-center mt-1 space-x-4">
                            <p className="text-xs text-gray-500">
                              Slug: {org.slug}
                            </p>
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Users className="h-3 w-3" />
                              <span>{org._count.users} users</span>
                            </div>
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Building2 className="h-3 w-3" />
                              <span>{org._count.restaurants} restaurants</span>
                            </div>
                          </div>
                          {org.owner && (
                            <p className="text-xs text-gray-500 mt-1">
                              Owner: {org.owner.name || org.owner.email}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Created: {new Date(org.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {org.isActive ? (
                          <button
                            onClick={() => handleOrgAction(org.id, 'suspend', { reason: 'Admin action' })}
                            disabled={actionLoading === org.id}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                          >
                            <Pause className="h-3 w-3 mr-1" />
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOrgAction(org.id, 'reactivate', { reason: 'Admin action' })}
                            disabled={actionLoading === org.id}
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

        {/* Create Organization Modal would go here */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create Organization</h3>
              <p className="text-sm text-gray-500 mb-4">
                This feature will be implemented with a full form to create organizations, assign owners, and set up initial subscriptions.
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