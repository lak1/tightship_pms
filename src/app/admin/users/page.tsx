'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/layout/admin-layout'
import { 
  Users, 
  Search, 
  Plus,
  Edit,
  Pause,
  Play,
  Shield,
  Building2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Filter,
  Key,
  Trash2
} from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF'
  isActive: boolean
  emailVerified: Date | null
  createdAt: string
  updatedAt: string
  organization?: {
    id: string
    name: string
    slug: string
  }
  organizationId: string | null
}

interface UsersResponse {
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<UsersResponse['pagination'] | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [orgFilter, setOrgFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [page, search, roleFilter, statusFilter, orgFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        role: roleFilter,
        status: statusFilter,
        organizationId: orgFilter
      })

      const response = await fetch(`/api/admin/users?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data: UsersResponse = await response.json()
      setUsers(data.users)
      setPagination(data.pagination)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleUserAction = async (userId: string, action: string, data?: any) => {
    try {
      setActionLoading(userId)
      
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action,
          ...data
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Action failed')
      }

      // Refresh the list
      fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      setActionLoading(userId)
      
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Delete failed')
      }

      // Refresh the list
      fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
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

  const getRoleColor = (role: string) => {
    const colorMap = {
      OWNER: 'bg-purple-100 text-purple-800',
      ADMIN: 'bg-red-100 text-red-800',
      MANAGER: 'bg-blue-100 text-blue-800',
      STAFF: 'bg-green-100 text-green-800'
    }
    return colorMap[role] || colorMap.STAFF
  }

  const getRoleIcon = (role: string) => {
    if (role === 'OWNER' || role === 'ADMIN') {
      return <Shield className="h-3 w-3 mr-1" />
    }
    return <Users className="h-3 w-3 mr-1" />
  }

  return (
    <AdminLayout 
      title="Users" 
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Users' }]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage all users across organizations
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              New User
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
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
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 w-full"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              {pagination && `${pagination.total} total users`}
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
                  onClick={fetchUsers}
                  className="mt-2 text-sm text-red-800 underline hover:text-red-900"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search ? 'No users match your search.' : 'Get started by creating a new user.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {users.map((user) => (
                <li key={user.id}>
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          {getStatusIcon(user.isActive)}
                        </div>
                        <div className="ml-4 min-w-0 flex-1">
                          <div className="flex items-center space-x-3">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {user.name || user.email}
                            </p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                              {getRoleIcon(user.role)}
                              {user.role}
                            </span>
                          </div>
                          <div className="flex items-center mt-1 space-x-4">
                            <p className="text-xs text-gray-500">
                              {user.email}
                            </p>
                            {user.emailVerified && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </span>
                            )}
                          </div>
                          {user.organization && (
                            <div className="flex items-center mt-1 space-x-1 text-xs text-gray-500">
                              <Building2 className="h-3 w-3" />
                              <span>{user.organization.name}</span>
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Created: {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setShowEditModal(true)
                          }}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </button>
                        
                        <button
                          onClick={() => {
                            const newPassword = prompt('Enter new password for user:')
                            if (newPassword) {
                              handleUserAction(user.id, 'reset_password', { newPassword })
                            }
                          }}
                          disabled={actionLoading === user.id}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        >
                          <Key className="h-3 w-3 mr-1" />
                          Reset PW
                        </button>

                        {user.isActive ? (
                          <button
                            onClick={() => handleUserAction(user.id, 'deactivate', { reason: 'Admin action' })}
                            disabled={actionLoading === user.id}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                          >
                            <Pause className="h-3 w-3 mr-1" />
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserAction(user.id, 'activate', { reason: 'Admin action' })}
                            disabled={actionLoading === user.id}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Activate
                          </button>
                        )}

                        {user.role !== 'OWNER' && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={actionLoading === user.id}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
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

        {/* Create/Edit User Modal placeholders */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create User</h3>
              <p className="text-sm text-gray-500 mb-4">
                This feature will be implemented with a full form to create users with roles and organization assignments.
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

        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit User: {selectedUser.name || selectedUser.email}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                This feature will be implemented with a full form to edit user details, roles, and organization assignments.
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedUser(null)
                  }}
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