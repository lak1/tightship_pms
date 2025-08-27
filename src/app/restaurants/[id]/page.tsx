'use client'

import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'
import { Settings, Plus, Menu as MenuIcon, BarChart, Users, Package } from 'lucide-react'
import DashboardLayout from '@/components/layout/dashboard-layout'

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
        {/* Quick Actions */}
        <div className="mb-8 flex flex-wrap gap-3">
          <Link
            href={`/restaurants/${restaurantId}/settings`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
          <Link
            href={`/restaurants/${restaurantId}/menus`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <MenuIcon className="mr-2 h-4 w-4" />
            Manage Menus
          </Link>
          <Link
            href="/products/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <MenuIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Menus
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {restaurant.menus.length}
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
                  <Package className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Products
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {totalProducts}
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
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Integrations
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {restaurant.integrations.length}
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
                  <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-green-400"></div>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Status
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      Active
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

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
                  <MenuIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
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

            {/* Quick Links */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  href={`/products?restaurant=${restaurantId}`}
                  className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <Package className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">View Products</div>
                      <div className="text-xs text-gray-500">Manage menu items</div>
                    </div>
                  </div>
                </Link>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}