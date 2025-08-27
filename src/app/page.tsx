'use client'

import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'

export default function Home() {
  const { data: session, status } = useSession()
  const { data: restaurants, isLoading } = trpc.restaurant.list.useQuery(
    undefined,
    {
      enabled: !!session, // Only fetch if authenticated
    }
  )

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  // Not authenticated - show landing page
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <nav className="flex justify-between items-center mb-16">
            <div className="text-2xl font-bold text-gray-900">Tightship PMS</div>
            <div className="space-x-4">
              <Link 
                href="/api/auth/signin" 
                className="text-gray-700 hover:text-gray-900"
              >
                Sign In
              </Link>
              <Link 
                href="/auth/signup" 
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Get Started
              </Link>
            </div>
          </nav>

          {/* Hero Section */}
          <div className="text-center py-20">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl mb-6">
              Tightship Price Manager
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Centralized pricing management for restaurants. 
              Synchronize your menu prices across Deliveroo, Uber Eats, Just Eat, 
              and your POS systems from one dashboard.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/auth/signup"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition"
              >
                Start Free Trial
              </Link>
              <Link
                href="/api/auth/signin"
                className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-50 transition"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">🔄</div>
              <h3 className="text-xl font-semibold mb-2">Real-time Sync</h3>
              <p className="text-gray-600">
                Update prices once and sync across all your delivery platforms instantly.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Analytics</h3>
              <p className="text-gray-600">
                Track price changes, monitor performance, and optimize your menu pricing.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">Automation</h3>
              <p className="text-gray-600">
                Set pricing rules and let the system automatically adjust prices based on demand.
              </p>
            </div>
          </div>

          {/* Platforms */}
          <div className="mt-20 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-8">
              Integrated with major platforms
            </h2>
            <div className="flex justify-center gap-12 flex-wrap">
              <div className="text-gray-400 text-lg font-medium">Deliveroo</div>
              <div className="text-gray-400 text-lg font-medium">Uber Eats</div>
              <div className="text-gray-400 text-lg font-medium">Just Eat</div>
              <div className="text-gray-400 text-lg font-medium">Square</div>
              <div className="text-gray-400 text-lg font-medium">Toast</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Authenticated - show dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-xl font-semibold">Tightship PMS</div>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                {session.user?.email}
              </span>
              <Link
                href="/api/auth/signout"
                className="text-red-600 hover:text-red-700"
              >
                Sign Out
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Dashboard
        </h1>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Your Restaurants
          </h2>
          
          {isLoading ? (
            <div className="text-gray-500">Loading restaurants...</div>
          ) : restaurants && restaurants.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {restaurants.map((restaurant) => (
                <Link
                  key={restaurant.id}
                  href={`/restaurants/${restaurant.id}`}
                  className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition cursor-pointer"
                >
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      {restaurant.name}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {restaurant.menus.length} menu(s) • {restaurant.integrations.length} integration(s)
                    </p>
                    <div className="mt-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">No restaurants yet</h3>
                <p className="mt-1 text-gray-500">
                  Get started by creating your first restaurant.
                </p>
              </div>
              <div className="mt-6">
                <Link
                  href="/restaurants/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="mr-2 -ml-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Restaurant
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link href="/products/new" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition">
              <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="block text-sm font-medium text-gray-900">Add Product</span>
            </Link>
            <Link href="/products/import" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition">
              <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="block text-sm font-medium text-gray-900">Import Products</span>
            </Link>
            <Link href="/sync" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition">
              <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="block text-sm font-medium text-gray-900">Sync Prices</span>
            </Link>
            <Link href="/analytics" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition">
              <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="block text-sm font-medium text-gray-900">View Analytics</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}