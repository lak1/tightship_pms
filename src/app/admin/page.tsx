'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/layout/admin-layout'
import { 
  Users, 
  Building2, 
  CreditCard, 
  TrendingUp,
  Activity,
  DollarSign,
  Calendar,
  AlertTriangle
} from 'lucide-react'

interface AnalyticsData {
  overview: {
    totalOrganizations: number
    totalUsers: number  
    totalRestaurants: number
    totalProducts: number
    activeOrganizations: number
    activeUsers: number
    activeSubscriptions: number
    newOrganizations: number
    newUsers: number
    growthRate: string
    totalUsageEvents: number
  }
  subscriptions: {
    byStatus: Array<{ status: string; _count: number }>
    byPlan: Record<string, number>
    total: number
    conversionRate: string
  }
  users: {
    byRole: Array<{ role: string; _count: number }>
    total: number
    active: number
    activeRate: string
  }
  growth: {
    monthly: Record<string, number>
    period: string
    rate: string
  }
  system: {
    uptime: string
    responseTime: string
    errorRate: string
    lastUpdated: string
  }
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/analytics?period=${period}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const data = await response.json()
      setAnalytics(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Admin Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout title="Admin Dashboard">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
              <button
                onClick={fetchAnalytics}
                className="mt-2 text-sm text-red-800 underline hover:text-red-900"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!analytics) {
    return (
      <AdminLayout title="Admin Dashboard">
        <div className="text-center py-8">
          <p className="text-gray-500">No data available</p>
        </div>
      </AdminLayout>
    )
  }

  const stats = [
    {
      name: 'Total Organizations',
      value: analytics.overview.totalOrganizations.toLocaleString(),
      change: `+${analytics.overview.newOrganizations} this ${period}`,
      changeType: 'positive',
      icon: Building2,
    },
    {
      name: 'Active Users',
      value: analytics.overview.activeUsers.toLocaleString(),
      change: analytics.users.activeRate,
      changeType: 'positive',
      icon: Users,
    },
    {
      name: 'Active Subscriptions',
      value: analytics.overview.activeSubscriptions.toLocaleString(),
      change: analytics.subscriptions.conversionRate,
      changeType: 'positive',
      icon: CreditCard,
    },
    {
      name: 'Growth Rate',
      value: analytics.overview.growthRate,
      change: `vs previous ${period}`,
      changeType: analytics.overview.growthRate.startsWith('-') ? 'negative' : 'positive',
      icon: TrendingUp,
    },
  ]

  return (
    <AdminLayout title="Admin Dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Period selector */}
        <div className="mb-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">System Overview</h2>
              <p className="mt-1 text-sm text-gray-500">
                Key metrics and system health for the past {period}
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Icon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          {stat.name}
                        </dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">
                            {stat.value}
                          </div>
                          <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                            stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {stat.change}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Subscription Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Subscription Status
            </h3>
            <div className="space-y-3">
              {analytics.subscriptions.byStatus.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      item.status === 'ACTIVE' ? 'bg-green-500' :
                      item.status === 'CANCELLED' ? 'bg-red-500' :
                      item.status === 'EXPIRED' ? 'bg-gray-500' :
                      'bg-yellow-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {item.status.toLowerCase()}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {item._count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* User Roles */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              User Roles
            </h3>
            <div className="space-y-3">
              {analytics.users.byRole.map((item) => (
                <div key={item.role} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      item.role === 'OWNER' ? 'bg-purple-500' :
                      item.role === 'ADMIN' ? 'bg-red-500' :
                      item.role === 'MANAGER' ? 'bg-blue-500' :
                      'bg-green-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-900">
                      {item.role}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {item._count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            System Health
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-semibold text-green-600">
                {analytics.system.uptime}
              </div>
              <div className="text-sm text-gray-500">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-blue-600">
                {analytics.system.responseTime}
              </div>
              <div className="text-sm text-gray-500">Avg Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-orange-600">
                {analytics.system.errorRate}
              </div>
              <div className="text-sm text-gray-500">Error Rate</div>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-400 text-center">
            Last updated: {new Date(analytics.system.lastUpdated).toLocaleString()}
          </div>
        </div>

        {/* Recent Activity placeholder */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>Audit logs and recent activity would appear here</p>
            <p className="text-sm">This will be populated when audit logging is fully implemented</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}