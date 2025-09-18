'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Play, Settings } from 'lucide-react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { useRestaurantMenu } from '@/contexts/RestaurantMenuContext'

export default function SyncPage() {
  const { data: session, status } = useSession()
  const { selectedRestaurant } = useRestaurantMenu()
  const [isRunningSync, setIsRunningSync] = useState(false)

  // Real data queries using tRPC for price push workflow
  const { data: platformStatus = [], isLoading: platformsLoading } = trpc.sync.getPlatformStatus.useQuery(
    { restaurantId: selectedRestaurant?.id },
    { enabled: !!session }
  )

  const { data: pricePushHistory = [], isLoading: historyLoading } = trpc.sync.getPricePushHistory.useQuery(
    { restaurantId: selectedRestaurant?.id, limit: 20 },
    { enabled: !!session }
  )

  const { data: pricePushStats } = trpc.sync.getPricePushStats.useQuery(
    { restaurantId: selectedRestaurant?.id, days: 30 },
    { enabled: !!session }
  )

  const pushAllPricesMutation = trpc.sync.pushAllPrices.useMutation({
    onSuccess: () => {
      // Refetch data after bulk price push
      trpc.sync.getPlatformStatus.useQuery.invalidate()
      trpc.sync.getPricePushHistory.useQuery.invalidate()
      trpc.sync.getPricePushStats.useQuery.invalidate()
    },
    onError: (error) => {
      alert(`Failed to push prices: ${error.message}`)
    }
  })

  const handlePushAllPrices = async () => {
    if (!selectedRestaurant?.id) {
      alert('Please select a restaurant first')
      return
    }

    setIsRunningSync(true)
    try {
      await pushAllPricesMutation.mutateAsync({
        restaurantId: selectedRestaurant.id
      })
    } catch (error) {
      console.error('Price push failed:', error)
    } finally {
      setIsRunningSync(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return 'bg-green-100 text-green-800'
      case 'DISCONNECTED':
        return 'bg-gray-100 text-gray-800'
      case 'ERROR':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return <CheckCircle className="mr-1 h-3 w-3" />
      case 'ERROR':
        return <XCircle className="mr-1 h-3 w-3" />
      case 'DISCONNECTED':
      default:
        return <AlertCircle className="mr-1 h-3 w-3" />
    }
  }

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return 'Never'

    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    return `${Math.floor(diffInSeconds / 86400)} days ago`
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
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

  return (
    <DashboardLayout
      title="Price Sync Status"
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Price Sync' }
      ]}
    >
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-gray-600">
              Monitor price updates pushed to delivery platforms
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Prices are automatically pushed when updated. Use "Push All Prices" for initial setup or bulk updates.
            </p>
          </div>
          <div className="flex space-x-3">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Settings className="mr-2 h-4 w-4" />
              Platform Settings
            </button>
            <button
              onClick={handlePushAllPrices}
              disabled={isRunningSync || !selectedRestaurant}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              title={!selectedRestaurant ? 'Please select a restaurant first' : 'Push all current prices to connected platforms'}
            >
              {isRunningSync ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Pushing Prices...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Push All Prices
                </>
              )}
            </button>
          </div>
        </div>

        {/* Platform Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {platformsLoading ? (
            // Loading state
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-white overflow-hidden shadow rounded-lg animate-pulse">
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : platformStatus.length > 0 ? (
            // Real platform data
            platformStatus.map((platform) => (
              <div key={platform.id} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {platform.name}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(platform.status)}`}>
                          {getStatusIcon(platform.status)}
                          {platform.status.toLowerCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Last sync: {formatTimeAgo(platform.lastSync)}
                      </p>
                      {platform.restaurantName && (
                        <p className="text-xs text-gray-400 mt-1">
                          {platform.restaurantName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            // Empty state
            <div className="col-span-full bg-white overflow-hidden shadow rounded-lg">
              <div className="p-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Platform Connections</h3>
                <p className="text-gray-500 mb-4">
                  {selectedRestaurant
                    ? `No delivery platforms are connected to ${selectedRestaurant.name}.`
                    : 'No delivery platforms are connected. Select a restaurant to view its platform connections.'
                  }
                </p>
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Settings className="mr-2 h-4 w-4" />
                  Setup Integrations
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Price Push History */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Price Updates</h3>
                <p className="text-sm text-gray-500 mt-1">Individual price changes pushed to delivery platforms</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Platform
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price Change
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
                    {historyLoading ? (
                      // Loading rows
                      Array.from({ length: 3 }).map((_, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </td>
                        </tr>
                      ))
                    ) : pricePushHistory.length > 0 ? (
                      pricePushHistory.map((push) => (
                        <tr key={push.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {push.productName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{push.platform}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {push.oldPrice && push.newPrice ? (
                                <>
                                  <span className="text-gray-500">£{push.oldPrice}</span>
                                  <span className="mx-2">→</span>
                                  <span className="font-medium">£{push.newPrice}</span>
                                </>
                              ) : (
                                <span className="text-gray-500">Price update</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              push.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-800'
                                : push.status === 'FAILED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {push.status === 'COMPLETED' ? (
                                <CheckCircle className="mr-1 h-3 w-3" />
                              ) : push.status === 'FAILED' ? (
                                <XCircle className="mr-1 h-3 w-3" />
                              ) : (
                                <Clock className="mr-1 h-3 w-3" />
                              )}
                              {push.status.toLowerCase()}
                            </span>
                            {push.error && (
                              <div className="text-xs text-red-600 mt-1">
                                {typeof push.error === 'string' ? push.error : 'Error occurred'}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {push.completedAt?.toLocaleString() || push.createdAt.toLocaleString()}
                            </div>
                            {push.duration && (
                              <div className="text-xs text-gray-500">{push.duration}s</div>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      // Empty state
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center">
                          <Clock className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500 mb-1">No price updates yet</p>
                          <p className="text-xs text-gray-400">
                            {selectedRestaurant
                              ? `No price changes have been pushed for ${selectedRestaurant.name} yet.`
                              : 'Select a restaurant to view its price update history.'
                            }
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sync Settings */}
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Auto Sync Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Auto Sync</div>
                    <div className="text-xs text-gray-500">Automatically sync prices</div>
                  </div>
                  <button
                    type="button"
                    className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-green-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    role="switch"
                    aria-checked="true"
                  >
                    <span className="translate-x-5 pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out">
                      <CheckCircle className="absolute inset-0 h-full w-full text-green-600 opacity-100 transition-opacity duration-200 ease-in" />
                    </span>
                  </button>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Sync Frequency
                  </label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                    <option>Every 15 minutes</option>
                    <option>Every 30 minutes</option>
                    <option>Every hour</option>
                    <option>Every 4 hours</option>
                    <option>Daily</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Sync Window
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      defaultValue="08:00"
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                    <input
                      type="time"
                      defaultValue="22:00"
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Only sync during these hours
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Price Push Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Today&apos;s pushes</span>
                  <span className="text-sm font-medium text-gray-900">
                    {pricePushStats?.todayPushes || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Success rate</span>
                  <span className={`text-sm font-medium ${
                    pricePushStats && pricePushStats.successRate > 0
                      ? pricePushStats.successRate >= 95
                        ? 'text-green-600'
                        : pricePushStats.successRate >= 80
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      : 'text-gray-600'
                  }`}>
                    {pricePushStats?.successRate ? `${pricePushStats.successRate}%` : 'No data'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Products updated</span>
                  <span className="text-sm font-medium text-gray-900">
                    {pricePushStats?.uniqueProductsUpdated || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total pushes</span>
                  <span className="text-sm font-medium text-gray-900">
                    {pricePushStats?.totalPushes || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Last failure</span>
                  <span className="text-sm font-medium text-red-600">
                    {pricePushStats?.lastFailure
                      ? formatTimeAgo(pricePushStats.lastFailure.createdAt)
                      : 'None recorded'
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">How It Works</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-xs font-medium text-blue-600">1</span>
                  </div>
                  <p>Update a product price in Tightship</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-xs font-medium text-blue-600">2</span>
                  </div>
                  <p>Price automatically pushes to connected platforms</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-xs font-medium text-blue-600">3</span>
                  </div>
                  <p>View push status and results here</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Use "Push All Prices" for bulk updates or initial platform setup.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}