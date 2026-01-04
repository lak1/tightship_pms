'use client'

import { useState, useMemo } from 'react'
import * as fabric from 'fabric'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { trpc } from '@/lib/trpc'
import { useRestaurantMenu } from '@/contexts/RestaurantMenuContext'
import { MenuItemComponent, MenuItemData } from './MenuItemComponent'
import { DesignTemplate } from './templates'
import {
  Search,
  Plus,
  FolderPlus,
  Grid3x3,
  List,
  Filter,
  ChevronDown,
  ChevronRight,
  Package,
  Tag
} from 'lucide-react'

interface MenuBrowserProps {
  canvas: fabric.Canvas | null
  currentTemplate: DesignTemplate | null
  onItemAdded?: (component: MenuItemComponent) => void
}

interface CategoryWithProducts {
  id: string
  name: string
  products: MenuItemData[]
  isExpanded: boolean
}

export default function MenuBrowser({ canvas, currentTemplate, onItemAdded }: MenuBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [showPrices, setShowPrices] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const { selectedRestaurant, selectedMenu } = useRestaurantMenu()

  // Get menu data
  const { data: productResponse, isLoading: productsLoading } = trpc.product.list.useQuery(
    {
      restaurantId: selectedRestaurant?.id,
      menuId: selectedMenu?.id,
      limit: 200 // Get more items for the browser
    },
    {
      enabled: !!selectedRestaurant?.id && !!selectedMenu?.id,
    }
  )

  const products = productResponse?.products || []

  // Group products by category
  const categoriesWithProducts: CategoryWithProducts[] = useMemo(() => {
    const categoryMap = new Map<string, CategoryWithProducts>()

    // Add uncategorized category
    categoryMap.set('uncategorized', {
      id: 'uncategorized',
      name: 'Uncategorized',
      products: [],
      isExpanded: expandedCategories.has('uncategorized')
    })

    products.forEach(product => {
      const categoryId = product.categoryId || 'uncategorized'
      const categoryName = product.categories?.name || 'Uncategorized'

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: categoryName,
          products: [],
          isExpanded: expandedCategories.has(categoryId)
        })
      }

      const menuItemData: MenuItemData = {
        id: product.id,
        name: product.name,
        description: product.description || undefined,
        price: product.prices?.[0]?.amount || product.basePrice || '0',
        categoryId: product.categoryId || undefined,
        categoryName: product.categories?.name || undefined
      }

      categoryMap.get(categoryId)!.products.push(menuItemData)
    })

    return Array.from(categoryMap.values()).filter(cat => cat.products.length > 0)
  }, [products, expandedCategories])

  // Filter products based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return selectedCategory
        ? categoriesWithProducts.filter(cat => cat.id === selectedCategory)
        : categoriesWithProducts
    }

    const query = searchQuery.toLowerCase()
    return categoriesWithProducts.map(category => ({
      ...category,
      products: category.products.filter(product =>
        product.name.toLowerCase().includes(query) ||
        (product.description?.toLowerCase().includes(query))
      )
    })).filter(cat => cat.products.length > 0)
  }, [categoriesWithProducts, searchQuery, selectedCategory])

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const addItemToCanvas = (product: MenuItemData, layout: 'horizontal' | 'vertical' | 'compact' = 'horizontal') => {
    if (!canvas || !currentTemplate) return

    const styles = currentTemplate.defaultStyles
    const component = new MenuItemComponent({
      productId: product.id,
      menuItemData: product,
      left: 100,
      top: 100,
      layout,
      nameStyle: {
        fontSize: styles.itemName.fontSize,
        fontFamily: styles.itemName.fontFamily,
        fontWeight: styles.itemName.fontWeight,
        fill: styles.itemName.color
      },
      priceStyle: {
        fontSize: styles.itemPrice.fontSize,
        fontFamily: styles.itemPrice.fontFamily,
        fontWeight: styles.itemPrice.fontWeight,
        fill: styles.itemPrice.color
      },
      descriptionStyle: {
        fontSize: styles.itemDescription.fontSize,
        fontFamily: styles.itemDescription.fontFamily,
        fontWeight: styles.itemDescription.fontWeight,
        fill: styles.itemDescription.color
      },
      maxWidth: Math.max(400, (canvas.width || 800) * 0.8)
    })

    canvas.add(component)
    canvas.setActiveObject(component)
    canvas.renderAll()

    onItemAdded?.(component)
  }

  const addCategoryToCanvas = (category: CategoryWithProducts) => {
    if (!canvas || !currentTemplate) return

    let yOffset = 100
    const xStart = 100

    // Add category header
    const categoryHeader = new fabric.Text(category.name, {
      left: xStart,
      top: yOffset,
      fontSize: currentTemplate.defaultStyles.category.fontSize,
      fontFamily: currentTemplate.defaultStyles.category.fontFamily,
      fontWeight: currentTemplate.defaultStyles.category.fontWeight,
      fill: currentTemplate.defaultStyles.category.color
    })

    canvas.add(categoryHeader)
    yOffset += categoryHeader.height! + 20

    // Add products in this category
    category.products.forEach((product, index) => {
      const component = new MenuItemComponent({
        productId: product.id,
        menuItemData: product,
        left: xStart + 20,
        top: yOffset,
        layout: 'horizontal',
        nameStyle: {
          fontSize: currentTemplate.defaultStyles.itemName.fontSize,
          fontFamily: currentTemplate.defaultStyles.itemName.fontFamily,
          fontWeight: currentTemplate.defaultStyles.itemName.fontWeight,
          fill: currentTemplate.defaultStyles.itemName.color
        },
        priceStyle: {
          fontSize: currentTemplate.defaultStyles.itemPrice.fontSize,
          fontFamily: currentTemplate.defaultStyles.itemPrice.fontFamily,
          fontWeight: currentTemplate.defaultStyles.itemPrice.fontWeight,
          fill: currentTemplate.defaultStyles.itemPrice.color
        },
        descriptionStyle: {
          fontSize: currentTemplate.defaultStyles.itemDescription.fontSize,
          fontFamily: currentTemplate.defaultStyles.itemDescription.fontFamily,
          fontWeight: currentTemplate.defaultStyles.itemDescription.fontWeight,
          fill: currentTemplate.defaultStyles.itemDescription.color
        },
        maxWidth: Math.max(400, (canvas.width || 800) * 0.8)
      })

      canvas.add(component)
      yOffset += 40 // Space between items

      onItemAdded?.(component)
    })

    canvas.renderAll()
  }

  const addAllItemsToCanvas = () => {
    if (!canvas || !currentTemplate) return

    let yOffset = 100
    const xStart = 100

    filteredCategories.forEach(category => {
      // Add category header
      const categoryHeader = new fabric.Text(category.name, {
        left: xStart,
        top: yOffset,
        fontSize: currentTemplate.defaultStyles.category.fontSize,
        fontFamily: currentTemplate.defaultStyles.category.fontFamily,
        fontWeight: currentTemplate.defaultStyles.category.fontWeight,
        fill: currentTemplate.defaultStyles.category.color
      })

      canvas.add(categoryHeader)
      yOffset += categoryHeader.height! + 20

      // Add separator line
      const separator = new fabric.Rect({
        left: xStart,
        top: yOffset,
        width: 400,
        height: 2,
        fill: currentTemplate.defaultStyles.category.color
      })

      canvas.add(separator)
      yOffset += 15

      // Add products
      category.products.forEach(product => {
        const component = new MenuItemComponent({
          productId: product.id,
          menuItemData: product,
          left: xStart + 20,
          top: yOffset,
          layout: 'horizontal',
          nameStyle: {
            fontSize: currentTemplate.defaultStyles.itemName.fontSize,
            fontFamily: currentTemplate.defaultStyles.itemName.fontFamily,
            fontWeight: currentTemplate.defaultStyles.itemName.fontWeight,
            fill: currentTemplate.defaultStyles.itemName.color
          },
          priceStyle: {
            fontSize: currentTemplate.defaultStyles.itemPrice.fontSize,
            fontFamily: currentTemplate.defaultStyles.itemPrice.fontFamily,
            fontWeight: currentTemplate.defaultStyles.itemPrice.fontWeight,
            fill: currentTemplate.defaultStyles.itemPrice.color
          },
          descriptionStyle: {
            fontSize: currentTemplate.defaultStyles.itemDescription.fontSize,
            fontFamily: currentTemplate.defaultStyles.itemDescription.fontFamily,
            fontWeight: currentTemplate.defaultStyles.itemDescription.fontWeight,
            fill: currentTemplate.defaultStyles.itemDescription.color
          },
          maxWidth: Math.max(400, (canvas.width || 800) * 0.8)
        })

        canvas.add(component)
        yOffset += 45

        onItemAdded?.(component)
      })

      yOffset += 30 // Space between categories
    })

    canvas.renderAll()
  }

  if (!selectedRestaurant || !selectedMenu) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-4">Menu Browser</h3>
        <p className="text-xs text-gray-500">
          Select a restaurant and menu to browse items
        </p>
      </div>
    )
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full max-h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700">Menu Browser</h3>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-8 text-xs"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={addAllItemsToCanvas}
            className="text-xs"
            disabled={!canvas || !currentTemplate}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPrices(!showPrices)}
            className="text-xs"
          >
            <Tag className="w-3 h-3 mr-1" />
            {showPrices ? 'Hide' : 'Show'} Prices
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant={selectedCategory === null ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(null)}
            className="text-xs h-6"
          >
            All
          </Button>
          {categoriesWithProducts.map(category => (
            <Button
              key={category.id}
              size="sm"
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(
                selectedCategory === category.id ? null : category.id
              )}
              className="text-xs h-6"
            >
              {category.name}
              <Badge variant="secondary" className="ml-1 text-xs">
                {category.products.length}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Menu Items List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {productsLoading ? (
            <div className="text-center py-4">
              <div className="text-sm text-gray-500">Loading menu items...</div>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-4">
              <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm text-gray-500">No items found</div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCategories.map(category => (
                <div key={category.id}>
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCategory(category.id)}
                      className="flex items-center gap-2 p-0 h-auto font-medium text-sm"
                    >
                      {expandedCategories.has(category.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      {category.name}
                      <Badge variant="secondary" className="text-xs">
                        {category.products.length}
                      </Badge>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addCategoryToCanvas(category)}
                      className="text-xs h-6"
                      disabled={!canvas || !currentTemplate}
                    >
                      <FolderPlus className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Category Items */}
                  {expandedCategories.has(category.id) && (
                    <div className="ml-4 space-y-2">
                      {category.products.map(product => (
                        <Card key={product.id} className="p-3 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-gray-900 truncate">
                                {product.name}
                              </h4>
                              {product.description && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                  {product.description}
                                </p>
                              )}
                              {showPrices && (
                                <p className="text-sm font-bold text-red-600 mt-1">
                                  £{product.price}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 ml-2">
                              <Button
                                size="sm"
                                onClick={() => addItemToCanvas(product, 'horizontal')}
                                className="text-xs h-6 px-2"
                                disabled={!canvas || !currentTemplate}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}