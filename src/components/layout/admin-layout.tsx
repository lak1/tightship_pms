'use client'

import { ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Users, 
  Building2, 
  CreditCard, 
  BarChart3, 
  Shield, 
  Settings,
  FileText,
  Menu,
  X,
  ChevronLeft
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface AdminLayoutProps {
  children: ReactNode
  title?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
}

const adminNavigation = [
  { name: 'Overview', href: '/admin', icon: BarChart3 },
  { name: 'Organizations', href: '/admin/organizations', icon: Building2 },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
  { name: 'System Logs', href: '/admin/logs', icon: FileText },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminLayout({ children, title, breadcrumbs }: AdminLayoutProps) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Check admin access
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (!session.user?.role || !['OWNER', 'ADMIN'].includes(session.user.role)) {
      router.push('/')
      return
    }
  }, [session, status, router])

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Access denied
  if (!session || !session.user?.role || !['OWNER', 'ADMIN'].includes(session.user.role)) {
    return null
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
              <Shield className="h-8 w-8 text-red-600 mr-2" />
              <span className="text-xl font-semibold text-gray-900">Admin Panel</span>
            </div>
            
            {/* Back to main app */}
            <div className="mt-2 px-4">
              <Link
                href="/"
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                onClick={() => setSidebarOpen(false)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Link>
            </div>

            <nav className="mt-5 px-2 space-y-1">
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      isActive
                        ? 'bg-red-100 text-red-700'
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
                  {session?.user?.name || session?.user?.email}
                </div>
                <div className="text-sm text-gray-500">
                  {session?.user?.role}
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
        <div className="flex-1 flex flex-col min-h-0 bg-white shadow border-r-2 border-red-100">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <Shield className="h-8 w-8 text-red-600 mr-2" />
              <span className="text-xl font-semibold text-gray-900">Admin Panel</span>
            </div>
            
            {/* Back to main app */}
            <div className="mt-2 px-4">
              <Link
                href="/"
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Link>
            </div>

            <nav className="mt-5 flex-1 px-2 space-y-1">
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      isActive
                        ? 'bg-red-100 text-red-700'
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
                <p className="text-sm font-medium text-gray-700">
                  {session?.user?.name || session?.user?.email}
                </p>
                <p className="text-xs text-gray-500 mb-1">
                  {session?.user?.role} Access
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
            className="h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

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