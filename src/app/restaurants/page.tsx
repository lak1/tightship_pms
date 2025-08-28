'use client'

import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'
import { Plus, Building2, Settings, BookOpen, Users } from 'lucide-react'
import DashboardLayout from '@/components/layout/dashboard-layout'

export default function RestaurantsPage() {
  const { data: session, status } = useSession()
  const { data: restaurants, isLoading } = trpc.restaurant.list.useQuery(
    undefined,
    {
      enabled: !!session,
    }
  )

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
      title="Restaurants"
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Restaurants' }
      ]}
    >
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            Manage your restaurant locations and settings
          </p>
          <Link
            href="/restaurants/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Restaurant
          </Link>
        </div>

        {/* Restaurants Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading restaurants...</div>
          </div>
        ) : restaurants && restaurants.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((restaurant) => (
              <Link
                key={restaurant.id}
                href={`/restaurants/${restaurant.id}`}
                className="group relative bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 hover:border-gray-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex space-x-1">
                    <Link
                      href={`/restaurants/${restaurant.id}/settings`}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Settings className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/restaurants/${restaurant.id}/menus`}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <BookOpen className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {restaurant.name}
                  </h3>
                  {restaurant.address && (
                    <p className="text-sm text-gray-500 mt-1">
                      {typeof restaurant.address === 'string' 
                        ? JSON.parse(restaurant.address).city 
                        : 'Location not set'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Menus</span>
                    <span className="font-medium">{restaurant.menus.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Products</span>
                    <span className="font-medium">
                      {restaurant.menus.reduce((total, menu) => total + (menu._count?.products || 0), 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Integrations</span>
                    <span className="font-medium">{restaurant.integrations.length}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(restaurant.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No restaurants yet</h3>
            <p className="text-gray-500 mb-4">
              Get started by creating your first restaurant location.
            </p>
            <Link
              href="/restaurants/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Restaurant
            </Link>
          </div>
        )}

        {/* Quick Stats */}
        {restaurants && restaurants.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Building2 className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Restaurants
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {restaurants.length}
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
                    <BookOpen className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Menus
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {restaurants.reduce((total, restaurant) => total + restaurant.menus.length, 0)}
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
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Active Integrations
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {restaurants.reduce((total, restaurant) => total + restaurant.integrations.length, 0)}
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
                        All Active
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}