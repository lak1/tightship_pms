'use client'

import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Download, Printer, Eye, EyeOff } from 'lucide-react'

const UK_ALLERGENS = [
  'Cereals containing gluten',
  'Crustaceans',
  'Eggs',
  'Fish',
  'Peanuts',
  'Soybeans',
  'Milk',
  'Tree nuts',
  'Celery',
  'Mustard',
  'Sesame seeds',
  'Sulphites',
  'Lupin',
  'Molluscs',
]

export default function AllergenMatrixPage() {
  const { data: session } = useSession()
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [includeCategories, setIncludeCategories] = useState(true)
  const [includeMayContain, setIncludeMayContain] = useState(true)
  const [selectAll, setSelectAll] = useState(true)
  const matrixRef = useRef<HTMLDivElement>(null)

  const { data: restaurants } = trpc.restaurant.list.useQuery(undefined, {
    enabled: !!session
  })

  const { data: products } = trpc.product.list.useQuery(
    { 
      restaurantId: selectedRestaurantId,
      limit: 1000 
    },
    { enabled: !!selectedRestaurantId }
  )

  const { data: matrixData, refetch: generateMatrix } = trpc.product.generateAllergenMatrix.useQuery(
    {
      restaurantId: selectedRestaurantId,
      productIds: selectAll ? undefined : selectedProducts,
      includeCategories,
      includeMayContain,
    },
    { 
      enabled: false // Manual trigger only
    }
  )

  const handleRestaurantChange = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId)
    setSelectedProducts([])
    setSelectAll(true)
  }

  const handleProductSelection = (productId: string, selected: boolean) => {
    if (selected) {
      setSelectedProducts(prev => [...prev, productId])
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId))
    }
    setSelectAll(false)
  }

  const handleSelectAllToggle = () => {
    if (selectAll) {
      setSelectAll(false)
      setSelectedProducts([])
    } else {
      setSelectAll(true)
      setSelectedProducts(products?.products.map(p => p.id) || [])
    }
  }

  const handleGenerateMatrix = () => {
    if (selectedRestaurantId) {
      generateMatrix()
    }
  }

  const handlePrint = () => {
    if (matrixRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Allergen Matrix</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; font-size: 10px; }
                th, td { border: 1px solid #ccc; padding: 4px; text-align: center; }
                th { background-color: #f5f5f5; font-weight: bold; }
                .product-name { text-align: left; font-weight: bold; min-width: 150px; }
                .category { background-color: #e6f3ff; }
                .allergen-header { writing-mode: vertical-rl; text-orientation: mixed; min-width: 25px; }
                .contains { color: #22c55e; font-weight: bold; }
                .may-contain { color: #f59e0b; }
                .both { color: #22c55e; font-weight: bold; }
                @media print {
                  body { margin: 10px; }
                  table { font-size: 8px; }
                }
              </style>
            </head>
            <body>
              ${matrixRef.current.innerHTML}
              <div style="margin-top: 20px; font-size: 10px;">
                <p><strong>Legend:</strong></p>
                <p>✓ = Contains allergen (legally declared)</p>
                <p>(✓) = May contain allergen (cross-contamination risk)</p>
                <p>✓ (✓) = Contains and may contain allergen</p>
                <p style="margin-top: 10px; font-style: italic;">
                  All food is cooked in the same oil. Allergens in brackets may be present in the food.
                  For further information please speak to a member of staff.
                </p>
                <p style="margin-top: 10px; font-size: 8px; color: #666;">
                  Generated: ${new Date().toLocaleString('en-GB')} | 
                  Compliant with UK SFBB and Natasha's Law requirements
                </p>
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const exportToCsv = () => {
    if (!matrixData) return

    const csvRows = []
    
    // Headers
    const headers = ['Product', 'Category', ...UK_ALLERGENS]
    csvRows.push(headers.join(','))

    // Data rows
    matrixData.products.forEach(product => {
      const row = [
        `"${product.productName}"`,
        `"${product.category}"`,
        ...UK_ALLERGENS.map(allergen => `"${product[allergen] || ''}"`)
      ]
      csvRows.push(row.join(','))
    })

    const csvString = csvRows.join('\n')
    const blob = new Blob([csvString], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `allergen-matrix-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
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
      title="Allergen Matrix Generator"
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Allergen Matrix' }
      ]}
    >
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Configuration Panel */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Matrix Configuration</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Restaurant Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Restaurant
              </label>
              <select
                value={selectedRestaurantId}
                onChange={(e) => handleRestaurantChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a restaurant</option>
                {restaurants?.map(restaurant => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Matrix Options
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeCategories}
                    onChange={(e) => setIncludeCategories(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Group by categories</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeMayContain}
                    onChange={(e) => setIncludeMayContain(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include "may contain" allergens</span>
                </label>
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <button
                onClick={handleGenerateMatrix}
                disabled={!selectedRestaurantId}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Matrix
              </button>
            </div>
          </div>
        </div>

        {/* Product Selection */}
        {products && products.products.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Product Selection</h3>
              <button
                onClick={handleSelectAllToggle}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                {selectAll ? (
                  <>
                    <EyeOff className="mr-1 h-4 w-4" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Eye className="mr-1 h-4 w-4" />
                    Select All
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
              {products.products.map(product => (
                <label key={product.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectAll || selectedProducts.includes(product.id)}
                    onChange={(e) => handleProductSelection(product.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{product.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Matrix Display */}
        {matrixData && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Allergen Matrix ({matrixData.metadata.totalProducts} products)
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={exportToCsv}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Matrix
                </button>
              </div>
            </div>

            <div ref={matrixRef} className="overflow-x-auto">
              <h1 className="text-xl font-bold text-center mb-4">ALLERGEN INFORMATION</h1>
              
              <table className="min-w-full border-collapse border border-gray-300 text-xs">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-2 bg-gray-50 text-left font-bold">
                      Food
                    </th>
                    {includeCategories && (
                      <th className="border border-gray-300 p-2 bg-gray-50 text-left font-bold">
                        Category
                      </th>
                    )}
                    {UK_ALLERGENS.map(allergen => (
                      <th
                        key={allergen}
                        className="border border-gray-300 p-1 bg-gray-50 text-center font-bold min-w-[60px]"
                        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                      >
                        {allergen.replace('Cereals containing ', '').replace('containing', '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixData.products.map((product, index) => (
                    <tr key={product.productId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 p-2 text-left font-medium">
                        {product.productName}
                      </td>
                      {includeCategories && (
                        <td className="border border-gray-300 p-2 text-left text-gray-600">
                          {product.category}
                        </td>
                      )}
                      {UK_ALLERGENS.map(allergen => {
                        const value = product[allergen] || ''
                        const className = value.includes('✓ (✓)') 
                          ? 'text-green-600 font-bold'
                          : value.includes('(✓)')
                            ? 'text-yellow-600'
                            : value.includes('✓')
                              ? 'text-green-600 font-bold'
                              : 'text-gray-300'
                        
                        return (
                          <td
                            key={allergen}
                            className={`border border-gray-300 p-1 text-center ${className}`}
                          >
                            {value}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-6 text-xs text-gray-600">
                <p className="font-semibold mb-2">All food is cooked in the same oil.</p>
                <p className="mb-2">Allergens in brackets may be present in the food.</p>
                <p className="text-right italic">For further information please speak to a member of staff.</p>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="font-semibold mb-2">Legend:</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <p><span className="text-green-600 font-bold">✓</span> = Contains allergen (legally declared)</p>
                    <p><span className="text-yellow-600">(✓)</span> = May contain allergen (cross-contamination risk)</p>
                    <p><span className="text-green-600 font-bold">✓ (✓)</span> = Contains and may contain allergen</p>
                  </div>
                  <p className="text-right text-gray-500 mt-2">
                    Generated: {new Date().toLocaleString('en-GB')} | Compliant with UK SFBB and Natasha's Law
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}