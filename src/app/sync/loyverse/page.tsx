'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Download, Upload, Database, Settings } from 'lucide-react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { useRestaurantMenu } from '@/contexts/RestaurantMenuContext'

export default function LoyverseSyncPage() {
  const { data: session, status } = useSession()
  const { selectedRestaurant, selectedMenu } = useRestaurantMenu()
  const [isSyncing, setIsSyncing] = useState(false)
  const utils = trpc.useUtils()

  // Get sync history
  const { data: syncHistory = [], isLoading: historyLoading } = trpc.loyverse.getSyncHistory.useQuery(
    { restaurantId: selectedRestaurant?.id || '', limit: 20 },
    { enabled: !!selectedRestaurant }
  )

  // Import categories mutation
  const importCategoriesMutation = trpc.loyverse.importCategories.useMutation({
    onSuccess: () => {
      utils.loyverse.getSyncHistory.invalidate()
      alert('Categories imported successfully!')
    },
    onError: (error) => {
      alert(`Failed to import categories: ${error.message}`)
    }
  })

  // Import products mutation
  const importProductsMutation = trpc.loyverse.importProducts.useMutation({
    onSuccess: (data) => {
      utils.loyverse.getSyncHistory.invalidate()
      alert(`Successfully imported ${data.productsCreated} new products and updated ${data.productsUpdated} existing products!`)
    },
    onError: (error) => {
      alert(`Failed to import products: ${error.message}`)
    }
  })

  // Sync prices mutation
  const syncPricesMutation = trpc.loyverse.syncPricesFromLoyverse.useMutation({
    onSuccess: (data) => {
      utils.loyverse.getSyncHistory.invalidate()
      alert(`Successfully updated ${data.pricesUpdated} prices from Loyverse!`)
    },
    onError: (error) => {
      alert(`Failed to sync prices: ${error.message}`)
    }
  })

  // Full sync mutation
  const fullSyncMutation = trpc.loyverse.triggerFullSync.useMutation({
    onSuccess: () => {
      utils.loyverse.getSyncHistory.invalidate()
      alert('Full sync completed successfully!')
    },
    onError: (error) => {
      alert(`Full sync failed: ${error.message}`)
    }
  })

  const handleImportCategories = async () => {
    if (!selectedRestaurant || !selectedMenu) {
      alert('Please select a restaurant and menu first')
      return
    }

    setIsSyncing(true)
    try {
      await importCategoriesMutation.mutateAsync({
        restaurantId: selectedRestaurant.id,
        menuId: selectedMenu.id,
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleImportProducts = async () => {
    if (!selectedRestaurant || !selectedMenu) {
      alert('Please select a restaurant and menu first')
      return
    }

    setIsSyncing(true)
    try {
      await importProductsMutation.mutateAsync({
        restaurantId: selectedRestaurant.id,
        menuId: selectedMenu.id,
        importImages: true,
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSyncPrices = async () => {
    if (!selectedRestaurant || !selectedMenu) {
      alert('Please select a restaurant and menu first')
      return
    }

    setIsSyncing(true)
    try {
      await syncPricesMutation.mutateAsync({
        restaurantId: selectedRestaurant.id,
        menuId: selectedMenu.id,
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleFullSync = async () => {
    if (!selectedRestaurant || !selectedMenu) {
      alert('Please select a restaurant and menu first')
      return
    }

    if (!confirm('This will import all categories, products, and prices from Loyverse. Continue?')) {
      return
    }

    setIsSyncing(true)
    try {
      await fullSyncMutation.mutateAsync({
        restaurantId: selectedRestaurant.id,
        menuId: selectedMenu.id,
        importImages: true,
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'PENDING':
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="mr-1 h-3 w-3" />
      case 'IN_PROGRESS':
        return <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
      case 'FAILED':
        return <XCircle className="mr-1 h-3 w-3" />
      case 'PENDING':
      default:
        return <Clock className="mr-1 h-3 w-3" />
    }
  }

  const getSyncTypeLabel = (type: string) => {
    switch (type) {
      case 'FULL':
        return 'Full Sync'
      case 'INCREMENTAL':
        return 'Incremental Sync'
      case 'PRICE_ONLY':
        return 'Price Sync'
      default:
        return type
    }
  }

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'PULL':
        return <Download className="h-4 w-4" />
      case 'PUSH':
        return <Upload className="h-4 w-4" />
      case 'BIDIRECTIONAL':
        return <RefreshCw className="h-4 w-4" />
      default:
        return <Database className="h-4 w-4" />
    }
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
      title="Loyverse Data Sync"
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Sync', href: '/sync' },
        { label: 'Loyverse' }
      ]}
    >
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <p className="text-gray-600">
            Import products, categories, and prices from your Loyverse POS system
          </p>
          {selectedRestaurant && selectedMenu && (
            <p className="text-sm text-gray-500 mt-1">
              Syncing to: {selectedRestaurant.name} - {selectedMenu.name}
            </p>
          )}
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Import Categories */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Database className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Categories
                    </dt>
                    <dd className="text-xs text-gray-400 mt-1">
                      Import menu categories
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleImportCategories}
                  disabled={isSyncing || !selectedRestaurant || !selectedMenu}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Import
                </button>
              </div>
            </div>
          </div>

          {/* Import Products */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Database className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Products
                    </dt>
                    <dd className="text-xs text-gray-400 mt-1">
                      Import menu items
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleImportProducts}
                  disabled={isSyncing || !selectedRestaurant || !selectedMenu}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Import
                </button>
              </div>
            </div>
          </div>

          {/* Sync Prices */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <RefreshCw className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Prices
                    </dt>
                    <dd className="text-xs text-gray-400 mt-1">
                      Sync latest prices
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleSyncPrices}
                  disabled={isSyncing || !selectedRestaurant || !selectedMenu}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync
                </button>
              </div>
            </div>
          </div>

          {/* Full Sync */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Database className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Full Sync
                    </dt>
                    <dd className="text-xs text-gray-400 mt-1">
                      Import everything
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleFullSync}
                  disabled={isSyncing || !selectedRestaurant || !selectedMenu}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                >
                  <Database className="mr-2 h-4 w-4" />
                  {isSyncing ? 'Syncing...' : 'Sync All'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sync History */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Sync History</h3>
            <p className="text-sm text-gray-500 mt-1">Recent data synchronization jobs</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Direction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historyLoading ? (
                  // Loading rows
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      {Array.from({ length: 6 }).map((_, colIndex) => (
                        <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : syncHistory.length > 0 ? (
                  syncHistory.map((job) => (
                    <tr key={job.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {getSyncTypeLabel(job.type)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          {getDirectionIcon(job.direction)}
                          <span className="ml-2">{job.direction}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                          {getStatusIcon(job.status)}
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {job.progress && typeof job.progress === 'object' ? (
                            <div className="text-xs">
                              {(job.progress as any).step && (
                                <div className="text-gray-600 capitalize">
                                  {(job.progress as any).step.replace(/_/g, ' ')}
                                </div>
                              )}
                              {(job.progress as any).productsCreated !== undefined && (
                                <div className="text-gray-500">
                                  {(job.progress as any).productsCreated} created, {(job.progress as any).productsUpdated || 0} updated
                                </div>
                              )}
                              {(job.progress as any).categoriesCreated !== undefined && (
                                <div className="text-gray-500">
                                  {(job.progress as any).categoriesCreated} categories
                                </div>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {job.duration ? `${job.duration}s` : job.status === 'IN_PROGRESS' ? 'Running...' : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {job.createdAt ? new Date(job.createdAt).toLocaleString() : '-'}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  // Empty state
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <Database className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 mb-1">No sync history yet</p>
                      <p className="text-xs text-gray-400">
                        {selectedRestaurant
                          ? 'Click the buttons above to start importing data from Loyverse'
                          : 'Select a restaurant and menu to view sync history'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">How to sync with Loyverse</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Make sure your Loyverse account is connected in Settings</li>
                  <li>Select a restaurant and menu from the dropdown above</li>
                  <li>Click "Import Categories" first to set up your menu structure</li>
                  <li>Then click "Import Products" to bring in all your menu items</li>
                  <li>Use "Sync Prices" to update prices after making changes in Loyverse</li>
                  <li>Use "Full Sync" for a complete refresh of all data</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
