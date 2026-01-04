'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Activity
} from 'lucide-react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { useRestaurantMenu } from '@/contexts/RestaurantMenuContext'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts'

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const { selectedRestaurant } = useRestaurantMenu()
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '12m'>('30d')

  // Fetch analytics data
  const { data: syncData, isLoading: syncLoading } = trpc.analytics.getSyncAnalytics.useQuery({
    restaurantId: selectedRestaurant?.id,
    dateRange,
  })

  const { data: menuData, isLoading: menuLoading } = trpc.analytics.getMenuAnalytics.useQuery({
    restaurantId: selectedRestaurant?.id,
  })

  const { data: subscriptionData, isLoading: subscriptionLoading } = trpc.analytics.getSubscriptionAnalytics.useQuery()

  const { data: platformData, isLoading: platformLoading } = trpc.analytics.getPlatformStats.useQuery()

  const isLoading = syncLoading || menuLoading || subscriptionLoading || platformLoading

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading analytics...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Please sign in to access this page.</div>
      </div>
    )
  }

  // Platform distribution data
  const platformDistribution = platformData
    ? Object.entries(platformData.platformCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: name === 'deliveroo' ? '#0EA5E9' : name === 'ubereats' ? '#10B981' : '#F59E0B',
      }))
    : []

  return (
    <DashboardLayout
      title="Analytics"
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Analytics' }
      ]}
    >
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="12m">Last 12 months</option>
              </select>
            </div>
            
          </div>
          
          <div className="flex space-x-2">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
              <Download className="mr-2 h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Activity className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Syncs
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {syncData?.totalSyncs || 0}
                      </div>
                      {syncData && syncData.inProgressSyncs > 0 && (
                        <div className="ml-2 flex items-baseline text-sm font-semibold text-blue-600">
                          <Clock className="h-4 w-4 mr-1" />
                          {syncData.inProgressSyncs} running
                        </div>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Success Rate
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {syncData?.successRate || 0}%
                      </div>
                      <div className="ml-2 flex items-baseline text-sm text-gray-500">
                        {syncData?.successfulSyncs || 0}/{syncData?.totalSyncs || 0}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Package className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Menu Items
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {menuData?.totalProducts || 0}
                      </div>
                      <div className="ml-2 flex items-baseline text-sm text-gray-500">
                        {menuData?.totalCategories || 0} categories
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-orange-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Integrations
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {platformData?.totalIntegrations || 0}
                      </div>
                      <div className="ml-2 flex items-baseline text-sm text-gray-500">
                        {Object.keys(platformData?.platformCounts || {}).length} platforms
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Sync Trend Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sync Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={syncData?.syncTrend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="successful"
                  stackId="1"
                  stroke="#10B981"
                  fill="#10B981"
                  name="Successful"
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  stackId="1"
                  stroke="#EF4444"
                  fill="#EF4444"
                  name="Failed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Platform Performance */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Object.entries(syncData?.platformStats || {}).map(([platform, stats]) => ({
                platform: platform.charAt(0).toUpperCase() + platform.slice(1),
                successful: stats.successful,
                failed: stats.failed,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="platform" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="successful" fill="#10B981" name="Successful" />
                <Bar dataKey="failed" fill="#EF4444" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Platform Distribution */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Distribution</h3>
            {platformDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={platformDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {platformDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-250 flex items-center justify-center text-gray-500">
                No platform data available
              </div>
            )}
          </div>

          {/* Recent Syncs */}
          <div className="lg:col-span-2 bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Sync Jobs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {syncData?.recentSyncs && syncData.recentSyncs.length > 0 ? (
                    syncData.recentSyncs.map((sync) => (
                      <tr key={sync.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 capitalize">
                            {sync.platform}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{sync.type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            sync.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : sync.status === 'FAILED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {sync.status === 'COMPLETED' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {sync.status === 'FAILED' && <XCircle className="h-3 w-3 mr-1" />}
                            {sync.status === 'IN_PROGRESS' && <Clock className="h-3 w-3 mr-1" />}
                            {sync.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(sync.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                        No sync jobs yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Insights Section */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription & Usage</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Restaurants Usage */}
            <div className="border-l-4 border-blue-400 pl-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Restaurants</h4>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  {subscriptionData?.usage.restaurants.current || 0}
                </span>
                <span className="text-sm text-gray-500">
                  of {subscriptionData?.usage.restaurants.limit || 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${subscriptionData?.usage.restaurants.percentage || 0}%` }}
                />
              </div>
            </div>

            {/* Menus Usage */}
            <div className="border-l-4 border-green-400 pl-4">
              <h4 className="text-sm font-medium text-green-800 mb-2">Menus</h4>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  {subscriptionData?.usage.menus.current || 0}
                </span>
                <span className="text-sm text-gray-500">
                  of {subscriptionData?.usage.menus.limit || 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${subscriptionData?.usage.menus.percentage || 0}%` }}
                />
              </div>
            </div>

            {/* Products Usage */}
            <div className="border-l-4 border-purple-400 pl-4">
              <h4 className="text-sm font-medium text-purple-800 mb-2">Products</h4>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  {subscriptionData?.usage.products.current || 0}
                </span>
                <span className="text-sm text-gray-500">
                  of {subscriptionData?.usage.products.limit || 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${subscriptionData?.usage.products.percentage || 0}%` }}
                />
              </div>
            </div>
          </div>

          {subscriptionData?.tier && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Current Plan: <span className="font-semibold text-gray-900">{subscriptionData.tier}</span>
                {subscriptionData.currentPeriodEnd && (
                  <span className="ml-4">
                    Renews: {new Date(subscriptionData.currentPeriodEnd).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}