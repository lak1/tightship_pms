'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, History } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { STANDARD_ALLERGENS } from '@/lib/constants/allergens'
import { NUTRITION_FIELDS } from '@/lib/types/nutrition'
import SearchableSelect from '@/components/ui/searchable-select'

const nutritionalInfoSchema = z.object({
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbohydrates: z.number().optional(),
  fat: z.number().optional(),
  saturatedFat: z.number().optional(),
  sugar: z.number().optional(),
  fiber: z.number().optional(),
  sodium: z.number().optional(),
  cholesterol: z.number().optional(),
  calcium: z.number().optional(),
  iron: z.number().optional(),
  vitaminC: z.number().optional(),
  vitaminA: z.number().optional(),
  servingSize: z.string().optional(),
  servingUnit: z.string().optional(),
}).optional()

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  basePrice: z.number().min(0, 'Price must be 0 or greater'),
  displayPrice: z.number().min(0, 'Price must be 0 or greater').optional(),
  taxRateId: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  ingredients: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  dietaryInfo: z.array(z.string()).default([]),
  nutritionInfo: nutritionalInfoSchema,
  canBeModifier: z.boolean().default(false),
  showOnMenu: z.boolean().default(true),
})

type ProductFormData = z.infer<typeof productSchema>

export default function ProductDetailPage() {
  const params = useParams()
  const productId = params.id as string
  const { data: session, status } = useSession()
  const [ingredients, setIngredients] = useState<string[]>([])
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([])
  const [selectedMayContainAllergens, setSelectedMayContainAllergens] = useState<string[]>([])
  const [selectedDietaryInfo, setSelectedDietaryInfo] = useState<string[]>([])
  const [nutritionInfo, setNutritionInfo] = useState<any>({})
  const [priceEditMode, setPriceEditMode] = useState<'base' | 'display'>('base')
  const [maintainPrice, setMaintainPrice] = useState<'base' | 'display'>('display')
  const [modifierPriceDisplay, setModifierPriceDisplay] = useState<'base' | 'display'>('base')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [bundlePricingMode, setBundlePricingMode] = useState<'bundle' | 'custom'>('bundle')

  const { data: product, isLoading } = trpc.product.getById.useQuery(
    { id: productId },
    { enabled: !!session && !!productId }
  )

  const { data: taxRates } = trpc.product.getTaxRates.useQuery(
    { restaurantId: product?.menus?.restaurants?.id },
    { enabled: !!product?.menus?.restaurants?.id }
  )

  const { data: categories, refetch: refetchCategories } = trpc.product.getCategories.useQuery(
    { menuId: product?.menuId || '' },
    { enabled: !!product?.menuId }
  )

  const { data: constants } = trpc.product.getConstants.useQuery()

  // Composite and modifier queries
  const { data: compositeComponents } = trpc.product.getCompositeComponents.useQuery(
    { productId },
    { enabled: !!product?.isComposite }
  )

  const { data: availableModifiers } = trpc.product.getProductModifiers.useQuery(
    { productId },
    { enabled: !!productId }
  )

  // Get all products for modifier selection
  const { data: allProducts } = trpc.product.list.useQuery(
    { 
      restaurantId: product?.menus?.restaurants?.id || '',
      limit: 1000 // Get all products for dropdown
    },
    { enabled: !!product?.menus?.restaurants?.id }
  )

  const createCategoryMutation = trpc.product.createCategory.useMutation({
    onSuccess: () => {
      refetchCategories()
      setShowNewCategory(false)
      setNewCategoryName('')
    },
  })

  const updateProductMutation = trpc.product.update.useMutation({
    onSuccess: () => {
      // Refetch the product data
      utils.product.getById.invalidate({ id: productId })
    },
    onError: (error) => {
      console.error('Error updating product:', error)
      alert('Failed to update product. Please try again.')
    }
  })

  const addModifierMutation = trpc.product.addModifier.useMutation({
    onSuccess: () => {
      utils.product.getProductModifiers.invalidate({ productId })
    }
  })

  const removeModifierMutation = trpc.product.removeModifier.useMutation({
    onSuccess: () => {
      utils.product.getProductModifiers.invalidate({ productId })
    }
  })

  const updateModifierMutation = trpc.product.updateModifier.useMutation({
    onSuccess: () => {
      utils.product.getProductModifiers.invalidate({ productId })
    }
  })

  const updateComponentQuantityMutation = trpc.product.updateComponentQuantity.useMutation({
    onSuccess: () => {
      utils.product.getCompositeComponents.invalidate({ productId })
      utils.product.getById.invalidate({ id: productId })
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

  // Helper function to round to 2 decimal places
  const roundToTwoDecimals = (value: number) => Math.round(value * 100) / 100

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
      
      // Debug logging
      console.log('Product data:', {
        taxRateId: product.taxRateId,
        tax_rates: product.tax_rates,
        tax_rates_id: product.tax_rates?.id
      })
      console.log('Available taxRates:', taxRates)
      
      const taxRateIdToUse = product.tax_rates?.id || product.taxRateId || ''
      console.log('Setting taxRateId to:', taxRateIdToUse)
      
      reset({
        name: product.name,
        description: product.description || '',
        categoryId: product.categoryId || '',
        basePrice: roundToTwoDecimals(basePrice), // Round to 2 decimal places for display
        displayPrice: roundToTwoDecimals(displayPrice), // Round to 2 decimal places for display
        taxRateId: taxRateIdToUse,
        sku: product.sku || '',
        barcode: product.barcode || '',
        ingredients: product.ingredients || [],
        allergens: product.allergens || [],
        dietaryInfo: product.dietaryInfo || [],
        nutritionInfo: product.nutritionInfo || {},
        canBeModifier: product.canBeModifier || false,
        showOnMenu: product.showOnMenu ?? true, // Use ?? to handle null/undefined, default to true
      })
      setIngredients(product.ingredients || [])
      setSelectedAllergens(product.allergens || [])
      setSelectedMayContainAllergens(product.mayContainAllergens || [])
      setSelectedDietaryInfo(product.dietaryInfo || [])
      setNutritionInfo(product.nutritionInfo || {})
      
      // Set bundle pricing mode based on whether product has custom price
      if (product.isComposite) {
        setBundlePricingMode(product.customPrice ? 'custom' : 'bundle')
      }
    }
  }, [product, reset, taxRates])

  // Handle price changes based on edit mode
  useEffect(() => {
    if (priceEditMode === 'base' && watchedBasePrice !== undefined && selectedTaxRate) {
      const newDisplayPrice = calculateDisplayPrice(watchedBasePrice, selectedTaxRate)
      setValue('displayPrice', roundToTwoDecimals(newDisplayPrice)) // Round to 2 decimal places
    } else if (priceEditMode === 'display' && watchedDisplayPrice !== undefined && selectedTaxRate) {
      const newBasePrice = calculateBasePrice(watchedDisplayPrice, selectedTaxRate)
      setValue('basePrice', roundToTwoDecimals(newBasePrice)) // Round to 2 decimal places
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
          setValue('basePrice', roundToTwoDecimals(newBasePrice)) // Round to 2 decimal places
        } else if (maintainPrice === 'base' && watchedBasePrice) {
          // Maintain base price, recalculate display
          const newDisplayPrice = calculateDisplayPrice(watchedBasePrice, taxRate)
          setValue('displayPrice', roundToTwoDecimals(newDisplayPrice)) // Round to 2 decimal places
        }
      }
    }
  }, [watchedTaxRateId, maintainPrice, watchedBasePrice, watchedDisplayPrice, taxRates, setValue])

  const onSubmit = async (data: ProductFormData) => {
    const updateData: any = {
      id: productId,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      taxRateId: data.taxRateId,
      sku: data.sku,
      barcode: data.barcode,
      ingredients,
      allergens: selectedAllergens,
      mayContainAllergens: selectedMayContainAllergens,
      dietaryInfo: selectedDietaryInfo,
      nutritionInfo: Object.keys(nutritionInfo).length > 0 ? nutritionInfo : undefined,
      canBeModifier: data.canBeModifier,
      showOnMenu: data.showOnMenu,
    }

    // Handle pricing based on product type and mode
    if (product?.isComposite) {
      if (bundlePricingMode === 'custom') {
        // Set custom price and base price
        updateData.customPrice = data.basePrice
        updateData.basePrice = data.basePrice
      } else {
        // Clear custom price to use bundle calculation
        updateData.customPrice = null
        // Don't set basePrice - let the backend calculate it from components
      }
    } else {
      // Regular product - just set base price
      updateData.basePrice = data.basePrice
    }

    await updateProductMutation.mutateAsync(updateData)
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !product?.menuId) return
    
    await createCategoryMutation.mutateAsync({
      menuId: product.menuId,
      name: newCategoryName.trim(),
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
          {/* Always in edit mode now - no toggle needed */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
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

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      {!showNewCategory ? (
                        <div className="flex gap-2">
                          <select
                            {...register('categoryId')}
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Uncategorised</option>
                            {categories?.map(category => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setShowNewCategory(true)}
                            className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
                          >
                            + New Category
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Enter category name"
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={handleCreateCategory}
                            disabled={!newCategoryName.trim() || createCategoryMutation.isLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                          >
                            Create
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowNewCategory(false)
                              setNewCategoryName('')
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
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
                        {product?.isComposite ? (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">Pricing mode:</span>
                            <button
                              type="button"
                              onClick={() => setBundlePricingMode('bundle')}
                              className={`px-2 py-1 rounded ${
                                bundlePricingMode === 'bundle'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              Bundle Price
                            </button>
                            <button
                              type="button"
                              onClick={() => setBundlePricingMode('custom')}
                              className={`px-2 py-1 rounded ${
                                bundlePricingMode === 'custom'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              Custom Price
                            </button>
                          </div>
                        ) : (
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
                        )}
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

                      {/* Price Inputs - Only show for non-composite or custom pricing mode */}
                      {(!product?.isComposite || bundlePricingMode === 'custom') && (
                        <div>
                          {product?.isComposite && bundlePricingMode === 'custom' && (
                            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                              <strong>Custom Pricing:</strong> Setting custom prices will override the calculated bundle price.
                            </div>
                          )}
                          
                          {!product?.isComposite && (
                            <div className="flex items-center gap-2 text-xs mb-3">
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
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Base Price (Ex. TAX) *
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                disabled={!product?.isComposite && priceEditMode === 'display'}
                                {...register('basePrice', { valueAsNumber: true })}
                                className={`w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                  !product?.isComposite && priceEditMode === 'display' ? 'bg-gray-50 text-gray-500' : ''
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
                                disabled={!product?.isComposite && priceEditMode === 'base'}
                                {...register('displayPrice', { valueAsNumber: true })}
                                className={`w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                  !product?.isComposite && priceEditMode === 'base' ? 'bg-gray-50 text-gray-500' : ''
                                }`}
                              />
                              {errors.displayPrice && (
                                <p className="mt-1 text-sm text-red-600">{errors.displayPrice.message}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

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

                    {/* Bundle Price Display for Bundle Mode */}
                    {product?.isComposite && bundlePricingMode === 'bundle' && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                        <h4 className="text-sm font-medium text-green-900 mb-2">Calculated Bundle Price</h4>
                        {compositeComponents && (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between">
                              <span className="text-green-700">Base Price (Ex. Tax):</span>
                              <span className="font-semibold text-green-900">
                                £{compositeComponents.reduce((total, comp) => 
                                  total + (Number(comp.customPrice || comp.component_product.basePrice) * comp.quantity), 0
                                ).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-green-700">Display Price (Inc. Tax):</span>
                              <span className="font-semibold text-green-900">
                                £{compositeComponents.reduce((total, comp) => {
                                  const basePrice = Number(comp.customPrice || comp.component_product.basePrice)
                                  const displayPrice = selectedTaxRate 
                                    ? calculateDisplayPrice(basePrice, selectedTaxRate)
                                    : basePrice
                                  return total + (displayPrice * comp.quantity)
                                }, 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-green-600 mt-2">
                          This price is automatically calculated from the bundle components below.
                        </p>
                      </div>
                    )}

                    {/* Bundle Components - Show if this is a composite product */}
                    {product?.isComposite && (
                      <div className="border border-gray-200 rounded-lg p-4 mt-6">
                        <h3 className="text-sm font-medium text-gray-900 mb-4">Bundle Components</h3>
                        {compositeComponents && compositeComponents.length > 0 ? (
                          <div className="space-y-3">
                            {compositeComponents.map((component) => {
                              const basePrice = Number(component.customPrice || component.component_product.basePrice)
                              const displayPrice = selectedTaxRate 
                                ? calculateDisplayPrice(basePrice, selectedTaxRate)
                                : basePrice
                              
                              return (
                                <div key={component.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-gray-50">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">
                                      {component.component_product.name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      Base: £{basePrice.toFixed(2)} | Display: £{displayPrice.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs text-gray-500">Qty:</label>
                                      <input
                                        type="number"
                                        min="1"
                                        value={component.quantity}
                                        onChange={(e) => {
                                          const newQuantity = parseInt(e.target.value) || 1
                                          updateComponentQuantityMutation.mutate({
                                            compositeId: productId,
                                            componentId: component.componentId,
                                            quantity: newQuantity
                                          })
                                        }}
                                        className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
                                      />
                                    </div>
                                    <div className="text-right">
                                      <div className="font-medium text-gray-900">
                                        £{(displayPrice * component.quantity).toFixed(2)}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        (inc. tax)
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                            <div className="border-t pt-3 mt-3 bg-blue-50 rounded p-3">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex justify-between">
                                  <span className="font-medium text-gray-700">Bundle Base Total:</span>
                                  <span className="font-semibold text-gray-900">
                                    £{compositeComponents.reduce((total, comp) => 
                                      total + (Number(comp.customPrice || comp.component_product.basePrice) * comp.quantity), 0
                                    ).toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="font-medium text-gray-700">Bundle Display Total:</span>
                                  <span className="font-semibold text-gray-900">
                                    £{compositeComponents.reduce((total, comp) => {
                                      const basePrice = Number(comp.customPrice || comp.component_product.basePrice)
                                      const displayPrice = selectedTaxRate 
                                        ? calculateDisplayPrice(basePrice, selectedTaxRate)
                                        : basePrice
                                      return total + (displayPrice * comp.quantity)
                                    }, 0).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                This bundle's pricing is calculated from its components. Individual base/display prices above may differ from component totals if custom bundle pricing is set.
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">No components configured</p>
                        )}
                      </div>
                    )}

                    {/* Available Modifiers */}
                    <div className="border border-gray-200 rounded-lg p-4 mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-900">Available Modifiers</h3>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500">Show prices:</span>
                          <button
                            type="button"
                            onClick={() => setModifierPriceDisplay('base')}
                            className={`px-2 py-1 rounded ${
                              modifierPriceDisplay === 'base' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            Exc. Tax
                          </button>
                          <button
                            type="button"
                            onClick={() => setModifierPriceDisplay('display')}
                            className={`px-2 py-1 rounded ${
                              modifierPriceDisplay === 'display' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            Inc. Tax
                          </button>
                        </div>
                      </div>
                      
                      {/* Current Modifiers */}
                      {availableModifiers && availableModifiers.length > 0 ? (
                        <div className="space-y-3 mb-4">
                          {availableModifiers.map((modifier) => {
                            // Calculate the effective price: custom price if set, otherwise product's base price
                            const basePrice = roundToTwoDecimals(modifier.modifierPrice 
                              ? Number(modifier.modifierPrice)
                              : Number(modifier.modifier.basePrice))
                            
                            // Calculate display price with tax
                            const displayPrice = selectedTaxRate 
                              ? roundToTwoDecimals(calculateDisplayPrice(basePrice, selectedTaxRate))
                              : basePrice
                            
                            const showPrice = modifierPriceDisplay === 'base' ? basePrice : displayPrice
                            
                            return (
                              <div key={modifier.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-gray-50">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">
                                    {modifier.modifier.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Price ({modifierPriceDisplay === 'base' ? 'Ex. Tax' : 'Inc. Tax'}): £{showPrice.toFixed(2)}
                                    {modifier.modifierPrice && (
                                      <span className="ml-1 text-blue-600">(custom)</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={modifierPriceDisplay === 'base' ? basePrice : displayPrice}
                                    onChange={(e) => {
                                      const inputPrice = parseFloat(e.target.value) || 0
                                      let newBasePrice = inputPrice
                                      
                                      // If editing display price, convert back to base price
                                      if (modifierPriceDisplay === 'display' && selectedTaxRate) {
                                        newBasePrice = calculateBasePrice(inputPrice, selectedTaxRate)
                                      }
                                      
                                      // Round to 2 decimal places
                                      newBasePrice = roundToTwoDecimals(newBasePrice)
                                      
                                      updateModifierMutation.mutate({
                                        productId,
                                        modifierId: modifier.modifier.id,
                                        modifierPrice: newBasePrice
                                      })
                                    }}
                                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                                    placeholder="Price"
                                  />
                                  <span className="text-xs text-gray-500">{modifierPriceDisplay === 'base' ? 'exc' : 'inc'}</span>
                                  <button
                                    onClick={() => {
                                      // Reset to product's base price
                                      updateModifierMutation.mutate({
                                        productId,
                                        modifierId: modifier.modifier.id,
                                        modifierPrice: Number(modifier.modifier.basePrice)
                                      })
                                    }}
                                    className="text-blue-600 hover:text-blue-800 text-xs"
                                    title="Reset to product's base price"
                                  >
                                    Reset
                                  </button>
                                  <button
                                    onClick={() => {
                                      removeModifierMutation.mutate({
                                        productId,
                                        modifierId: modifier.modifier.id
                                      })
                                    }}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm mb-4">No modifiers configured</p>
                      )}

                      {/* Add New Modifier */}
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Add Modifier</h4>
                        <div className="space-y-2">
                          <SearchableSelect
                            options={Array.isArray(allProducts?.products) ? allProducts.products.filter(p => 
                              p.id !== productId && // Don't allow self as modifier
                              p.canBeModifier && // Only show products that can be modifiers
                              !availableModifiers?.some(mod => mod.modifier.id === p.id) // Don't show already added modifiers
                            ).map(p => ({
                              value: p.id,
                              label: p.name,
                              subtitle: `£${Number(p.basePrice).toFixed(2)} (exc. tax)${p.sku ? ` • SKU: ${p.sku}` : ''}`
                            })) : []}
                            value=""
                            onChange={(value) => {
                              if (value) {
                                addModifierMutation.mutate({
                                  productId,
                                  modifierId: value
                                })
                              }
                            }}
                            placeholder="Search products to add as modifier..."
                            className="w-full"
                          />
                          <p className="text-xs text-gray-500">
                            Search and select any existing product to enable it as a modifier for this item
                          </p>
                        </div>
                      </div>
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

                    {/* Modifier and Menu Display Options */}
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          {...register('canBeModifier')}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label className="ml-2 text-sm text-gray-700">
                          Can be used as a modifier (can be added to other products)
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          {...register('showOnMenu')}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label className="ml-2 text-sm text-gray-700">
                          Show on menu (visible to customers)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ingredients */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Ingredients</h2>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {ingredients.map((ingredient, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                        >
                          {ingredient}
                          <button
                            type="button"
                            onClick={() => {
                              setIngredients(ingredients.filter((_, i) => i !== index))
                            }}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {ingredients.length === 0 && (
                        <p className="text-gray-500 text-sm">No ingredients added yet</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add ingredient"
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const value = e.currentTarget.value.trim()
                            if (value && !ingredients.includes(value)) {
                              setIngredients([...ingredients, value])
                              e.currentTarget.value = ''
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement
                          const value = input.value.trim()
                          if (value && !ingredients.includes(value)) {
                            setIngredients([...ingredients, value])
                            input.value = ''
                          }
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>


                {/* Allergens */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Allergens (Contains)</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Select allergens that are intentionally added as ingredients (legally required declaration)
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {constants?.allergens?.map((allergen) => (
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

                {/* May Contain Allergens */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">May Contain Allergens</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Select allergens that may be present due to cross-contamination (precautionary labeling)
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {constants?.allergens?.map((allergen) => (
                      <label key={allergen} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedMayContainAllergens.includes(allergen)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMayContainAllergens([...selectedMayContainAllergens, allergen])
                            } else {
                              setSelectedMayContainAllergens(selectedMayContainAllergens.filter(a => a !== allergen))
                            }
                          }}
                          className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
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
                    {constants?.dietaryInfo?.map((info) => (
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

                {/* Nutritional Information */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Nutritional Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {NUTRITION_FIELDS.map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label} {field.unit && `(${field.unit})`}
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={nutritionInfo[field.key] || ''}
                          onChange={(e) => {
                            const value = e.target.value
                            setNutritionInfo(prev => ({
                              ...prev,
                              [field.key]: value ? parseFloat(value) : undefined
                            }))
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={field.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save Button Section */}
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving Product...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save All Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Product Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Product Information</h2>
              <div className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{product.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Category</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {product.categories?.name || 'Uncategorised'}
                  </dd>
                </div>
                {product.sku && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">SKU</dt>
                    <dd className="mt-1 text-sm text-gray-900">{product.sku}</dd>
                  </div>
                )}
                {product.barcode && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Barcode</dt>
                    <dd className="mt-1 text-sm text-gray-900">{product.barcode}</dd>
                  </div>
                )}
              </div>
            </div>

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