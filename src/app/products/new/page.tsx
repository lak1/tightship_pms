'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DashboardLayout from '@/components/layout/dashboard-layout'
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

// Price calculation utilities - EXACT COPY from product detail page
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

const baseProductSchema = z.object({
  menuId: z.string().min(1, 'Please select a menu'),
  categoryId: z.string().optional(),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  taxRateId: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  priceControl: z.enum(['MANUAL', 'FORMULA', 'MARKET']).default('MANUAL'),
  ingredients: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  dietaryInfo: z.array(z.string()).default([]),
  nutritionInfo: nutritionalInfoSchema,
  canBeModifier: z.boolean().default(false),
  showOnMenu: z.boolean().default(true),
})

const simpleProductSchema = baseProductSchema.extend({
  basePrice: z.number().min(0, 'Price must be 0 or greater'),
  displayPrice: z.number().optional(),
})

const compositeProductSchema = baseProductSchema.extend({
  basePrice: z.union([z.number(), z.nan()]).optional().transform(val => val !== val ? undefined : val), // Handle NaN from empty fields
  displayPrice: z.union([z.number(), z.nan()]).optional().transform(val => val !== val ? undefined : val), // Handle NaN from empty fields
})

type ProductFormData = z.infer<typeof simpleProductSchema>

export default function NewProductPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [ingredients, setIngredients] = useState<string[]>([])
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([])
  const [selectedDietaryInfo, setSelectedDietaryInfo] = useState<string[]>([])
  const [nutritionInfo, setNutritionInfo] = useState<any>({})
  const [productType, setProductType] = useState<'simple' | 'composite'>('simple')
  const [compositeComponents, setCompositeComponents] = useState<Array<{
    productId: string
    quantity: number
  }>>([])
  const [useCustomPrice, setUseCustomPrice] = useState(false)
  const [customPrice, setCustomPrice] = useState<number>(0)
  const [priceEditMode, setPriceEditMode] = useState<'base' | 'display'>('base')
  const [maintainPrice, setMaintainPrice] = useState<'base' | 'display'>('display')

  const { data: restaurants, isLoading: restaurantsLoading } = trpc.restaurant.list.useQuery(
    undefined,
    { enabled: !!session }
  )

  const { data: constants } = trpc.product.getConstants.useQuery()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(compositeProductSchema), // Always use composite schema (less restrictive)
  })
  
  // Clear price field errors when switching to composite type
  useEffect(() => {
    if (productType === 'composite') {
      clearErrors(['basePrice', 'displayPrice'])
    }
  }, [productType, clearErrors])

  const selectedMenuId = watch('menuId')
  const watchedTaxRateId = watch('taxRateId')
  const watchedBasePrice = watch('basePrice')
  const watchedDisplayPrice = watch('displayPrice')

  // Get categories for the selected menu
  const selectedMenu = restaurants
    ?.flatMap(r => r.menus)
    .find(m => m.id === selectedMenuId)

  // Find the restaurant that contains the selected menu
  const selectedRestaurant = restaurants
    ?.find(r => r.menus.some(m => m.id === selectedMenuId))

  // Get tax rates for the selected restaurant
  const { data: taxRates } = trpc.product.getTaxRates.useQuery(
    { restaurantId: selectedRestaurant?.id || '' },
    { enabled: !!selectedRestaurant?.id }
  )

  // Find selected tax rate
  const selectedTaxRate = taxRates?.find(t => t.id === watchedTaxRateId)

  // Sync prices when tax rate or price edit mode changes
  useEffect(() => {
    if (watchedTaxRateId && selectedTaxRate && maintainPrice === 'display') {
      if (priceEditMode === 'base' && watchedBasePrice != null) {
        const newDisplayPrice = calculateDisplayPrice(watchedBasePrice, selectedTaxRate)
        setValue('displayPrice', newDisplayPrice)
      } else if (priceEditMode === 'display' && watchedDisplayPrice != null) {
        const newBasePrice = calculateBasePrice(watchedDisplayPrice, selectedTaxRate)
        setValue('basePrice', newBasePrice)
      }
    }
  }, [watchedTaxRateId, maintainPrice, watchedBasePrice, watchedDisplayPrice, selectedTaxRate, setValue, priceEditMode])

  // Handle tax rate changes with maintain price logic
  useEffect(() => {
    if (watchedTaxRateId && taxRates) {
      const taxRate = taxRates.find(t => t.id === watchedTaxRateId)
      if (taxRate) {
        if (maintainPrice === 'display' && watchedDisplayPrice != null) {
          const newBasePrice = calculateBasePrice(watchedDisplayPrice, taxRate)
          setValue('basePrice', newBasePrice)
        } else if (maintainPrice === 'base' && watchedBasePrice != null) {
          const newDisplayPrice = calculateDisplayPrice(watchedBasePrice, taxRate)
          setValue('displayPrice', newDisplayPrice)
        }
      }
    }
  }, [watchedTaxRateId, maintainPrice, watchedBasePrice, watchedDisplayPrice, taxRates, setValue])

  // Get existing products for composite selection
  const { data: allProducts } = trpc.product.list.useQuery(
    { 
      restaurantId: selectedRestaurant?.id || '',
      limit: 1000 // Get all products for dropdown
    },
    { enabled: !!selectedRestaurant?.id }
  )

  const createProductMutation = trpc.product.create.useMutation({
    onSuccess: () => {
      router.push('/products')
    },
    onError: (error: any) => {
      console.error('Error creating product:', error)
      alert('Failed to create product. Please try again.')
    }
  })

  const createCompositeMutation = trpc.product.createComposite.useMutation({
    onSuccess: () => {
      router.push('/products')
    },
    onError: (error: any) => {
      console.error('Error creating composite product:', error)
      alert('Failed to create composite product. Please try again.')
    }
  })

  const onSubmit = async (data: ProductFormData) => {
    console.log('Form submitted with:', { data, productType, compositeComponents, useCustomPrice, customPrice })
    
    if (productType === 'simple') {
      await createProductMutation.mutateAsync({
        ...data,
        ingredients,
        allergens: selectedAllergens,
        dietaryInfo: selectedDietaryInfo,
        nutritionInfo: Object.keys(nutritionInfo).length > 0 ? nutritionInfo : undefined,
        canBeModifier: data.canBeModifier,
        showOnMenu: data.showOnMenu,
        taxRateId: data.taxRateId,
      })
    } else {
      // Create composite product
      if (compositeComponents.length === 0) {
        alert('Please add at least one component to the composite product')
        return
      }
      
      const payload = {
        name: data.name,
        description: data.description,
        menuId: data.menuId,
        categoryId: data.categoryId,
        taxRateId: data.taxRateId,
        components: compositeComponents,
        customPrice: useCustomPrice ? customPrice : undefined,
        sku: data.sku,
        barcode: data.barcode,
      }
      
      console.log('Creating composite with payload:', payload)
      
      try {
        await createCompositeMutation.mutateAsync(payload)
      } catch (error) {
        console.error('Error creating composite:', error)
      }
    }
  }

  // Calculate total price from components
  const calculateTotalPrice = (includeTax: boolean = false) => {
    if (!allProducts?.products) return 0
    return roundToTwoDecimals(compositeComponents.reduce((total, component) => {
      const product = allProducts.products.find(p => p.id === component.productId)
      if (product) {
        // Use the product's base price
        const effectivePrice = Number(product.basePrice)
        let finalPrice = effectivePrice
        
        // Include tax if requested and tax rate is selected
        if (includeTax && selectedTaxRate) {
          finalPrice = calculateDisplayPrice(effectivePrice, selectedTaxRate)
        }
        
        return total + (roundToTwoDecimals(finalPrice) * component.quantity)
      }
      return total
    }, 0))
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
        <form onSubmit={(e) => {
          console.log('Form onSubmit event triggered!')
          console.log('About to call handleSubmit with productType:', productType)
          
          const submitHandler = handleSubmit(
            (data) => {
              console.log('handleSubmit SUCCESS - calling onSubmit with data:', data)
              onSubmit(data)
            },
            (errors) => {
              console.log('handleSubmit FAILED - validation errors:', errors)
            }
          )
          
          return submitHandler(e)
        }} className="space-y-8">
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

              {/* Product Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="productType"
                      value="simple"
                      checked={productType === 'simple'}
                      onChange={(e) => setProductType(e.target.value as 'simple' | 'composite')}
                      className="mr-2"
                    />
                    <span className="text-sm">Simple Product</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="productType"
                      value="composite"
                      checked={productType === 'composite'}
                      onChange={(e) => setProductType(e.target.value as 'simple' | 'composite')}
                      className="mr-2"
                    />
                    <span className="text-sm">Composite Product (Bundle)</span>
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {productType === 'simple' 
                    ? 'A single product like "Cod" or "Chips"'
                    : 'A bundle of multiple products like "Cod & Chips"'
                  }
                </p>
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

              {/* Pricing - Simple Products Only */}
              {productType === 'simple' && (
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
                          priceEditMode === 'display' ? 'bg-gray-50' : ''
                        }`}
                        placeholder="0.00"
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
                          priceEditMode === 'base' ? 'bg-gray-50' : ''
                        }`}
                        placeholder={selectedTaxRate && watchedBasePrice ? 
                          roundToTwoDecimals(calculateDisplayPrice(watchedBasePrice, selectedTaxRate)).toFixed(2) : 
                          "0.00"
                        }
                      />
                      <div className="mt-1 text-xs text-gray-500">
                        {selectedTaxRate ? `Includes ${(selectedTaxRate.rate * 100).toFixed(0)}% ${selectedTaxRate.name}` : 'No tax applied'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Composite Product Components */}
              {productType === 'composite' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bundle Components
                  </label>
                  <div className="space-y-4">
                    {compositeComponents.map((component, index) => {
                      return (
                        <div key={index} className="flex items-center gap-2 p-3 border border-gray-200 rounded-md">
                          <SearchableSelect
                            value={component.productId}
                            onChange={(value) => {
                              const newComponents = [...compositeComponents]
                              newComponents[index].productId = value
                              setCompositeComponents(newComponents)
                            }}
                            options={Array.isArray(allProducts?.products) ? allProducts.products
                              .filter(p => !p.isComposite)
                              .map(p => {
                                const basePrice = Number(p.basePrice)
                                const displayPrice = selectedTaxRate ? 
                                  roundToTwoDecimals(calculateDisplayPrice(basePrice, selectedTaxRate)) : 
                                  roundToTwoDecimals(basePrice)
                                const priceLabel = selectedTaxRate ? 
                                  `£${displayPrice.toFixed(2)} (inc. ${(selectedTaxRate.rate * 100).toFixed(0)}% tax)` :
                                  `£${displayPrice.toFixed(2)} (excl. tax)`
                                return {
                                  value: p.id,
                                  label: p.name,
                                  subtitle: priceLabel
                                }
                              }) : []}
                            placeholder="Select product"
                            className="flex-1"
                          />
                          <input
                            type="number"
                            min="1"
                            value={component.quantity}
                            onChange={(e) => {
                              const newComponents = [...compositeComponents]
                              newComponents[index].quantity = parseInt(e.target.value) || 1
                              setCompositeComponents(newComponents)
                            }}
                            className="w-16 border border-gray-300 rounded-md px-2 py-1"
                            placeholder="Qty"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCompositeComponents(compositeComponents.filter((_, i) => i !== index))
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        </div>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setCompositeComponents([...compositeComponents, { productId: '', quantity: 1 }])
                      }}
                      className="w-full py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400"
                    >
                      + Add Component
                    </button>
                  </div>

                  {/* Bundle Tax Rate Selection */}
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Bundle Tax Settings</h4>
                    <p className="text-xs text-blue-700 mb-3">Select the tax rate that will apply to this bundle. This affects both component pricing and final bundle pricing.</p>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tax Rate
                      </label>
                      <select
                        value={watchedTaxRateId || ''}
                        onChange={(e) => setValue('taxRateId', e.target.value || undefined)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value="">No Tax</option>
                        {taxRates?.map(taxRate => (
                          <option key={taxRate.id} value={taxRate.id}>
                            {taxRate.name} ({(taxRate.rate * 100).toFixed(0)}%)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Bundle Pricing Options */}
                  <div className="mt-4 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Bundle Pricing Method</h4>
                        <p className="text-xs text-gray-500 mt-1">Choose how to calculate the final bundle price</p>
                      </div>
                      {useCustomPrice && (
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

                    {/* Maintain Price Toggle for Custom Price */}
                    {selectedTaxRate && useCustomPrice && (
                      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-green-700 font-medium">When changing tax, maintain:</span>
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
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={!useCustomPrice}
                            onChange={() => setUseCustomPrice(false)}
                            className="mr-2"
                          />
                          <span className="text-sm">
                            Use sum of components 
                            {selectedTaxRate ? (
                              <>
                                <br />
                                <span className="text-gray-600">£{calculateTotalPrice(false).toFixed(2)} (excl. tax) / £{calculateTotalPrice(true).toFixed(2)} (inc. {(selectedTaxRate.rate * 100).toFixed(0)}% tax)</span>
                              </>
                            ) : (
                              <span className="text-gray-600"> (£{calculateTotalPrice().toFixed(2)} excl. tax)</span>
                            )}
                          </span>
                        </label>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={useCustomPrice}
                            onChange={() => setUseCustomPrice(true)}
                            className="mr-2"
                          />
                          <span className="text-sm">Set custom price:</span>
                        </label>
                      </div>
                      
                      {useCustomPrice && (
                        <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Base Price (Ex. TAX)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              disabled={priceEditMode === 'display'}
                              value={priceEditMode === 'base' ? customPrice : 
                                (selectedTaxRate ? calculateBasePrice(customPrice, selectedTaxRate) : customPrice)}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0
                                if (priceEditMode === 'base') {
                                  setCustomPrice(value)
                                  if (selectedTaxRate) {
                                    // Update display price based on base price
                                    const displayPrice = calculateDisplayPrice(value, selectedTaxRate)
                                    // Note: We're not storing display price separately for composite
                                  }
                                }
                              }}
                              className={`w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                priceEditMode === 'display' ? 'bg-gray-50' : ''
                              }`}
                              placeholder="0.00"
                            />
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
                              value={priceEditMode === 'display' ? customPrice : 
                                (selectedTaxRate ? calculateDisplayPrice(customPrice, selectedTaxRate) : customPrice)}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0
                                if (priceEditMode === 'display') {
                                  setCustomPrice(selectedTaxRate ? calculateBasePrice(value, selectedTaxRate) : value)
                                }
                              }}
                              className={`w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                priceEditMode === 'base' ? 'bg-gray-50' : ''
                              }`}
                              placeholder={selectedTaxRate && customPrice ? 
                                roundToTwoDecimals(calculateDisplayPrice(customPrice, selectedTaxRate)).toFixed(2) : 
                                "0.00"
                              }
                            />
                            <div className="mt-1 text-xs text-gray-500">
                              {selectedTaxRate ? `Includes ${(selectedTaxRate.rate * 100).toFixed(0)}% ${selectedTaxRate.name}` : 'No tax applied'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                    defaultChecked={true}
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
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add an ingredient"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const value = (e.target as HTMLInputElement).value.trim()
                      if (value && !ingredients.includes(value)) {
                        setIngredients([...ingredients, value])
                        ;(e.target as HTMLInputElement).value = ''
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Add an ingredient"]') as HTMLInputElement
                    const value = input.value.trim()
                    if (value && !ingredients.includes(value)) {
                      setIngredients([...ingredients, value])
                      input.value = ''
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              {ingredients.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ingredients.map((ingredient, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {ingredient}
                      <button
                        type="button"
                        onClick={() => setIngredients(ingredients.filter((_, i) => i !== index))}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Allergens */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Allergens</h2>
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
            <h2 className="text-lg font-medium text-gray-900 mb-6">Nutritional Information (Optional)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Primary nutrients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Calories (kcal)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={nutritionInfo.calories || ''}
                  onChange={(e) => setNutritionInfo({...nutritionInfo, calories: e.target.value ? Number(e.target.value) : undefined})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Protein (g)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={nutritionInfo.protein || ''}
                  onChange={(e) => setNutritionInfo({...nutritionInfo, protein: e.target.value ? Number(e.target.value) : undefined})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Carbohydrates (g)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={nutritionInfo.carbohydrates || ''}
                  onChange={(e) => setNutritionInfo({...nutritionInfo, carbohydrates: e.target.value ? Number(e.target.value) : undefined})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Fat (g)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={nutritionInfo.fat || ''}
                  onChange={(e) => setNutritionInfo({...nutritionInfo, fat: e.target.value ? Number(e.target.value) : undefined})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Saturated Fat (g)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={nutritionInfo.saturatedFat || ''}
                  onChange={(e) => setNutritionInfo({...nutritionInfo, saturatedFat: e.target.value ? Number(e.target.value) : undefined})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sugar (g)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={nutritionInfo.sugar || ''}
                  onChange={(e) => setNutritionInfo({...nutritionInfo, sugar: e.target.value ? Number(e.target.value) : undefined})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fiber (g)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={nutritionInfo.fiber || ''}
                  onChange={(e) => setNutritionInfo({...nutritionInfo, fiber: e.target.value ? Number(e.target.value) : undefined})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sodium (mg)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={nutritionInfo.sodium || ''}
                  onChange={(e) => setNutritionInfo({...nutritionInfo, sodium: e.target.value ? Number(e.target.value) : undefined})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Serving Size
                </label>
                <input
                  type="text"
                  value={nutritionInfo.servingSize || ''}
                  onChange={(e) => setNutritionInfo({...nutritionInfo, servingSize: e.target.value || undefined})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 100g, 1 portion"
                />
              </div>
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
              onClick={() => {
                console.log('Button clicked!')
                console.log('Product type:', productType)
                console.log('Composite components:', compositeComponents)
                console.log('Form errors:', errors)
                console.log('Form is valid:', Object.keys(errors).length === 0)
              }}
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
                  {productType === 'simple' ? 'Create Product' : 'Create Bundle'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}