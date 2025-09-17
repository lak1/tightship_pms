'use client'

import { ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Package,
  Building2,
  BarChart3,
  RefreshCw,
  Menu,
  X,
  Shield,
  CreditCard,
  AlertTriangle,
  Tag
} from 'lucide-react'
import { useState } from 'react'
import { useRestaurantMenu } from '@/contexts/RestaurantMenuContext'

interface DashboardLayoutProps {
  children: ReactNode
  title?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Allergen Matrix', href: '/allergen-matrix', icon: AlertTriangle },
  { name: 'Label Printing', href: '/label-printing', icon: Tag },
  { name: 'Restaurants', href: '/restaurants', icon: Building2 },
  { name: 'Sync Status', href: '/sync', icon: RefreshCw },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
]

const getAdminNavigation = (userRole: string) => [
  ...navigation,
  { name: 'Billing', href: '/billing', icon: CreditCard },
  ...(userRole === 'OWNER' || userRole === 'ADMIN' ? [
    { name: 'Admin Panel', href: '/admin', icon: Shield }
  ] : [])
]

export default function DashboardLayout({ children, title, breadcrumbs }: DashboardLayoutProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const {
    selectedRestaurant,
    selectedMenu,
    restaurants,
    menus,
    setSelectedRestaurant,
    setSelectedMenu,
    isLoading: contextLoading
  } = useRestaurantMenu()

  const currentNavigation = getAdminNavigation(session?.user?.role || '')

  // Don't show restaurant selector on certain pages
  const hideRestaurantSelector = pathname === '/admin' || pathname === '/billing' || pathname.startsWith('/auth')

  const GlobalRestaurantSelector = () => {
    if (hideRestaurantSelector || !session) return null

    return (
      <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 border-b">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Building2 className="h-4 w-4" />
          <span>Working with:</span>
        </div>

        {/* Restaurant Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedRestaurant?.id || ''}
            onChange={(e) => {
              const restaurant = restaurants.find(r => r.id === e.target.value) || null
              setSelectedRestaurant(restaurant)
            }}
            disabled={contextLoading}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="">Select Restaurant...</option>
            {restaurants.map(restaurant => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>

          {/* Menu Selector */}
          {selectedRestaurant && (
            <>
              <span className="text-gray-400">→</span>
              <select
                value={selectedMenu?.id || ''}
                onChange={(e) => {
                  const menu = menus.find(m => m.id === e.target.value) || null
                  setSelectedMenu(menu)
                }}
                disabled={contextLoading || menus.length === 0}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">Select Menu...</option>
                {menus.map(menu => (
                  <option key={menu.id} value={menu.id}>
                    {menu.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Status indicator */}
        {selectedRestaurant && selectedMenu && (
          <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{selectedRestaurant.name} / {selectedMenu.name}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        {/* Overlay */}
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        
        {/* Mobile sidebar */}
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Mobile navigation */}
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <span className="text-xl font-semibold text-gray-900">Tightship PMS</span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {currentNavigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="mr-4 h-6 w-6" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Mobile user section */}
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div>
                <div className="text-base font-medium text-gray-800">
                  {session?.user?.email}
                </div>
                <Link
                  href="/api/auth/signout"
                  className="text-sm font-medium text-red-600 hover:text-red-500"
                  onClick={() => setSidebarOpen(false)}
                >
                  Sign out
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white shadow">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <span className="text-xl font-semibold text-gray-900">Tightship PMS</span>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {currentNavigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Desktop user section */}
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center w-full">
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  {session?.user?.email}
                </p>
                <Link
                  href="/api/auth/signout"
                  className="text-xs font-medium text-red-600 hover:text-red-500"
                >
                  Sign out
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-white border-b border-gray-200">
          <button
            type="button"
            className="h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Global Restaurant/Menu Selector */}
        <GlobalRestaurantSelector />

        {/* Page header */}
        {(title || breadcrumbs) && (
          <div className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
              {breadcrumbs && (
                <nav className="flex" aria-label="Breadcrumb">
                  <ol className="flex items-center space-x-4">
                    {breadcrumbs.map((item, index) => (
                      <li key={index}>
                        <div className="flex items-center">
                          {index > 0 && (
                            <svg className="flex-shrink-0 h-5 w-5 text-gray-300 mr-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          {item.href ? (
                            <Link
                              href={item.href}
                              className="text-sm font-medium text-gray-500 hover:text-gray-700"
                            >
                              {item.label}
                            </Link>
                          ) : (
                            <span className="text-sm font-medium text-gray-900">{item.label}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
              {title && (
                <h1 className={`text-2xl font-bold text-gray-900 ${breadcrumbs ? 'mt-2' : ''}`}>
                  {title}
                </h1>
              )}
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}