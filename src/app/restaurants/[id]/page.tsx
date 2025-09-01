'use client'

import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'
import { Settings, Plus, BookOpen, BarChart, Users, Package, Globe, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { useState } from 'react'

export default function RestaurantDetailPage() {
  const params = useParams()
  const restaurantId = params.id as string
  const { data: session, status } = useSession()
  const { data: restaurant, isLoading } = trpc.restaurant.getById.useQuery(
    { id: restaurantId },
    { enabled: !!session && !!restaurantId }
  )

  if (status === 'loading' || isLoading) {
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

  if (!restaurant) {
    return (
      <DashboardLayout
        title="Restaurant Not Found"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Restaurants', href: '/restaurants' },
          { label: 'Not Found' }
        ]}
      >
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Restaurant Not Found</h2>
            <p className="text-gray-600 mb-4">The restaurant you&apos;re looking for doesn&apos;t exist.</p>
            <Link
              href="/restaurants"
              className="text-blue-600 hover:text-blue-700"
            >
              Return to Restaurants
            </Link>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const totalProducts = restaurant.menus.reduce(
    (total, menu) => total + (menu._count?.products || 0), 
    0
  )

  return (
    <DashboardLayout
      title={restaurant.name}
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Restaurants', href: '/restaurants' },
        { label: restaurant.name }
      ]}
    >
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Primary Actions - Prominent placement */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href={`/products?restaurant=${restaurantId}`}
              className="flex flex-col items-center justify-center p-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors group"
            >
              <Package className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
              <span className="font-medium">View Products</span>
              <span className="text-sm text-blue-100 mt-1">{totalProducts} items</span>
            </Link>
            
            <Link
              href={`/restaurants/${restaurantId}/menus`}
              className="flex flex-col items-center justify-center p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <BookOpen className="h-8 w-8 mb-2 text-gray-600 group-hover:text-blue-600 transition-colors" />
              <span className="font-medium text-gray-900">Manage Menus</span>
              <span className="text-sm text-gray-500 mt-1">{restaurant.menus.length} menus</span>
            </Link>
            
            <Link
              href="/products/new"
              className="flex flex-col items-center justify-center p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
            >
              <Plus className="h-8 w-8 mb-2 text-gray-600 group-hover:text-green-600 transition-colors" />
              <span className="font-medium text-gray-900">Add Product</span>
              <span className="text-sm text-gray-500 mt-1">Create new item</span>
            </Link>
            
            <Link
              href={`/restaurants/${restaurantId}/settings`}
              className="flex flex-col items-center justify-center p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all group"
            >
              <Settings className="h-8 w-8 mb-2 text-gray-600 group-hover:text-gray-700 transition-colors" />
              <span className="font-medium text-gray-900">Settings</span>
              <span className="text-sm text-gray-500 mt-1">Configure restaurant</span>
            </Link>
          </div>
        </div>

        {/* Google Business Profile Integration */}
        <GoogleBusinessProfileSection restaurantId={restaurantId} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Restaurant Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Restaurant Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{restaurant.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Timezone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{restaurant.timezone}</dd>
                </div>
                {restaurant.address && (
                  <div className="md:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {(() => {
                        try {
                          const address = typeof restaurant.address === 'string' 
                            ? JSON.parse(restaurant.address) 
                            : restaurant.address
                          const parts = [address.street, address.city, address.state, address.postalCode, address.country].filter(Boolean)
                          return parts.length > 0 ? parts.join(', ') : 'Not specified'
                        } catch {
                          return 'Not specified'
                        }
                      })()}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(restaurant.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              </div>
            </div>

            {/* Menus */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Menus</h2>
                <Link
                  href={`/restaurants/${restaurantId}/menus`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Manage all menus
                </Link>
              </div>
              
              {restaurant.menus.length > 0 ? (
                <div className="space-y-4">
                  {restaurant.menus.map((menu) => (
                    <div key={menu.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-900">{menu.name}</h3>
                        <Link
                          href={`/restaurants/${restaurantId}/menus/${menu.id}`}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </Link>
                      </div>
                      {menu.description && (
                        <p className="text-sm text-gray-600 mb-2">{menu.description}</p>
                      )}
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{menu._count?.products || 0} products</span>
                        <span>{menu.categories.length} categories</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500">No menus yet</p>
                  <Link
                    href={`/restaurants/${restaurantId}/menus`}
                    className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block"
                  >
                    Create your first menu
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Integrations */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Platform Integrations</h2>
              
              {restaurant.integrations.length > 0 ? (
                <div className="space-y-3">
                  {restaurant.integrations.map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {integration.platform.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Last sync: {integration.syncJobs[0] 
                            ? new Date(integration.syncJobs[0].createdAt).toLocaleDateString()
                            : 'Never'
                          }
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        integration.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {integration.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 mb-3">No integrations configured</p>
                  <button className="text-sm text-blue-600 hover:text-blue-700">
                    Set up integrations
                  </button>
                </div>
              )}
            </div>

            {/* Additional Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Additional Actions</h2>
              <div className="space-y-3">
                <Link
                  href="/sync"
                  className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <BarChart className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Sync Prices</div>
                      <div className="text-xs text-gray-500">Update platform prices</div>
                    </div>
                  </div>
                </Link>
                <Link
                  href={`/reports?restaurant=${restaurantId}`}
                  className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <BarChart className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">View Reports</div>
                      <div className="text-xs text-gray-500">Analytics & insights</div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

// Google Business Profile Integration Component
function GoogleBusinessProfileSection({ restaurantId }: { restaurantId: string }) {
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Get Google integration status
  const { 
    data: integration, 
    isLoading: integrationLoading,
    refetch: refetchIntegration 
  } = trpc.google.getIntegration.useQuery({ restaurantId })
  
  // Sync menu mutation
  const syncMenu = trpc.google.syncMenu.useMutation({
    onSuccess: () => {
      setIsSyncing(false)
      refetchIntegration()
    },
    onError: () => {
      setIsSyncing(false)
    }
  })
  
  // Disconnect mutation  
  const disconnect = trpc.google.disconnect.useMutation({
    onSuccess: () => {
      refetchIntegration()
    }
  })
  
  const handleSync = () => {
    setIsSyncing(true)
    syncMenu.mutate({ restaurantId })
  }
  
  // Use mutation for getting auth URL
  const getAuthUrl = trpc.google.getAuthUrl.useQuery(
    { restaurantId },
    { 
      enabled: false,
      retry: false 
    }
  )

  const handleConnect = async () => {
    try {
      // Refetch to get the auth URL
      const result = await getAuthUrl.refetch()
      if (result.data?.authUrl) {
        window.location.href = result.data.authUrl
      } else {
        console.error('No auth URL returned')
        alert('Failed to initiate Google connection. Please try again.')
      }
    } catch (error) {
      console.error('Failed to get Google auth URL:', error)
      alert('Failed to initiate Google connection. Please try again.')
    }
  }
  
  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect Google Business Profile? This will stop automatic menu syncing.')) {
      disconnect.mutate({ restaurantId })
    }
  }

  if (integrationLoading) {
    return (
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3">
          <Globe className="h-6 w-6 text-gray-400" />
          <h2 className="text-lg font-medium text-gray-900">Google Business Profile</h2>
        </div>
        <div className="mt-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8 bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Globe className="h-6 w-6 text-blue-600" />
          <h2 className="text-lg font-medium text-gray-900">Google Business Profile</h2>
        </div>
        
        {integration ? (
          <div className="flex items-center space-x-2">
            {integration.syncStatus === 'SUCCESS' && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {integration.syncStatus === 'ERROR' && (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            {integration.syncStatus === 'SYNCING' && (
              <Clock className="h-5 w-5 text-yellow-500 animate-spin" />
            )}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              integration.isActive && !integration.isTokenExpired
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {integration.isActive && !integration.isTokenExpired ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Not Connected
          </span>
        )}
      </div>

      <div className="mt-4">
        {integration ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Your menu is automatically synced to Google Business Profile. 
              Last sync: {integration.lastSyncAt 
                ? new Date(integration.lastSyncAt).toLocaleString()
                : 'Never'
              }
            </p>
            
            {integration.errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex">
                  <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 mr-2" />
                  <div className="text-sm text-red-700">
                    <strong>Sync Error:</strong> {integration.errorMessage}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={handleSync}
                disabled={isSyncing || integration.syncStatus === 'SYNCING'}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing || integration.syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
                {isSyncing || integration.syncStatus === 'SYNCING' ? 'Syncing...' : 'Sync Now'}
              </button>
              
              <button
                onClick={handleDisconnect}
                disabled={disconnect.isLoading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {disconnect.isLoading ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <Globe className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Google Business Profile</h3>
            <p className="text-sm text-gray-600 mb-4">
              Automatically sync your menu to Google Business Profile so customers can see your latest offerings when they search for your restaurant.
            </p>
            <button
              onClick={handleConnect}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Globe className="h-4 w-4 mr-2" />
              Connect Google Account
            </button>
          </div>
        )}
      </div>
    </div>
  )
}