'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import LandingPage from '@/components/marketing/landing-page'
import { 
  Building2, 
  Package, 
  TrendingUp, 
  RefreshCw,
  Plus,
  BarChart3,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  Zap
} from 'lucide-react'
import { trpc } from '@/lib/trpc'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [showDashboard, setShowDashboard] = useState(false)

  // Fetch real data using tRPC
  const { data: dashboardStats, isLoading: statsLoading } = trpc.dashboard.getStats.useQuery(undefined, {
    enabled: !!session && showDashboard
  })
  const { data: recentActivity, isLoading: activityLoading } = trpc.dashboard.getRecentActivity.useQuery(undefined, {
    enabled: !!session && showDashboard
  })

  // Check if we should show dashboard based on URL or user preference
  useEffect(() => {
    // Show dashboard if:
    // 1. On app subdomain (app.domain.com)
    // 2. On localhost (development)
    // 3. Explicitly navigated to /dashboard
    // 4. URL has ?dashboard=true parameter
    const url = new URL(window.location.href)
    const isAppSubdomain = window.location.hostname.startsWith('app.')
    const isLocalhost = window.location.hostname === 'localhost'
    const hasDashboardParam = url.searchParams.get('dashboard') === 'true'
    const isDashboardPath = window.location.pathname.startsWith('/dashboard')

    if (session && (isAppSubdomain || isLocalhost || hasDashboardParam || isDashboardPath)) {
      setShowDashboard(true)
    }
  }, [session])

  // Loading state - only show loading if we're checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Loading state for authenticated users only when showing dashboard
  if (session && showDashboard && (statsLoading || activityLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show landing page for non-authenticated users OR when not on app subdomain
  if (!session || !showDashboard) {
    return <LandingPage />
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    return `${Math.floor(diffInSeconds / 3600)} hours ago`
  }

  const getActivityIcon = (type: string, status: string) => {
    if (status === 'error') return <AlertTriangle className="h-5 w-5 text-red-500" />
    if (status === 'success') return <CheckCircle className="h-5 w-5 text-green-500" />
    return <Clock className="h-5 w-5 text-yellow-500" />
  }

  // Authenticated - show proper dashboard with navigation
  return (
    <DashboardLayout title="Dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session.user?.name || session.user?.email?.split('@')[0]}! 👋
          </h1>
          <p className="mt-2 text-gray-600">
            Here's what's happening with your restaurants today
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/restaurants" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-blue-500 group-hover:bg-blue-600 transition-colors">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{dashboardStats?.totalRestaurants || 0}</div>
                <div className="text-sm text-gray-500">Active Restaurants</div>
              </div>
            </div>
          </Link>

          <Link href="/products" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-green-500 group-hover:bg-green-600 transition-colors">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{dashboardStats?.totalProducts || 0}</div>
                <div className="text-sm text-gray-500">Total Products</div>
              </div>
            </div>
          </Link>

          <Link href="/restaurants" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-purple-500 group-hover:bg-purple-600 transition-colors">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{dashboardStats?.totalMenus || 0}</div>
                <div className="text-sm text-gray-500">Active Menus</div>
              </div>
            </div>
          </Link>

          <Link href="/analytics" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-orange-500 group-hover:bg-orange-600 transition-colors">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{dashboardStats?.totalCategories || 0}</div>
                <div className="text-sm text-gray-500">Menu Categories</div>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link 
                    href="/restaurants/new" 
                    className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition group"
                  >
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-md group-hover:bg-blue-200 transition">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">Add Restaurant</div>
                      <div className="text-xs text-gray-500">Create a new location</div>
                    </div>
                  </Link>

                  <Link 
                    href="/products/new" 
                    className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition group"
                  >
                    <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-md group-hover:bg-green-200 transition">
                      <Package className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">Add Product</div>
                      <div className="text-xs text-gray-500">Create new menu item</div>
                    </div>
                  </Link>

                  <Link 
                    href="/sync" 
                    className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition group"
                  >
                    <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-md group-hover:bg-purple-200 transition">
                      <Zap className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">Sync Prices</div>
                      <div className="text-xs text-gray-500">Update all platforms</div>
                    </div>
                  </Link>

                  <Link 
                    href="/analytics" 
                    className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition group"
                  >
                    <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-md group-hover:bg-orange-200 transition">
                      <BarChart3 className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">View Analytics</div>
                      <div className="text-xs text-gray-500">Performance insights</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentActivity && recentActivity.length > 0 ? (
                    recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getActivityIcon(activity.type, activity.status)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-900">{activity.message}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No recent activity</p>
                    </div>
                  )}
                </div>
                <div className="mt-6">
                  <Link 
                    href="/analytics" 
                    className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                  >
                    View all activity →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">System Status</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-900">All systems operational</span>
                </div>
                <span className="text-xs text-gray-500">
                  Last sync: {dashboardStats?.lastSync ? formatTimeAgo(dashboardStats.lastSync.toString()) : 'Never'}
                </span>
              </div>
              <Link
                href="/sync"
                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Sync Now
              </Link>
            </div>
          </div>
        </div>

        {/* Getting Started Tips */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-md">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-blue-900">Getting Started</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Complete your setup to get the most out of Tightship PMS:</p>
                <ul className="mt-2 ml-4 list-disc space-y-1">
                  <li>Add your restaurant locations</li>
                  <li>Import your menu items</li>
                  <li>Connect to delivery platforms</li>
                  <li>Set up automatic pricing rules</li>
                </ul>
              </div>
              <div className="mt-4">
                <Link
                  href="/restaurants/new"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}