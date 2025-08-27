'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Edit, History } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DashboardLayout from '@/components/layout/dashboard-layout'

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  basePrice: z.number().min(0, 'Price must be 0 or greater'),
  displayPrice: z.number().min(0, 'Price must be 0 or greater').optional(),
  taxRateId: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
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

export default function ProductDetailPage() {
  const params = useParams()
  const productId = params.id as string
  const { data: session, status } = useSession()
  // const router = useRouter() // Not needed for current functionality
  const [isEditing, setIsEditing] = useState(false)
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([])
  const [selectedDietaryInfo, setSelectedDietaryInfo] = useState<string[]>([])
  const [priceEditMode, setPriceEditMode] = useState<'base' | 'display'>('base')
  const [maintainPrice, setMaintainPrice] = useState<'base' | 'display'>('display')

  const { data: product, isLoading } = trpc.product.getById.useQuery(
    { id: productId },
    { enabled: !!session && !!productId }
  )

  const { data: taxRates } = trpc.product.getTaxRates.useQuery(
    { restaurantId: product?.menus?.restaurants?.id },
    { enabled: !!product?.menus?.restaurants?.id }
  )

  const updateProductMutation = trpc.product.update.useMutation({
    onSuccess: () => {
      setIsEditing(false)
      // Refetch the product data
      utils.product.getById.invalidate({ id: productId })
    },
    onError: (error) => {
      console.error('Error updating product:', error)
      alert('Failed to update product. Please try again.')
    }
  })

  const utils = trpc.useUtils()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  })

  const watchedBasePrice = watch('basePrice')
  const watchedDisplayPrice = watch('displayPrice')
  const watchedTaxRateId = watch('taxRateId')

  // Calculate display price
  const calculateDisplayPrice = (basePrice: string | number, taxRate?: { rate: number | string } | null) => {
    const base = typeof basePrice === 'string' ? parseFloat(basePrice) : basePrice
    // Handle Prisma Decimal objects by converting to number first
    const rawRate = taxRate?.rate
    const rate = typeof rawRate === 'string' 
      ? parseFloat(rawRate) 
      : typeof rawRate === 'number' 
        ? rawRate 
        : rawRate ? Number(rawRate) : 0
    return base * (1 + rate)
  }

  // Calculate base price from display
  const calculateBasePrice = (displayPrice: number, taxRate?: { rate: number } | null) => {
    // Handle Prisma Decimal objects by converting to number first
    const rawRate = taxRate?.rate
    const rate = typeof rawRate === 'string' 
      ? parseFloat(rawRate) 
      : typeof rawRate === 'number' 
        ? rawRate 
        : rawRate ? Number(rawRate) : 0
    return displayPrice / (1 + rate)
  }

  const displayPrice = product ? calculateDisplayPrice(product.basePrice, product.tax_rates) : 0

  // Get selected tax rate
  const selectedTaxRate = taxRates?.find(t => t.id === watchedTaxRateId)

  // Update form when product data loads
  useEffect(() => {
    if (product) {
      const basePrice = parseFloat(product.basePrice)
      const displayPrice = calculateDisplayPrice(basePrice, product.tax_rates)
      
      reset({
        name: product.name,
        description: product.description || '',
        basePrice: basePrice,
        displayPrice: displayPrice,
        taxRateId: product.taxRateId || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
      })
      setSelectedAllergens(product.allergens)
      setSelectedDietaryInfo(product.dietaryInfo)
    }
  }, [product, reset])

  // Handle price changes based on edit mode
  useEffect(() => {
    if (priceEditMode === 'base' && watchedBasePrice !== undefined && selectedTaxRate) {
      const newDisplayPrice = calculateDisplayPrice(watchedBasePrice, selectedTaxRate)
      setValue('displayPrice', newDisplayPrice)
    } else if (priceEditMode === 'display' && watchedDisplayPrice !== undefined && selectedTaxRate) {
      const newBasePrice = calculateBasePrice(watchedDisplayPrice, selectedTaxRate)
      setValue('basePrice', newBasePrice)
    }
  }, [watchedBasePrice, watchedDisplayPrice, selectedTaxRate, priceEditMode, setValue])

  // Handle tax rate changes
  useEffect(() => {
    if (watchedTaxRateId && taxRates) {
      const taxRate = taxRates.find(t => t.id === watchedTaxRateId)
      if (taxRate) {
        if (maintainPrice === 'display' && watchedDisplayPrice) {
          // Maintain display price, recalculate base
          const newBasePrice = calculateBasePrice(watchedDisplayPrice, taxRate)
          setValue('basePrice', newBasePrice)
        } else if (maintainPrice === 'base' && watchedBasePrice) {
          // Maintain base price, recalculate display
          const newDisplayPrice = calculateDisplayPrice(watchedBasePrice, taxRate)
          setValue('displayPrice', newDisplayPrice)
        }
      }
    }
  }, [watchedTaxRateId, maintainPrice, watchedBasePrice, watchedDisplayPrice, taxRates, setValue])

  const onSubmit = async (data: ProductFormData) => {
    await updateProductMutation.mutateAsync({
      id: productId,
      name: data.name,
      description: data.description,
      basePrice: data.basePrice,
      taxRateId: data.taxRateId,
      sku: data.sku,
      barcode: data.barcode,
      allergens: selectedAllergens,
      dietaryInfo: selectedDietaryInfo,
    })
  }

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

  if (!product) {
    return (
      <DashboardLayout
        title="Product Not Found"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Products', href: '/products' },
          { label: 'Not Found' }
        ]}
      >
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Product Not Found</h2>
            <p className="text-gray-600 mb-4">The product you&apos;re looking for doesn&apos;t exist.</p>
            <Link
              href="/products"
              className="text-blue-600 hover:text-blue-700"
            >
              Return to Products
            </Link>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title={product.name}
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Products', href: '/products' },
        { label: product.name }
      ]}
    >
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/products"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Link>
            <p className="text-gray-600">
              Product details and pricing information
            </p>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {isEditing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Edit Product</h2>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {/* Product Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        {...register('name')}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      />
                    </div>

                    {/* Advanced Price Editor */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-900">Pricing</h3>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500">Edit by:</span>
                          <button
                            type="button"
                            onClick={() => setPriceEditMode('base')}
                            className={`px-2 py-1 rounded ${
                              priceEditMode === 'base'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            Base Price
                          </button>
                          <button
                            type="button"
                            onClick={() => setPriceEditMode('display')}
                            className={`px-2 py-1 rounded ${
                              priceEditMode === 'display'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            Display Price
                          </button>
                        </div>
                      </div>

                      {/* Tax Rate Selection */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tax Rate
                        </label>
                        <select
                          {...register('taxRateId')}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">No Tax</option>
                          {taxRates?.map(taxRate => (
                            <option key={taxRate.id} value={taxRate.id}>
                              {taxRate.name} ({(taxRate.rate * 100).toFixed(0)}%)
                            </option>
                          ))}
                        </select>
                        
                        {/* Maintain Price Toggle */}
                        {selectedTaxRate && (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className="text-gray-500">When changing tax, maintain:</span>
                            <button
                              type="button"
                              onClick={() => setMaintainPrice('base')}
                              className={`px-2 py-1 rounded ${
                                maintainPrice === 'base'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              Base Price
                            </button>
                            <button
                              type="button"
                              onClick={() => setMaintainPrice('display')}
                              className={`px-2 py-1 rounded ${
                                maintainPrice === 'display'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              Display Price
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Price Inputs */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Base Price (Ex. TAX) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={priceEditMode === 'display'}
                            {...register('basePrice', { valueAsNumber: true })}
                            className={`w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              priceEditMode === 'display' ? 'bg-gray-50 text-gray-500' : ''
                            }`}
                          />
                          {errors.basePrice && (
                            <p className="mt-1 text-sm text-red-600">{errors.basePrice.message}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Display Price (Inc. TAX)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={priceEditMode === 'base'}
                            {...register('displayPrice', { valueAsNumber: true })}
                            className={`w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              priceEditMode === 'base' ? 'bg-gray-50 text-gray-500' : ''
                            }`}
                          />
                          {errors.displayPrice && (
                            <p className="mt-1 text-sm text-red-600">{errors.displayPrice.message}</p>
                          )}
                        </div>
                      </div>

                      {/* Price Summary */}
                      {selectedTaxRate && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md text-sm">
                          <div className="flex justify-between">
                            <span>Tax ({selectedTaxRate.name}):</span>
                            <span>£{(watchedDisplayPrice && watchedBasePrice ? watchedDisplayPrice - watchedBasePrice : 0).toFixed(2)}</span>
                          </div>
                        </div>
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
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </button>
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
              </form>
            ) : (
              <>
                {/* Product Information */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Product Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{product.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Category</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {product.category?.name || 'Uncategorized'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Pricing</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <div>Base: £{parseFloat(product.basePrice).toFixed(2)}</div>
                        <div className="text-gray-600">
                          Display: £{displayPrice.toFixed(2)} 
                          {product.tax_rates && (
                            <span className="text-xs ml-1">
                              (+{(product.tax_rates.rate * 100).toFixed(0)}% {product.tax_rates.name})
                            </span>
                          )}
                        </div>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">SKU</dt>
                      <dd className="mt-1 text-sm text-gray-900">{product.sku || 'Not set'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Barcode</dt>
                      <dd className="mt-1 text-sm text-gray-900">{product.barcode || 'Not set'}</dd>
                    </div>
                  </div>
                  {product.description && (
                    <div className="mt-6">
                      <dt className="text-sm font-medium text-gray-500">Description</dt>
                      <dd className="mt-1 text-sm text-gray-900">{product.description}</dd>
                    </div>
                  )}
                </div>

                {/* Allergens & Dietary Info */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Allergens & Dietary Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <dt className="text-sm font-medium text-gray-500 mb-2">Allergens</dt>
                      {product.allergens.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {product.allergens.map(allergen => (
                            <span key={allergen} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {allergen}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <dd className="text-sm text-gray-900">None specified</dd>
                      )}
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 mb-2">Dietary Information</dt>
                      {product.dietaryInfo.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {product.dietaryInfo.map(info => (
                            <span key={info} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {info}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <dd className="text-sm text-gray-900">None specified</dd>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Current Pricing */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Current Pricing</h2>
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">Base Price (Ex. TAX)</span>
                    <span className="text-lg font-semibold text-gray-900">
                      £{parseFloat(product.basePrice).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">
                      Display Price (Inc. TAX)
                    </span>
                    <span className="text-lg font-semibold text-gray-900">
                      £{displayPrice.toFixed(2)}
                    </span>
                  </div>
                  {product.tax_rates && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Tax Applied</span>
                      <span className="text-xs text-gray-500">
                        {product.tax_rates.name} ({(product.tax_rates.rate * 100).toFixed(0)}%)
                      </span>
                    </div>
                  )}
                </div>
                {product.prices?.map(price => price.platform && (
                  <div key={price.platform.id} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{price.platform.name}</span>
                    <span className="text-sm font-medium text-gray-900">
                      £{parseFloat(price.price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price History */}
            {product.price_history && product.price_history.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <History className="mr-2 h-5 w-5" />
                  Recent Price Changes
                </h2>
                <div className="space-y-3">
                  {product.price_history.slice(0, 5).map((history, index) => (
                    <div key={index} className="text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">
                          £{parseFloat(history.oldPrice).toFixed(2)} → £{parseFloat(history.newPrice).toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(history.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {history.changeReason && (
                        <div className="text-xs text-gray-500 mt-1">
                          {history.changeReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}