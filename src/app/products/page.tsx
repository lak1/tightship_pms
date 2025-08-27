'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'
import { Search, Plus, ChevronLeft, ChevronRight, Upload, Edit, Check, X } from 'lucide-react'
import DashboardLayout from '@/components/layout/dashboard-layout'

export default function ProductsPage() {
  const { data: session, status } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedRestaurant, setSelectedRestaurant] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showDisplayPrice, setShowDisplayPrice] = useState(false)
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const [editingPrice, setEditingPrice] = useState('')
  const itemsPerPage = 20

  // Fetch restaurants to get their menus
  const { data: restaurants } = trpc.restaurant.list.useQuery(
    undefined,
    { enabled: !!session }
  )

  // Get all products from all restaurants
  const restaurantQueries = trpc.useQueries((t) =>
    restaurants?.map(restaurant => 
      t.product.list({
        restaurantId: restaurant.id,
        search: searchTerm || undefined,
        categoryId: selectedCategory || undefined,
        page: 1,
        limit: 1000, // Get all for now
      }, {
        enabled: !!restaurant.id,
      })
    ) ?? []
  )

  // Helper function to calculate display price
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

  // Helper function to calculate base price from display price
  const calculateBasePrice = (displayPrice: number, taxRate?: { rate: number | string } | null) => {
    const rawRate = taxRate?.rate
    const rate = typeof rawRate === 'string' 
      ? parseFloat(rawRate) 
      : typeof rawRate === 'number' 
        ? rawRate 
        : rawRate ? Number(rawRate) : 0
    return displayPrice / (1 + rate)
  }

  const utils = trpc.useUtils()

  // Mutation for updating product price
  const updateProductMutation = trpc.product.update.useMutation({
    onSuccess: () => {
      setEditingProduct(null)
      setEditingPrice('')
      // Refetch products
      utils.product.list.invalidate()
    },
    onError: (error) => {
      console.error('Error updating product price:', error)
      alert('Failed to update product price. Please try again.')
    }
  })

  // Start editing a product price
  const startEditing = (product: any) => {
    setEditingProduct(product.id)
    const price = showDisplayPrice ? product.displayPrice : parseFloat(product.basePrice)
    setEditingPrice(price.toFixed(2))
  }

  // Save the edited price
  const savePrice = (product: any) => {
    const newPrice = parseFloat(editingPrice)
    if (isNaN(newPrice) || newPrice < 0) {
      alert('Please enter a valid price')
      return
    }

    const updateData: any = { id: product.id }
    
    if (showDisplayPrice) {
      // User edited display price, calculate new base price
      const newBasePrice = calculateBasePrice(newPrice, product.tax_rates)
      updateData.basePrice = newBasePrice
    } else {
      // User edited base price directly
      updateData.basePrice = newPrice
    }

    updateProductMutation.mutate(updateData)
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingProduct(null)
    setEditingPrice('')
  }

  // Combine all products from all restaurants
  const allProducts = useMemo(() => {
    const products: Array<any> = []
    restaurantQueries.forEach((query, index) => {
      if (query.data?.products) {
        query.data.products.forEach(product => {
          products.push({
            ...product,
            restaurantName: restaurants?.[index]?.name,
            restaurantId: restaurants?.[index]?.id,
            displayPrice: calculateDisplayPrice(product.basePrice, product.tax_rates),
          })
        })
      }
    })
    return products
  }, [restaurantQueries, restaurants])

  // Filter products based on selected restaurant
  const filteredProducts = useMemo(() => {
    if (!selectedRestaurant) return allProducts
    return allProducts.filter(product => product.restaurantId === selectedRestaurant)
  }, [allProducts, selectedRestaurant])

  // Get unique categories from all products
  const categories = useMemo(() => {
    const categorySet = new Set<string>()
    allProducts.forEach(product => {
      if (product.category?.name) {
        categorySet.add(product.category.name)
      }
    })
    return Array.from(categorySet)
  }, [allProducts])

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const isLoading = status === 'loading' || restaurantQueries.some(q => q.isLoading)

  if (status === 'loading') {
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
      title="Products"
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Products' }
      ]}
    >
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            Manage your menu items across all restaurants
          </p>
          <div className="flex gap-3 items-center">
            {/* Price Display Toggle */}
            <div className="flex items-center gap-2 mr-2 px-3 py-1 bg-gray-100 rounded-md">
              <span className="text-sm text-gray-600">Prices:</span>
              <button
                onClick={() => setShowDisplayPrice(!showDisplayPrice)}
                className={`px-2 py-1 text-sm rounded ${
                  !showDisplayPrice 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500'
                }`}
              >
                Ex. TAX
              </button>
              <button
                onClick={() => setShowDisplayPrice(!showDisplayPrice)}
                className={`px-2 py-1 text-sm rounded ${
                  showDisplayPrice 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500'
                }`}
              >
                Inc. TAX
              </button>
            </div>
            <Link
              href="/products/import"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Upload className="mr-2 h-4 w-4" />
              Import Products
            </Link>
            <Link
              href="/products/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Restaurant Filter */}
            <select
              value={selectedRestaurant}
              onChange={(e) => setSelectedRestaurant(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Restaurants</option>
              {restaurants?.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Products List */}
        <div className="bg-white shadow rounded-lg">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">Loading products...</div>
            </div>
          ) : paginatedProducts.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Restaurant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Base Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            {product.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {product.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {product.restaurantName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {product.category?.name || 'Uncategorized'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingProduct === product.id ? (
                            <div className="flex items-center space-x-2">
                              <div className="flex flex-col">
                                <div className="flex items-center">
                                  <span className="text-sm text-gray-600 mr-1">£</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editingPrice}
                                    onChange={(e) => setEditingPrice(e.target.value)}
                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') savePrice(product)
                                      if (e.key === 'Escape') cancelEditing()
                                    }}
                                    autoFocus
                                  />
                                  <span className="text-xs text-gray-500 ml-1">
                                    {showDisplayPrice ? 'Inc' : 'Ex'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {showDisplayPrice 
                                    ? `Ex: £${calculateBasePrice(parseFloat(editingPrice) || 0, product.tax_rates).toFixed(2)}`
                                    : `Inc: £${calculateDisplayPrice(parseFloat(editingPrice) || 0, product.tax_rates).toFixed(2)}`}
                                </div>
                              </div>
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => savePrice(product)}
                                  disabled={updateProductMutation.isLoading}
                                  className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  disabled={updateProductMutation.isLoading}
                                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              className="text-sm text-gray-900 cursor-pointer hover:bg-gray-50 p-1 rounded group"
                              onClick={() => startEditing(product)}
                            >
                              <div className="flex items-center">
                                <span className="font-medium">
                                  £{showDisplayPrice 
                                    ? product.displayPrice.toFixed(2)
                                    : parseFloat(product.basePrice).toFixed(2)}
                                </span>
                                <span className="text-xs text-gray-500 ml-1">
                                  {showDisplayPrice ? 'Inc' : 'Ex'}
                                </span>
                                <Edit className="h-3 w-3 text-gray-400 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <div className="text-xs text-gray-500">
                                {showDisplayPrice 
                                  ? `Ex: £${parseFloat(product.basePrice).toFixed(2)}`
                                  : `Inc: £${product.displayPrice.toFixed(2)}`}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/products/${product.id}`}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/products/${product.id}`}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of{' '}
                    {filteredProducts.length} products
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-5m-11 0h5m-5 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || selectedCategory || selectedRestaurant
                    ? 'Try adjusting your filters or search terms.'
                    : 'Get started by creating your first product or importing from a file.'}
                </p>
                <div className="flex justify-center gap-3">
                  <Link
                    href="/products/import"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Import Products
                  </Link>
                  <Link
                    href="/products/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}