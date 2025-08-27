'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DashboardLayout from '@/components/layout/dashboard-layout'

const productSchema = z.object({
  menuId: z.string().min(1, 'Please select a menu'),
  categoryId: z.string().optional(),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  basePrice: z.number().min(0, 'Price must be 0 or greater'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  priceControl: z.enum(['MANUAL', 'FORMULA', 'MARKET']).default('MANUAL'),
  allergens: z.array(z.string()).default([]),
  dietaryInfo: z.array(z.string()).default([]),
})

type ProductFormData = z.infer<typeof productSchema>

const ALLERGENS = [
  'Gluten', 'Dairy', 'Eggs', 'Fish', 'Shellfish', 'Tree nuts', 'Peanuts', 
  'Soy', 'Sesame', 'Sulphites', 'Celery', 'Mustard', 'Lupin'
]

const DIETARY_INFO = [
  'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Low-carb', 
  'Keto', 'Halal', 'Kosher', 'Organic'
]

export default function NewProductPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([])
  const [selectedDietaryInfo, setSelectedDietaryInfo] = useState<string[]>([])

  const { data: restaurants, isLoading: restaurantsLoading } = trpc.restaurant.list.useQuery(
    undefined,
    { enabled: !!session }
  )

  const createProductMutation = trpc.product.create.useMutation({
    onSuccess: () => {
      router.push('/products')
    },
    onError: (error) => {
      console.error('Error creating product:', error)
      alert('Failed to create product. Please try again.')
    }
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  })

  const selectedMenuId = watch('menuId')

  // Get categories for the selected menu
  const selectedMenu = restaurants
    ?.flatMap(r => r.menus)
    .find(m => m.id === selectedMenuId)

  const onSubmit = async (data: ProductFormData) => {
    await createProductMutation.mutateAsync({
      ...data,
      allergens: selectedAllergens,
      dietaryInfo: selectedDietaryInfo,
    })
  }

  if (status === 'loading' || restaurantsLoading) {
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
      title="Add New Product"
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Products', href: '/products' },
        { label: 'New' }
      ]}
    >
      <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/products"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Basic Information</h2>
            
            <div className="grid grid-cols-1 gap-6">
              {/* Menu Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Menu *
                </label>
                <select
                  {...register('menuId')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a menu</option>
                  {restaurants?.map((restaurant) =>
                    restaurant.menus.map((menu) => (
                      <option key={menu.id} value={menu.id}>
                        {restaurant.name} - {menu.name}
                      </option>
                    ))
                  )}
                </select>
                {errors.menuId && (
                  <p className="mt-1 text-sm text-red-600">{errors.menuId.message}</p>
                )}
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter product name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter product description"
                />
              </div>

              {/* Base Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Price (£) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('basePrice', { valueAsNumber: true })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
                {errors.basePrice && (
                  <p className="mt-1 text-sm text-red-600">{errors.basePrice.message}</p>
                )}
              </div>

              {/* SKU and Barcode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU
                  </label>
                  <input
                    type="text"
                    {...register('sku')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Product SKU"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Barcode
                  </label>
                  <input
                    type="text"
                    {...register('barcode')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Product barcode"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Allergens */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Allergens</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {ALLERGENS.map((allergen) => (
                <label key={allergen} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedAllergens.includes(allergen)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAllergens([...selectedAllergens, allergen])
                      } else {
                        setSelectedAllergens(selectedAllergens.filter(a => a !== allergen))
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{allergen}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dietary Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Dietary Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {DIETARY_INFO.map((info) => (
                <label key={info} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedDietaryInfo.includes(info)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDietaryInfo([...selectedDietaryInfo, info])
                      } else {
                        setSelectedDietaryInfo(selectedDietaryInfo.filter(i => i !== info))
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{info}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link
              href="/products"
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}