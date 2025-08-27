'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { ImportWizard } from '@/components/import-wizard'
import DashboardLayout from '@/components/layout/dashboard-layout'

export default function ProductImportPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [restaurantId, setRestaurantId] = useState<string>('')
  const [menuId, setMenuId] = useState<string>('')

  // Get restaurant and menu from URL params
  const urlRestaurantId = searchParams.get('restaurant')
  const urlMenuId = searchParams.get('menu')

  const { data: restaurants } = trpc.restaurant.list.useQuery(
    undefined,
    { enabled: !!session }
  )

  const { data: restaurant } = trpc.restaurant.getById.useQuery(
    { id: restaurantId },
    { enabled: !!restaurantId }
  )

  useEffect(() => {
    if (urlRestaurantId) {
      setRestaurantId(urlRestaurantId)
    }
    if (urlMenuId) {
      setMenuId(urlMenuId)
    }
  }, [urlRestaurantId, urlMenuId])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) {
    router.push('/api/auth/signin')
    return null
  }

  const handleComplete = () => {
    // Navigate back to products page with restaurant filter
    if (restaurantId) {
      router.push(`/products?restaurant=${restaurantId}`)
    } else {
      router.push('/products')
    }
  }

  const handleCancel = () => {
    router.back()
  }

  const handleRestaurantChange = (newRestaurantId: string) => {
    setRestaurantId(newRestaurantId)
    setMenuId('') // Reset menu when restaurant changes
    
    // Update URL
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('restaurant', newRestaurantId)
    newUrl.searchParams.delete('menu')
    window.history.replaceState({}, '', newUrl.toString())
  }

  const handleMenuChange = (newMenuId: string) => {
    setMenuId(newMenuId)
    
    // Update URL
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('menu', newMenuId)
    window.history.replaceState({}, '', newUrl.toString())
  }

  return (
    <DashboardLayout
      title="Import Products"
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Products', href: '/products' },
        { label: 'Import Products' }
      ]}
    >
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Restaurant and Menu Selection */}
        {(!restaurantId || !menuId) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Select Target Location</h2>
            
            {/* Restaurant Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant
              </label>
              <select
                value={restaurantId}
                onChange={(e) => handleRestaurantChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a restaurant...</option>
                {restaurants?.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Menu Selection */}
            {restaurantId && restaurant && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Menu
                </label>
                <select
                  value={menuId}
                  onChange={(e) => handleMenuChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a menu...</option>
                  {restaurant.menus.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.name} ({menu._count?.products || 0} products)
                    </option>
                  ))}
                </select>
                
                {restaurant.menus.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    No menus found. Create a menu first to import products.
                  </p>
                )}
              </div>
            )}

            {!restaurantId && restaurants?.length === 0 && (
              <p className="text-sm text-gray-500">
                No restaurants found. Create a restaurant first to import products.
              </p>
            )}
          </div>
        )}

        {/* Import Wizard */}
        {restaurantId && menuId && (
          <ImportWizard
            restaurantId={restaurantId}
            menuId={menuId}
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        )}

        {/* Help Text */}
        <div className="bg-blue-50 rounded-lg p-4 mt-6">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Import Tips</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Supported formats: CSV, Excel (.xlsx, .xls)</li>
            <li>• Include columns for: Product Name (required), Category, Price, Description</li>
            <li>• Tax handling: Use Display Price + Tax Y/N columns, we&apos;ll calculate base prices</li>
            <li>• Platform-specific prices: Deliveroo Price, Uber Eats Price, Just Eat Price</li>
            <li>• Additional fields: SKU, Barcode, Allergens, Dietary Info</li>
            <li>• We&apos;ll auto-detect your tax types and help you map columns</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}