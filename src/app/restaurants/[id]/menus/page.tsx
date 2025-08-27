'use client'

import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'
import { Plus, Menu as MenuIcon, Package, Edit, Trash2, Folder, Upload } from 'lucide-react'
import DashboardLayout from '@/components/layout/dashboard-layout'

export default function RestaurantMenusPage() {
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

  return (
    <DashboardLayout
      title="Menu Management"
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Restaurants', href: '/restaurants' },
        { label: restaurant.name, href: `/restaurants/${restaurantId}` },
        { label: 'Menus' }
      ]}
    >
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            Manage menus and categories for {restaurant.name}
          </p>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Create Menu
          </button>
        </div>

        {/* Menus Grid */}
        {restaurant.menus.length > 0 ? (
          <div className="space-y-6">
            {restaurant.menus.map((menu) => (
              <div key={menu.id} className="bg-white shadow rounded-lg overflow-hidden">
                {/* Menu Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <MenuIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{menu.name}</h3>
                        {menu.description && (
                          <p className="text-sm text-gray-600 mt-1">{menu.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {menu._count?.products || 0} products
                      </span>
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium text-gray-900">Categories</h4>
                    <button className="text-sm text-blue-600 hover:text-blue-700">
                      + Add Category
                    </button>
                  </div>

                  {menu.categories.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {menu.categories.map((category) => (
                        <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <Folder className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-900">
                                {category.name}
                              </span>
                            </div>
                            <div className="flex space-x-1">
                              <button className="p-1 text-gray-400 hover:text-gray-600">
                                <Edit className="h-3 w-3" />
                              </button>
                              <button className="p-1 text-gray-400 hover:text-red-600">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          {category.description && (
                            <p className="text-xs text-gray-600 mb-2">{category.description}</p>
                          )}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Order: {category.displayOrder}</span>
                            <Link
                              href={`/products?category=${category.id}`}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              View products
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <Folder className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 mb-2">No categories yet</p>
                      <button className="text-sm text-blue-600 hover:text-blue-700">
                        Create your first category
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-4">
                      <Link
                        href={`/products?menu=${menu.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                      >
                        <Package className="h-4 w-4 mr-1" />
                        View all products
                      </Link>
                      <Link
                        href={`/products/new?menu=${menu.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add product
                      </Link>
                      <Link
                        href={`/products/import?restaurant=${restaurantId}&menu=${menu.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Import products
                      </Link>
                    </div>
                    <div className="text-xs text-gray-500">
                      Created {new Date(menu.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <MenuIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No menus yet</h3>
            <p className="text-gray-500 mb-4">
              Create your first menu to organize your products into categories.
            </p>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Create Menu
            </button>
          </div>
        )}

        {/* Menu Templates */}
        <div className="mt-12 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Menu Templates</h3>
          <p className="text-gray-600 mb-6">
            Quick start with pre-built menu structures for common restaurant types.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer">
              <h4 className="font-medium text-gray-900 mb-2">Fast Food</h4>
              <p className="text-sm text-gray-600 mb-3">
                Burgers, Sides, Drinks, Desserts
              </p>
              <button className="text-sm text-blue-600 hover:text-blue-700">
                Use template
              </button>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer">
              <h4 className="font-medium text-gray-900 mb-2">Pizza Restaurant</h4>
              <p className="text-sm text-gray-600 mb-3">
                Pizzas, Starters, Sides, Beverages
              </p>
              <button className="text-sm text-blue-600 hover:text-blue-700">
                Use template
              </button>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer">
              <h4 className="font-medium text-gray-900 mb-2">Fine Dining</h4>
              <p className="text-sm text-gray-600 mb-3">
                Appetizers, Mains, Desserts, Wine
              </p>
              <button className="text-sm text-blue-600 hover:text-blue-700">
                Use template
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}