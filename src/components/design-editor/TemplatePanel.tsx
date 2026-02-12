'use client'

import { useState } from 'react'
import * as fabric from 'fabric'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { trpc } from '@/lib/trpc'
import { useRestaurantMenu } from '@/contexts/RestaurantMenuContext'
import ProfessionalMenuCreator from './ProfessionalMenuCreator'
import TemplatePreview from './TemplatePreview'
import TemplateGallery from './TemplateGallery'
import {
  DESIGN_TEMPLATES,
  TEMPLATE_SIZES,
  getCanvasDisplayDimensions,
  DesignTemplate,
  TemplateSize,
  getTemplatesByCategory
} from './templates'
import { getAllTemplates, type TemplateWithData } from './templates/index'
import { Layout, Monitor, Printer, Square, FileImage, Palette, Sparkles } from 'lucide-react'

interface TemplatePanelProps {
  canvas: fabric.Canvas | null
  onTemplateLoad: (template: DesignTemplate) => void
}

export default function TemplatePanel({ canvas, onTemplateLoad }: TemplatePanelProps) {
  const [activeTab, setActiveTab] = useState<'gallery' | 'templates' | 'sizes' | 'database' | 'professional'>('gallery')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const { data: dbTemplates, isLoading } = trpc.design.getTemplates.useQuery({})
  const { selectedRestaurant, selectedMenu } = useRestaurantMenu()

  const loadTemplate = async (template: DesignTemplate) => {
    if (!canvas || !selectedRestaurant?.id || !selectedMenu?.id) return

    try {
      // Calculate display dimensions
      const dimensions = getCanvasDisplayDimensions(template, 800, 600)

      // Set canvas size
      canvas.setDimensions({
        width: dimensions.width,
        height: dimensions.height
      })

      // Clear existing content
      canvas.clear()
      canvas.backgroundColor = template.backgroundColor

      // Add margins guide (visual helper)
      if (template.margins) {
        addMarginsGuide(canvas, template.margins, dimensions.width, dimensions.height)
      }

      // Fetch user's menu items and auto-populate
      await populateTemplateWithRealData(canvas, template, dimensions)

      canvas.renderAll()
      onTemplateLoad(template)
    } catch (error) {
      console.error('Error loading template:', error)
      alert('Error loading template. Please try again.')
    }
  }

  // Load template from new gallery system
  const loadGalleryTemplate = (template: TemplateWithData) => {
    if (!canvas) return

    try {
      console.log('Loading gallery template:', template.name)
      console.log('Template data:', template.templateData)
      console.log('First object sample:', JSON.stringify(template.templateData.objects?.[0], null, 2))

      // Calculate scale factor for the template
      const firstObject = template.templateData.objects?.[0]
      if (!firstObject || !firstObject.width || !firstObject.height) {
        console.error('No valid first object found')
        return
      }

      const maxWidth = 800
      const maxHeight = 600
      const templateWidth = firstObject.width
      const templateHeight = firstObject.height

      // Calculate scale to fit canvas
      const scale = Math.min(maxWidth / templateWidth, maxHeight / templateHeight)
      const canvasWidth = Math.round(templateWidth * scale)
      const canvasHeight = Math.round(templateHeight * scale)

      console.log('Template size:', templateWidth, 'x', templateHeight)
      console.log('Scale factor:', scale)
      console.log('Canvas size:', canvasWidth, 'x', canvasHeight)

      canvas.setDimensions({ width: canvasWidth, height: canvasHeight })

      // Clear canvas before loading
      canvas.clear()

      // Set background color
      canvas.backgroundColor = template.templateData.background || '#ffffff'

      // Create Fabric objects from template data manually, scaled down
      const templateObjects = template.templateData.objects || []
      console.log('Creating', templateObjects.length, 'objects manually with scale', scale)

      templateObjects.forEach((objData: any, index: number) => {
        try {
          let fabricObj: fabric.Object | null = null

          if (objData.type === 'Rect') {
            fabricObj = new fabric.Rect({
              left: objData.left * scale,
              top: objData.top * scale,
              width: objData.width * scale,
              height: objData.height * scale,
              fill: objData.fill,
              stroke: objData.stroke,
              strokeWidth: (objData.strokeWidth || 0) * scale,
              selectable: objData.selectable !== false,
              evented: objData.evented !== false,
            })
          } else if (objData.type === 'Text') {
            fabricObj = new fabric.Text(objData.text || '', {
              left: objData.left * scale,
              top: objData.top * scale,
              fontSize: (objData.fontSize || 16) * scale,
              fontFamily: objData.fontFamily || 'Arial',
              fontWeight: objData.fontWeight || 'normal',
              fontStyle: objData.fontStyle || 'normal',
              fill: objData.fill || '#000000',
              textAlign: objData.textAlign || 'left',
              originX: objData.originX || 'left',
              originY: objData.originY || 'top',
            })
          } else if (objData.type === 'Line') {
            fabricObj = new fabric.Line(
              [
                (objData.x1 || 0) * scale,
                (objData.y1 || 0) * scale,
                (objData.x2 || 0) * scale,
                (objData.y2 || 0) * scale
              ],
              {
                left: objData.left * scale,
                top: objData.top * scale,
                stroke: objData.stroke,
                strokeWidth: (objData.strokeWidth || 1) * scale,
              }
            )
          }

          if (fabricObj) {
            canvas.add(fabricObj)
          }
        } catch (err) {
          console.error('Error creating object', index, 'Type:', objData.type)
          console.error('Object data:', JSON.stringify(objData, null, 2))
          console.error('Error:', err)
        }
      })

      console.log('Objects created, rendering...')
      canvas.renderAll()
      console.log('Final canvas objects count:', canvas.getObjects().length)

      // Convert to legacy format for onTemplateLoad callback
      const legacyTemplate: DesignTemplate = {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category as any,
        size: TEMPLATE_SIZES[0], // Default size
        backgroundColor: template.templateData.background || '#ffffff',
        margins: { top: 40, right: 40, bottom: 40, left: 40 },
        defaultStyles: {
          heading: { fontSize: 32, fontFamily: 'Arial', fontWeight: 'bold', color: '#2c3e50' },
          category: { fontSize: 24, fontFamily: 'Arial', fontWeight: 'bold', color: '#34495e' },
          itemName: { fontSize: 16, fontFamily: 'Arial', fontWeight: 'normal', color: '#2c3e50' },
          itemPrice: { fontSize: 16, fontFamily: 'Arial', fontWeight: 'bold', color: '#e74c3c' },
          itemDescription: { fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', color: '#7f8c8d' }
        }
      }

      onTemplateLoad(legacyTemplate)
    } catch (error) {
      console.error('Error loading gallery template:', error)
      alert('Error loading template. Please try again.')
    }
  }


  const loadCustomSize = (size: TemplateSize) => {
    if (!canvas) return

    try {
      const dimensions = getCanvasDisplayDimensions({
        id: 'custom',
        name: 'Custom',
        description: 'Custom size',
        category: 'custom',
        size,
        backgroundColor: '#ffffff',
        margins: { top: 40, right: 40, bottom: 40, left: 40 },
        defaultStyles: {
          heading: { fontSize: 32, fontFamily: 'Arial', fontWeight: 'bold', color: '#2c3e50' },
          category: { fontSize: 24, fontFamily: 'Arial', fontWeight: 'bold', color: '#34495e' },
          itemName: { fontSize: 16, fontFamily: 'Arial', fontWeight: 'normal', color: '#2c3e50' },
          itemPrice: { fontSize: 16, fontFamily: 'Arial', fontWeight: 'bold', color: '#e74c3c' },
          itemDescription: { fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', color: '#7f8c8d' }
        }
      }, 800, 600)

      canvas.setDimensions({
        width: dimensions.width,
        height: dimensions.height
      })

      canvas.clear()
      canvas.backgroundColor = '#ffffff'
      canvas.renderAll()

      onTemplateLoad({
        id: 'custom-' + size.id,
        name: size.name,
        description: size.description,
        category: 'custom',
        size,
        backgroundColor: '#ffffff',
        margins: { top: 40, right: 40, bottom: 40, left: 40 },
        defaultStyles: {
          heading: { fontSize: 32, fontFamily: 'Arial', fontWeight: 'bold', color: '#2c3e50' },
          category: { fontSize: 24, fontFamily: 'Arial', fontWeight: 'bold', color: '#34495e' },
          itemName: { fontSize: 16, fontFamily: 'Arial', fontWeight: 'normal', color: '#2c3e50' },
          itemPrice: { fontSize: 16, fontFamily: 'Arial', fontWeight: 'bold', color: '#e74c3c' },
          itemDescription: { fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', color: '#7f8c8d' }
        }
      })
    } catch (error) {
      console.error('Error loading custom size:', error)
      alert('Error loading size. Please try again.')
    }
  }

  // Auto-populate template with real user menu data
  const populateTemplateWithRealData = async (canvas: fabric.Canvas, template: DesignTemplate, dimensions: any) => {
    if (!selectedRestaurant?.id || !selectedMenu?.id) return

    try {
      // Fetch products from the database - using fetch directly to avoid hook issues
      const response = await fetch(`/api/trpc/product.list?batch=1&input=${encodeURIComponent(JSON.stringify({
        "0": {
          "json": {
            "restaurantId": selectedRestaurant.id,
            "menuId": selectedMenu.id,
            "limit": 50
          }
        }
      }))}`)

      const data = await response.json()
      const products = data[0]?.result?.data?.products || []

      if (products.length === 0) return

      // Group products by category
      const productsByCategory = products.reduce((acc: any, product: any) => {
        const categoryName = product.category?.name || 'Other Items'
        if (!acc[categoryName]) {
          acc[categoryName] = []
        }
        acc[categoryName].push(product)
        return acc
      }, {})

      // Add restaurant name header
      const restaurantHeader = new fabric.Text(selectedRestaurant.name.toUpperCase(), {
        fontSize: template.defaultStyles.heading.fontSize,
        fontFamily: template.defaultStyles.heading.fontFamily,
        fontWeight: template.defaultStyles.heading.fontWeight,
        fill: template.defaultStyles.heading.color,
        left: dimensions.width / 2,
        top: template.margins.top,
        originX: 'center'
      })
      canvas.add(restaurantHeader)

      let currentY = template.margins.top + 60

      // Add categories and items
      Object.entries(productsByCategory).forEach(([categoryName, categoryProducts]: [string, any]) => {
        if (currentY > dimensions.height - 100) return // Prevent overflow

        // Add category header
        const categoryHeader = new fabric.Text(categoryName.toUpperCase(), {
          fontSize: template.defaultStyles.category.fontSize,
          fontFamily: template.defaultStyles.category.fontFamily,
          fontWeight: template.defaultStyles.category.fontWeight,
          fill: template.defaultStyles.category.color,
          left: template.margins.left,
          top: currentY
        })
        canvas.add(categoryHeader)
        currentY += 40

        // Add items (limit to 8 per category to prevent overflow)
        categoryProducts.slice(0, 8).forEach((product: any) => {
          if (currentY > dimensions.height - 80) return

          const maxWidth = dimensions.width - template.margins.left - template.margins.right - 20

          // Create menu item name
          const itemName = new fabric.Text(product.name, {
            fontSize: template.defaultStyles.itemName.fontSize,
            fontFamily: template.defaultStyles.itemName.fontFamily,
            fontWeight: template.defaultStyles.itemName.fontWeight,
            fill: template.defaultStyles.itemName.color,
            left: template.margins.left + 20,
            top: currentY
          })

          // Create price
          const price = product.prices?.[0]?.amount || product.basePrice || '0'
          const itemPrice = new fabric.Text(`£${price}`, {
            fontSize: template.defaultStyles.itemPrice.fontSize,
            fontFamily: template.defaultStyles.itemPrice.fontFamily,
            fontWeight: template.defaultStyles.itemPrice.fontWeight,
            fill: template.defaultStyles.itemPrice.color,
            left: dimensions.width - template.margins.right - 60,
            top: currentY
          })

          canvas.add(itemName)
          canvas.add(itemPrice)
          currentY += 25

          // Add description if it exists and we have space
          if (product.description && currentY < dimensions.height - 60) {
            const description = new fabric.Text(product.description, {
              fontSize: template.defaultStyles.itemDescription.fontSize,
              fontFamily: template.defaultStyles.itemDescription.fontFamily,
              fontWeight: template.defaultStyles.itemDescription.fontWeight,
              fill: template.defaultStyles.itemDescription.color,
              left: template.margins.left + 20,
              top: currentY,
              width: maxWidth - 100
            })
            canvas.add(description)
            currentY += 20
          }
        })

        currentY += 30 // Space between categories
      })

    } catch (error) {
      console.error('Error populating template with real data:', error)
      // Continue without auto-population if there's an error
    }
  }

  const loadDatabaseTemplate = (templateData: any) => {
    if (!canvas) return

    try {
      canvas.loadFromJSON(templateData, () => {
        canvas.renderAll()
        // Create a mock template object for the loaded design
        onTemplateLoad({
          id: 'database-template',
          name: 'Database Template',
          description: 'Loaded from database',
          category: 'custom',
          size: TEMPLATE_SIZES[0], // Default size
          backgroundColor: '#ffffff',
          margins: { top: 40, right: 40, bottom: 40, left: 40 },
          defaultStyles: {
            heading: { fontSize: 32, fontFamily: 'Arial', fontWeight: 'bold', color: '#2c3e50' },
            category: { fontSize: 24, fontFamily: 'Arial', fontWeight: 'bold', color: '#34495e' },
            itemName: { fontSize: 16, fontFamily: 'Arial', fontWeight: 'normal', color: '#2c3e50' },
            itemPrice: { fontSize: 16, fontFamily: 'Arial', fontWeight: 'bold', color: '#e74c3c' },
            itemDescription: { fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', color: '#7f8c8d' }
          }
        })
      })
    } catch (error) {
      console.error('Error loading database template:', error)
      alert('Error loading template. Please try again.')
    }
  }

  const addGrid = (canvas: fabric.Canvas, gridSize: number, width: number, height: number) => {
    const gridLines: fabric.Object[] = []

    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      const line = new fabric.Line([x, 0, x, height], {
        stroke: '#e0e0e0',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
        excludeFromExport: true
      })
      gridLines.push(line)
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      const line = new fabric.Line([0, y, width, y], {
        stroke: '#e0e0e0',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
        excludeFromExport: true
      })
      gridLines.push(line)
    }

    // Add all grid lines to canvas
    gridLines.forEach(line => {
      canvas.add(line)
      // Move to back using sendObjectToBack method
      try {
        canvas.sendObjectToBack(line)
      } catch (e) {
        // If that doesn't work, try alternative method
        console.log('Using alternative grid positioning')
      }
    })
  }

  const addMarginsGuide = (canvas: fabric.Canvas, margins: any, width: number, height: number) => {
    const marginRect = new fabric.Rect({
      left: margins.left,
      top: margins.top,
      width: width - margins.left - margins.right,
      height: height - margins.top - margins.bottom,
      fill: 'transparent',
      stroke: '#3498db',
      strokeWidth: 1,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
      excludeFromExport: true
    })

    canvas.add(marginRect)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'restaurant-menu':
        return <Layout className="w-4 h-4" />
      case 'takeaway-menu':
        return <FileImage className="w-4 h-4" />
      case 'digital-display':
        return <Monitor className="w-4 h-4" />
      default:
        return <Palette className="w-4 h-4" />
    }
  }

  const getSizeIcon = (category: string) => {
    switch (category) {
      case 'print':
        return <Printer className="w-4 h-4" />
      case 'digital':
        return <Monitor className="w-4 h-4" />
      default:
        return <Square className="w-4 h-4" />
    }
  }

  const templateCategories = [
    { id: 'restaurant-menu', name: 'Restaurant Menus', count: getTemplatesByCategory('restaurant-menu').length },
    { id: 'takeaway-menu', name: 'Takeaway Menus', count: getTemplatesByCategory('takeaway-menu').length },
    { id: 'digital-display', name: 'Digital Displays', count: getTemplatesByCategory('digital-display').length }
  ]

  const sizeCategories = [
    { id: 'print', name: 'Print Sizes', count: TEMPLATE_SIZES.filter(s => s.category === 'print').length },
    { id: 'digital', name: 'Digital Sizes', count: TEMPLATE_SIZES.filter(s => s.category === 'digital').length }
  ]

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full max-h-screen">
      {/* Header with tabs */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">Design Templates</h3>
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant={activeTab === 'gallery' ? 'default' : 'outline'}
            onClick={() => setActiveTab('gallery')}
            className="text-xs flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            Gallery (50+)
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'templates' ? 'default' : 'outline'}
            onClick={() => setActiveTab('templates')}
            className="text-xs"
          >
            Basic
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'sizes' ? 'default' : 'outline'}
            onClick={() => setActiveTab('sizes')}
            className="text-xs"
          >
            Sizes
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'database' ? 'default' : 'outline'}
            onClick={() => setActiveTab('database')}
            className="text-xs"
          >
            Saved
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'professional' ? 'default' : 'outline'}
            onClick={() => setActiveTab('professional')}
            className="text-xs"
          >
            Auto-Menu
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className={activeTab === 'gallery' ? 'h-full' : 'p-4'}>
          {activeTab === 'gallery' && (
            <div className="fixed inset-0 z-50 bg-white">
              <TemplateGallery
                onSelectTemplate={loadGalleryTemplate}
                onClose={() => setActiveTab('templates')}
              />
            </div>
          )}

          {activeTab === 'templates' && (
            <>
              {/* Category Filter */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={selectedCategory === null ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(null)}
                    className="text-xs h-6"
                  >
                    All
                  </Button>
                  {templateCategories.map(category => (
                    <Button
                      key={category.id}
                      size="sm"
                      variant={selectedCategory === category.id ? 'default' : 'outline'}
                      onClick={() => setSelectedCategory(
                        selectedCategory === category.id ? null : category.id
                      )}
                      className="text-xs h-6 flex items-center gap-1"
                    >
                      {getCategoryIcon(category.id)}
                      {category.name}
                      <Badge variant="secondary" className="text-xs">
                        {category.count}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Templates Grid */}
              <div className="space-y-3">
                {DESIGN_TEMPLATES
                  .filter(template => !selectedCategory || template.category === selectedCategory)
                  .map((template) => {
                    // Generate sample data based on user's restaurant if available
                    const sampleData = {
                      restaurantName: selectedRestaurant?.name || 'Restaurant Name',
                      categoryName: 'Appetizers',
                      itemName: 'Sample Dish',
                      itemPrice: '12.99',
                      itemDescription: 'Delicious sample menu item description'
                    }

                    return (
                      <Card key={template.id} className="p-3 hover:shadow-md transition-shadow">
                        <div className="space-y-3">
                          {/* Template Preview */}
                          <div className="flex justify-center">
                            <TemplatePreview
                              template={template}
                              width={100}
                              height={130}
                              sampleData={sampleData}
                            />
                          </div>

                          {/* Template Info */}
                          <div>
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(template.category)}
                              <h4 className="font-medium text-sm text-gray-900 truncate">{template.name}</h4>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                            <div className="flex items-center gap-1 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {template.size.category}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {template.size.dpi} DPI
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {template.size.orientation}
                              </Badge>
                            </div>
                          </div>

                          {/* Use Button */}
                          <Button
                            size="sm"
                            onClick={() => loadTemplate(template)}
                            disabled={!canvas}
                            className="w-full"
                            variant="outline"
                          >
                            Use Template
                          </Button>
                        </div>
                      </Card>
                    )
                  })}
              </div>
            </>
          )}

          {activeTab === 'sizes' && (
            <>
              {/* Size Categories */}
              {sizeCategories.map(category => (
                <div key={category.id} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {getSizeIcon(category.id)}
                    <h4 className="font-medium text-sm text-gray-700">{category.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {category.count}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    {TEMPLATE_SIZES
                      .filter(size => size.category === category.id)
                      .map(size => (
                        <Card key={size.id} className="p-2 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-sm text-gray-900 truncate">{size.name}</h5>
                              <div className="flex items-center gap-1 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {size.width}×{size.height}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {size.orientation}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => loadCustomSize(size)}
                              disabled={!canvas}
                              className="text-xs ml-2"
                            >
                              Use
                            </Button>
                          </div>
                        </Card>
                      ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {activeTab === 'database' && (
            <>
              {isLoading && (
                <div className="text-center py-4">
                  <div className="text-sm text-gray-500">Loading saved templates...</div>
                </div>
              )}

              {!isLoading && (!dbTemplates || dbTemplates.length === 0) && (
                <div className="text-center py-8">
                  <Palette className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-500">No saved templates</div>
                  <p className="text-xs text-gray-400 mt-1">
                    Save your designs to see them here
                  </p>
                </div>
              )}

              {!isLoading && dbTemplates && dbTemplates.length > 0 && (
                <div className="space-y-4">
                  {dbTemplates.map((template) => (
                    <Card key={template.id} className="p-3 hover:shadow-md transition-shadow">
                      <div className="space-y-3">
                        {/* Template Preview */}
                        <div className="w-full h-24 bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-500">Saved Design</span>
                        </div>

                        {/* Template Info */}
                        <div>
                          <h4 className="font-medium text-sm text-gray-900">{template.name}</h4>
                          <p className="text-xs text-gray-600 mt-1">{template.description || 'Custom saved design'}</p>
                        </div>

                        {/* Load Button */}
                        <Button
                          size="sm"
                          onClick={() => loadDatabaseTemplate(template.templateData)}
                          className="w-full"
                          variant="outline"
                          disabled={!canvas}
                        >
                          Load Design
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'professional' && (
            <ProfessionalMenuCreator
              canvas={canvas}
              onMenuCreated={() => {
                // Optionally switch to a different tab or show a success message
                console.log('Professional menu created successfully!')
              }}
            />
          )}
        </div>
      </ScrollArea>

      {/* Start Fresh Section */}
      <div className="p-4 border-t border-gray-200">
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => {
            if (!canvas) return
            canvas.clear()
            canvas.backgroundColor = '#ffffff'
            canvas.setDimensions({ width: 800, height: 600 })
            canvas.renderAll()
            onTemplateLoad({
              id: 'blank',
              name: 'Blank Canvas',
              description: 'Start from scratch',
              category: 'custom',
              size: TEMPLATE_SIZES[0],
              backgroundColor: '#ffffff',
              margins: { top: 40, right: 40, bottom: 40, left: 40 },
              defaultStyles: {
                heading: { fontSize: 32, fontFamily: 'Arial', fontWeight: 'bold', color: '#2c3e50' },
                category: { fontSize: 24, fontFamily: 'Arial', fontWeight: 'bold', color: '#34495e' },
                itemName: { fontSize: 16, fontFamily: 'Arial', fontWeight: 'normal', color: '#2c3e50' },
                itemPrice: { fontSize: 16, fontFamily: 'Arial', fontWeight: 'bold', color: '#e74c3c' },
                itemDescription: { fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', color: '#7f8c8d' }
              }
            })
          }}
          disabled={!canvas}
        >
          Blank Canvas
        </Button>
      </div>
    </div>
  )
}