'use client'

import { useState } from 'react'
import { useRestaurantMenu } from '@/contexts/RestaurantMenuContext'
import { trpc } from '@/lib/trpc'
import * as fabric from 'fabric'
import { MenuItemComponent, MenuItemData } from './MenuItemComponent'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ProfessionalMenuCreatorProps {
  canvas: fabric.Canvas | null
  onMenuCreated?: () => void
}

export default function ProfessionalMenuCreator({ canvas, onMenuCreated }: ProfessionalMenuCreatorProps) {
  const { selectedRestaurant, selectedMenu } = useRestaurantMenu()
  const [selectedLayout, setSelectedLayout] = useState<'elegant' | 'classic' | 'modern' | 'compact'>('elegant')
  const [selectedColumns, setSelectedColumns] = useState<1 | 2>(1)

  // Fetch products from the database
  const { data: productResponse, isLoading: productsLoading } = trpc.product.list.useQuery(
    {
      restaurantId: selectedRestaurant?.id || '',
      menuId: selectedMenu?.id || '',
      limit: 500
    },
    {
      enabled: !!selectedRestaurant?.id && !!selectedMenu?.id,
      refetchInterval: 30000,
    }
  )

  // Layout style configurations
  const getLayoutStyles = (layout: string) => {
    const baseStyles = {
      elegant: {
        restaurantName: {
          fontSize: 32,
          fontFamily: 'Georgia',
          fontWeight: 'bold',
          fill: '#2c3e50',
          textAlign: 'center' as fabric.TextAlignType
        },
        sectionHeader: {
          fontSize: 20,
          fontFamily: 'Georgia',
          fontWeight: 'bold',
          fill: '#8b4513',
          textAlign: 'left' as fabric.TextAlignType
        },
        itemName: {
          fontSize: 16,
          fontFamily: 'Georgia',
          fontWeight: 'normal',
          fill: '#2c3e50'
        },
        itemPrice: {
          fontSize: 16,
          fontFamily: 'Georgia',
          fontWeight: 'bold',
          fill: '#1a1a1a'
        },
        itemDescription: {
          fontSize: 12,
          fontFamily: 'Georgia',
          fontWeight: 'normal',
          fill: '#666666',
          fontStyle: 'italic'
        },
        decorativeColor: '#8b4513',
        backgroundColor: '#ffffff'
      },
      classic: {
        restaurantName: {
          fontSize: 30,
          fontFamily: 'Times New Roman',
          fontWeight: 'bold',
          fill: '#1a1a1a',
          textAlign: 'center' as fabric.TextAlignType
        },
        sectionHeader: {
          fontSize: 18,
          fontFamily: 'Times New Roman',
          fontWeight: 'bold',
          fill: '#1a1a1a',
          textAlign: 'left' as fabric.TextAlignType
        },
        itemName: {
          fontSize: 14,
          fontFamily: 'Times New Roman',
          fontWeight: 'normal',
          fill: '#1a1a1a'
        },
        itemPrice: {
          fontSize: 14,
          fontFamily: 'Times New Roman',
          fontWeight: 'bold',
          fill: '#1a1a1a'
        },
        itemDescription: {
          fontSize: 11,
          fontFamily: 'Times New Roman',
          fontWeight: 'normal',
          fill: '#555555',
          fontStyle: 'italic'
        },
        decorativeColor: '#1a1a1a',
        backgroundColor: '#ffffff'
      },
      modern: {
        restaurantName: {
          fontSize: 28,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          fill: '#e74c3c',
          textAlign: 'center' as fabric.TextAlignType
        },
        sectionHeader: {
          fontSize: 16,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          fill: '#2c3e50',
          textAlign: 'left' as fabric.TextAlignType
        },
        itemName: {
          fontSize: 14,
          fontFamily: 'Arial',
          fontWeight: 'normal',
          fill: '#2c3e50'
        },
        itemPrice: {
          fontSize: 14,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          fill: '#e74c3c'
        },
        itemDescription: {
          fontSize: 11,
          fontFamily: 'Arial',
          fontWeight: 'normal',
          fill: '#7f8c8d',
          fontStyle: 'normal'
        },
        decorativeColor: '#e74c3c',
        backgroundColor: '#ffffff'
      },
      compact: {
        restaurantName: {
          fontSize: 24,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          fill: '#2c3e50',
          textAlign: 'center' as fabric.TextAlignType
        },
        sectionHeader: {
          fontSize: 14,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          fill: '#34495e',
          textAlign: 'left' as fabric.TextAlignType
        },
        itemName: {
          fontSize: 12,
          fontFamily: 'Arial',
          fontWeight: 'normal',
          fill: '#2c3e50'
        },
        itemPrice: {
          fontSize: 12,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          fill: '#e74c3c'
        },
        itemDescription: {
          fontSize: 10,
          fontFamily: 'Arial',
          fontWeight: 'normal',
          fill: '#7f8c8d',
          fontStyle: 'normal'
        },
        decorativeColor: '#34495e',
        backgroundColor: '#ffffff'
      }
    }
    return baseStyles[layout as keyof typeof baseStyles] || baseStyles.elegant
  }

  const createProfessionalMenu = async () => {
    if (!canvas || !selectedRestaurant || !productResponse?.products) return

    // Clear the canvas
    canvas.clear()

    // Set canvas to A4 size for professional printing
    canvas.setDimensions({
      width: 595,  // A4 width at 72 DPI
      height: 842  // A4 height at 72 DPI
    })

    const styles = getLayoutStyles(selectedLayout)
    canvas.backgroundColor = styles.backgroundColor

    const margins = { left: 60, right: 60, top: 60, bottom: 60 }
    const availableWidth = canvas.width! - margins.left - margins.right
    const columnWidth = selectedColumns === 2 ? (availableWidth - 30) / 2 : availableWidth

    let currentY = margins.top
    let currentColumn = 0
    let columnX = margins.left

    // Add restaurant name header
    const restaurantHeader = new fabric.Text(selectedRestaurant.name.toUpperCase(), {
      ...styles.restaurantName,
      left: canvas.width! / 2,
      top: currentY,
      originX: 'center'
    })
    canvas.add(restaurantHeader)
    currentY += restaurantHeader.height! + 20

    // Add decorative elements based on layout
    if (selectedLayout === 'elegant' || selectedLayout === 'classic') {
      // Add decorative line
      const decorativeLine = new fabric.Rect({
        left: margins.left + 40,
        top: currentY,
        width: availableWidth - 80,
        height: 2,
        fill: styles.decorativeColor
      })
      canvas.add(decorativeLine)
      currentY += 30
    } else if (selectedLayout === 'modern') {
      // Add modern accent elements
      const accentRect = new fabric.Rect({
        left: margins.left,
        top: currentY,
        width: 60,
        height: 4,
        fill: styles.decorativeColor
      })
      canvas.add(accentRect)
      currentY += 25
    }

    // Group products by category
    const productsByCategory = productResponse.products.reduce((acc, product) => {
      const categoryName = product.category?.name || 'Other Items'
      if (!acc[categoryName]) {
        acc[categoryName] = []
      }
      acc[categoryName].push(product)
      return acc
    }, {} as Record<string, typeof productResponse.products>)

    // Create menu sections from actual categories
    const actualCategories = Object.keys(productsByCategory)

    for (let catIndex = 0; catIndex < actualCategories.length; catIndex++) {
      const categoryName = actualCategories[catIndex]
      const categoryProducts = productsByCategory[categoryName]

      if (categoryProducts.length === 0) continue

      // Check if we need to move to next column
      if (selectedColumns === 2 && currentY > canvas.height! * 0.7 && currentColumn === 0) {
        currentColumn = 1
        columnX = margins.left + columnWidth + 30
        currentY = margins.top + restaurantHeader.height! + 50 // Reset Y for second column
      }

      // Check if we've run out of space
      if (currentY > canvas.height! - margins.bottom - 60) break

      // Add section header
      const sectionHeader = new fabric.Text(categoryName.toUpperCase(), {
        ...styles.sectionHeader,
        left: columnX,
        top: currentY
      })
      canvas.add(sectionHeader)
      currentY += sectionHeader.height! + 15

      // Add section underline for elegant/classic styles
      if (selectedLayout === 'elegant' || selectedLayout === 'classic') {
        const underline = new fabric.Rect({
          left: columnX,
          top: currentY,
          width: Math.min(sectionHeader.width! + 20, columnWidth),
          height: 1,
          fill: styles.decorativeColor
        })
        canvas.add(underline)
        currentY += 20
      } else {
        currentY += 10
      }

      // Limit items per category based on layout
      const maxItemsPerCategory = selectedLayout === 'compact' ? 8 : 6
      const displayProducts = categoryProducts.slice(0, maxItemsPerCategory)

      // Add items in this section
      for (const product of displayProducts) {
        if (currentY > canvas.height! - margins.bottom - 40) break

        // Create professional menu item layout
        const menuItemData: MenuItemData = {
          id: product.id,
          name: product.name,
          description: product.description || undefined,
          price: product.prices?.[0]?.amount || product.basePrice || '0',
          categoryId: product.categoryId || undefined,
          categoryName: product.category?.name || undefined
        }

        // Use enhanced layout based on selected style
        const layoutType = selectedLayout === 'compact' ? 'compact' : 'flexible'
        const nameToDisplayGap = selectedLayout === 'compact' ? 120 : 180

        const menuItem = new MenuItemComponent({
          productId: product.id,
          menuItemData,
          layout: layoutType,
          nameToDisplayGap,
          maxWidth: columnWidth - 20,
          showDescription: selectedLayout !== 'compact',
          nameStyle: styles.itemName,
          priceStyle: styles.itemPrice,
          descriptionStyle: styles.itemDescription,
          left: columnX,
          top: currentY
        })

        canvas.add(menuItem)
        const itemSpacing = selectedLayout === 'compact' ? 18 : 25
        currentY += menuItem.height! + itemSpacing
      }

      // Extra space between sections
      const sectionSpacing = selectedLayout === 'compact' ? 20 : 30
      currentY += sectionSpacing
    }

    // Add footer with professional touch based on layout
    const footerY = canvas.height! - margins.bottom + 20
    let footerText = 'Thank you for dining with us'

    if (selectedLayout === 'modern') {
      footerText = selectedRestaurant.name + ' - Exceptional Dining Experience'
    } else if (selectedLayout === 'classic') {
      footerText = 'Est. ' + new Date().getFullYear() + ' • ' + selectedRestaurant.name
    }

    const footer = new fabric.Text(footerText, {
      fontSize: selectedLayout === 'compact' ? 10 : 12,
      fontFamily: styles.restaurantName.fontFamily,
      fontStyle: selectedLayout === 'elegant' ? 'italic' : 'normal',
      fill: styles.decorativeColor,
      left: canvas.width! / 2,
      top: footerY,
      originX: 'center',
      textAlign: 'center'
    })
    canvas.add(footer)

    canvas.renderAll()
    onMenuCreated?.()
  }

  if (productsLoading) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-500">Loading menu items...</div>
      </div>
    )
  }

  if (!selectedRestaurant || !selectedMenu) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-500">Please select a restaurant and menu first</div>
      </div>
    )
  }

  const layoutOptions = [
    { id: 'elegant', name: 'Elegant', description: 'Georgia font, decorative elements' },
    { id: 'classic', name: 'Classic', description: 'Traditional Times New Roman' },
    { id: 'modern', name: 'Modern', description: 'Clean Arial with color accents' },
    { id: 'compact', name: 'Compact', description: 'Fits more items per page' }
  ]

  return (
    <div className="p-4 border-b border-gray-200">
      <h3 className="font-semibold text-sm text-gray-700 mb-3">Professional Menu Creator</h3>
      <p className="text-xs text-gray-600 mb-4">
        Create professional menus with your actual database items using customizable layouts.
      </p>

      {/* Layout Selection */}
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-700 mb-2 block">Layout Style</label>
        <div className="grid grid-cols-2 gap-2">
          {layoutOptions.map((layout) => (
            <Card
              key={layout.id}
              className={`p-2 cursor-pointer transition-colors ${
                selectedLayout === layout.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedLayout(layout.id as any)}
            >
              <div className="text-xs font-medium">{layout.name}</div>
              <div className="text-xs text-gray-500 mt-1">{layout.description}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Column Selection */}
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-700 mb-2 block">Layout</label>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={selectedColumns === 1 ? 'default' : 'outline'}
            onClick={() => setSelectedColumns(1)}
            className="text-xs flex-1"
          >
            Single Column
          </Button>
          <Button
            size="sm"
            variant={selectedColumns === 2 ? 'default' : 'outline'}
            onClick={() => setSelectedColumns(2)}
            className="text-xs flex-1"
          >
            Two Columns
          </Button>
        </div>
      </div>

      <Button
        onClick={createProfessionalMenu}
        disabled={!canvas || productsLoading}
        className="w-full text-sm font-medium"
      >
        Create Professional Menu
      </Button>

      <div className="mt-2 text-xs text-gray-500">
        Found {productResponse?.products?.length || 0} items in your menu
      </div>
    </div>
  )
}