'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import * as fabric from 'fabric'
import { trpc } from '@/lib/trpc'
import { useRestaurantMenu } from '@/contexts/RestaurantMenuContext'
import DashboardLayout from '@/components/layout/dashboard-layout'
import FabricCanvas from '@/components/design-editor/FabricCanvas'
import PropertiesPanel from '@/components/design-editor/PropertiesPanel'
import TemplatePanel from '@/components/design-editor/TemplatePanel'
import MenuBrowser from '@/components/design-editor/MenuBrowser'
import { MenuItemComponent } from '@/components/design-editor/MenuItemComponent'
import { DesignTemplate } from '@/components/design-editor/templates'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Download, Save, Undo, Redo, ZoomIn, ZoomOut, Layout, Settings, Menu, Palette, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

export default function DesignEditorPage() {
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null)
  const [selectedObjects, setSelectedObjects] = useState<fabric.Object[]>([])
  const [canvasHistory, setCanvasHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [historyEnabled, setHistoryEnabled] = useState(true)
  const [activePanel, setActivePanel] = useState<'properties' | 'templates' | 'menu-browser'>('templates')
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null)
  const [designName, setDesignName] = useState('Untitled Design')
  const [currentTemplate, setCurrentTemplate] = useState<DesignTemplate | null>(null)
  const [menuItemComponents, setMenuItemComponents] = useState<Map<string, MenuItemComponent>>(new Map())

  const { selectedRestaurant, selectedMenu } = useRestaurantMenu()
  const updateCheckRef = useRef<NodeJS.Timeout | null>(null)

  // tRPC mutations
  const saveDesignMutation = trpc.design.saveDesign.useMutation()
  const { data: designs, refetch: refetchDesigns } = trpc.design.getDesigns.useQuery(
    { restaurantId: selectedRestaurant?.id },
    { enabled: !!selectedRestaurant?.id }
  )

  const handleCanvasReady = useCallback((fabricCanvas: fabric.Canvas) => {
    setCanvas(fabricCanvas)

    // Initialize history with empty canvas
    saveCanvasState(fabricCanvas)
  }, [])

  // Save canvas state for undo/redo
  const saveCanvasState = useCallback((canvasInstance?: fabric.Canvas) => {
    const canvasToUse = canvasInstance || canvas
    if (!canvasToUse || !historyEnabled) return

    const state = JSON.stringify(canvasToUse.toObject())
    setCanvasHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(state)
      // Limit history to 50 states
      if (newHistory.length > 50) {
        newHistory.shift()
      }
      return newHistory
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }, [canvas, historyIndex, historyEnabled])

  // Undo function
  const undo = useCallback(() => {
    if (!canvas || historyIndex <= 0) return

    const newIndex = historyIndex - 1
    const state = canvasHistory[newIndex]

    setHistoryEnabled(false)
    canvas.loadFromJSON(state, () => {
      canvas.renderAll()
      setHistoryIndex(newIndex)
      setHistoryEnabled(true)
    })
  }, [canvas, historyIndex, canvasHistory])

  // Redo function
  const redo = useCallback(() => {
    if (!canvas || historyIndex >= canvasHistory.length - 1) return

    const newIndex = historyIndex + 1
    const state = canvasHistory[newIndex]

    setHistoryEnabled(false)
    canvas.loadFromJSON(state, () => {
      canvas.renderAll()
      setHistoryIndex(newIndex)
      setHistoryEnabled(true)
    })
  }, [canvas, historyIndex, canvasHistory])

  const deleteSelected = () => {
    if (!canvas) return
    ;(canvas as any).deleteSelected?.()
  }

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when canvas is focused or no input is focused
      const activeElement = document.activeElement
      const isInputFocused = activeElement?.tagName === 'INPUT' ||
                            activeElement?.tagName === 'TEXTAREA' ||
                            activeElement?.contentEditable === 'true'

      if (isInputFocused) return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!isInputFocused) {
          e.preventDefault()
          deleteSelected()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, canvas])

  // Save state when canvas changes
  useEffect(() => {
    if (!canvas) return

    const handleCanvasChange = () => {
      saveCanvasState()
    }

    canvas.on('object:added', handleCanvasChange)
    canvas.on('object:removed', handleCanvasChange)
    canvas.on('object:modified', handleCanvasChange)

    return () => {
      canvas.off('object:added', handleCanvasChange)
      canvas.off('object:removed', handleCanvasChange)
      canvas.off('object:modified', handleCanvasChange)
    }
  }, [canvas, saveCanvasState])

  // Get menu data for live updates
  const { data: productResponse } = trpc.product.list.useQuery(
    {
      restaurantId: selectedRestaurant?.id,
      menuId: selectedMenu?.id,
      limit: 500
    },
    {
      enabled: !!selectedRestaurant?.id && !!selectedMenu?.id,
      refetchInterval: 30000, // Check for updates every 30 seconds
    }
  )

  const products = productResponse?.products || []

  // Live data synchronization
  useEffect(() => {
    if (!canvas || products.length === 0) return

    // Check for product updates and sync MenuItemComponents
    const updateMenuItems = () => {
      let hasUpdates = false

      canvas.getObjects().forEach(obj => {
        if (obj.type === 'menu-item-component') {
          const component = obj as MenuItemComponent
          const latestProduct = products.find(p => p.id === component.productId)

          if (latestProduct) {
            const currentData = component.menuItemData
            const latestData = {
              id: latestProduct.id,
              name: latestProduct.name,
              description: latestProduct.description || undefined,
              price: latestProduct.prices?.[0]?.amount || latestProduct.basePrice || '0',
              categoryId: latestProduct.categoryId || undefined,
              categoryName: latestProduct.categories?.name || undefined
            }

            // Check if data has changed
            if (
              currentData.name !== latestData.name ||
              currentData.description !== latestData.description ||
              currentData.price !== latestData.price ||
              currentData.categoryName !== latestData.categoryName
            ) {
              component.updateMenuData(latestData)
              hasUpdates = true
            }
          }
        }
      })

      if (hasUpdates) {
        canvas.renderAll()
        console.log('Updated menu items with latest data')
      }
    }

    // Clear existing timer
    if (updateCheckRef.current) {
      clearTimeout(updateCheckRef.current)
    }

    // Set up periodic updates
    updateCheckRef.current = setTimeout(updateMenuItems, 1000)

    return () => {
      if (updateCheckRef.current) {
        clearTimeout(updateCheckRef.current)
      }
    }
  }, [canvas, products])

  const handleSelectionChange = useCallback((objects: fabric.Object[]) => {
    setSelectedObjects(objects)
    // Don't auto-switch panels - let user stay in their current panel
  }, [])

  const handleTemplateLoad = useCallback((template: DesignTemplate) => {
    setCurrentTemplate(template)
    setSelectedObjects([])
  }, [])

  const handleMenuItemAdded = useCallback((component: MenuItemComponent) => {
    setMenuItemComponents(prev => {
      const newMap = new Map(prev)
      newMap.set(component.productId, component)
      return newMap
    })
  }, [])

  const addText = () => {
    if (!canvas) return
    ;(canvas as any).addText?.('Sample Text')
  }

  const addRectangle = () => {
    if (!canvas) return
    ;(canvas as any).addRectangle?.()
  }

  const addCircle = () => {
    if (!canvas) return
    ;(canvas as any).addCircle?.()
  }

  const clearCanvas = () => {
    if (!canvas) return
    ;(canvas as any).clearCanvas?.()
  }

  const zoomIn = () => {
    if (!canvas) return
    const zoom = canvas.getZoom()
    canvas.setZoom(zoom * 1.1)
  }

  const zoomOut = () => {
    if (!canvas) return
    const zoom = canvas.getZoom()
    canvas.setZoom(zoom * 0.9)
  }

  const resetZoom = () => {
    if (!canvas) return
    canvas.setZoom(1)
    canvas.viewportTransform = [1, 0, 0, 1, 0, 0]
    canvas.renderAll()
  }

  const exportToPNG = (forPrint: boolean = false) => {
    if (!canvas || !currentTemplate) return

    // Calculate proper multiplier based on template DPI and target
    const targetDPI = forPrint ? currentTemplate.size.dpi : 96
    const canvasDPI = 72 // Default canvas DPI
    const multiplier = targetDPI / canvasDPI

    // Hide non-exportable elements (grid, margins, etc.)
    const hiddenObjects: fabric.Object[] = []
    canvas.getObjects().forEach(obj => {
      if ((obj as any).excludeFromExport) {
        hiddenObjects.push(obj)
        obj.set('visible', false)
      }
    })

    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: multiplier,
    })

    // Restore hidden objects
    hiddenObjects.forEach(obj => obj.set('visible', true))
    canvas.renderAll()

    // Create download link
    const link = document.createElement('a')
    const filename = forPrint
      ? `${designName}-print-${currentTemplate.size.dpi}dpi.png`
      : `${designName}-display.png`
    link.download = filename
    link.href = dataURL
    link.click()
  }

  const exportToPDF = async () => {
    if (!canvas || !currentTemplate) return

    // Import jsPDF dynamically to avoid SSR issues
    const { jsPDF } = await import('jspdf')

    // Hide non-exportable elements
    const hiddenObjects: fabric.Object[] = []
    canvas.getObjects().forEach(obj => {
      if ((obj as any).excludeFromExport) {
        hiddenObjects.push(obj)
        obj.set('visible', false)
      }
    })

    // Calculate proper dimensions for PDF
    const template = currentTemplate
    const mmWidth = template.size.width * 25.4 / template.size.dpi
    const mmHeight = template.size.height * 25.4 / template.size.dpi

    const orientation = template.size.orientation === 'landscape' ? 'landscape' : 'portrait'

    const pdf = new jsPDF({
      orientation: orientation as any,
      unit: 'mm',
      format: [mmWidth, mmHeight],
      compress: true
    })

    // Export at high resolution for print
    const multiplier = template.size.dpi / 72
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: multiplier,
    })

    // Add image to PDF
    pdf.addImage(dataURL, 'PNG', 0, 0, mmWidth, mmHeight, undefined, 'FAST')

    // Restore hidden objects
    hiddenObjects.forEach(obj => obj.set('visible', true))
    canvas.renderAll()

    pdf.save(`${designName}-${template.size.name.toLowerCase().replace(/\s+/g, '-')}.pdf`)
  }

  const exportToJPG = () => {
    if (!canvas || !currentTemplate) return

    // Calculate proper multiplier
    const targetDPI = currentTemplate.size.dpi
    const canvasDPI = 72
    const multiplier = targetDPI / canvasDPI

    // Hide non-exportable elements
    const hiddenObjects: fabric.Object[] = []
    canvas.getObjects().forEach(obj => {
      if ((obj as any).excludeFromExport) {
        hiddenObjects.push(obj)
        obj.set('visible', false)
      }
    })

    const dataURL = canvas.toDataURL({
      format: 'jpeg',
      quality: 0.95,
      multiplier: multiplier,
    })

    // Restore hidden objects
    hiddenObjects.forEach(obj => obj.set('visible', true))
    canvas.renderAll()

    // Create download link
    const link = document.createElement('a')
    link.download = `${designName}-${currentTemplate.size.dpi}dpi.jpg`
    link.href = dataURL
    link.click()
  }

  const saveDesign = async () => {
    if (!canvas || !selectedRestaurant) {
      alert('Please select a restaurant first!')
      return
    }

    try {
      const designData = canvas.toObject()

      const result = await saveDesignMutation.mutateAsync({
        id: currentDesignId || undefined,
        name: designName,
        designData,
        restaurantId: selectedRestaurant.id,
        menuId: selectedMenu?.id,
      })

      setCurrentDesignId(result.id)
      setDesignName(result.name)
      refetchDesigns()
      alert('Design saved successfully!')
    } catch (error) {
      console.error('Error saving design:', error)
      alert('Error saving design!')
    }
  }

  const loadDesign = async (designId: string) => {
    if (!canvas || !designId) return

    try {
      const design = await trpc.design.getDesign.query({ designId })

      if (design?.designData) {
        canvas.loadFromJSON(design.designData, () => {
          canvas.renderAll()
          setCurrentDesignId(design.id)
          setDesignName(design.name || 'Untitled Design')
          alert('Design loaded successfully!')
        })
      } else {
        alert('Design data is invalid!')
      }
    } catch (error) {
      console.error('Error loading design:', error)
      alert('Error loading design!')
    }
  }

  const saveAsNewDesign = () => {
    const newName = prompt('Enter design name:', `${designName} (Copy)`)
    if (newName) {
      setCurrentDesignId(null)
      setDesignName(newName)
      saveDesign()
    }
  }

  return (
    <DashboardLayout title="Design Editor">
      <div className="h-full flex">
        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 p-3">
            {/* Top Row - Main Actions */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={saveDesign} className="flex items-center gap-1">
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Save</span>
                </Button>
                <Button size="sm" variant="outline" onClick={saveAsNewDesign} className="hidden md:flex">
                  Save As...
                </Button>
                <div className="w-px h-4 bg-gray-300 mx-1" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={redo}
                  disabled={historyIndex >= canvasHistory.length - 1}
                  title="Redo (Ctrl+Y)"
                >
                  <Redo className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={zoomOut}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={resetZoom} className="text-xs px-2">
                  Fit
                </Button>
                <Button size="sm" variant="outline" onClick={zoomIn}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Bottom Row - Panels and Export */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {/* Navigation moved to sidebar */}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportToPNG(false)}
                  disabled={!currentTemplate}
                  className="text-xs"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden md:inline ml-1">PNG</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportToPDF}
                  disabled={!currentTemplate}
                  className="text-xs"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">PDF</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportToPNG(true)}
                  disabled={!currentTemplate}
                  className="text-xs hidden lg:flex"
                >
                  <Download className="w-4 h-4" />
                  <span className="ml-1">Print</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportToJPG}
                  disabled={!currentTemplate}
                  className="text-xs hidden xl:flex"
                >
                  <Download className="w-4 h-4" />
                  <span className="ml-1">JPG</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Canvas Container */}
          <div className="flex-1 p-8 flex items-center justify-center">
            <Card className="p-4 shadow-lg">
              <FabricCanvas
                width={800}
                height={600}
                onCanvasChange={handleCanvasReady}
                onSelectionChange={handleSelectionChange}
                className="rounded-lg overflow-hidden"
              />
            </Card>
          </div>
        </div>

        {/* Right Panel - Templates, Menu Browser, or Properties */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full max-h-screen">
          {/* Panel Navigation */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={activePanel === 'templates' ? 'default' : 'outline'}
                onClick={() => setActivePanel('templates')}
                className="text-xs flex-1"
              >
                <Palette className="w-4 h-4" />
                <span className="ml-1">Templates</span>
              </Button>
              <Button
                size="sm"
                variant={activePanel === 'menu-browser' ? 'default' : 'outline'}
                onClick={() => setActivePanel('menu-browser')}
                className="text-xs flex-1"
              >
                <Menu className="w-4 h-4" />
                <span className="ml-1">Items</span>
              </Button>
              <Button
                size="sm"
                variant={activePanel === 'properties' ? 'default' : 'outline'}
                onClick={() => setActivePanel('properties')}
                className="text-xs flex-1"
              >
                <Settings className="w-4 h-4" />
                <span className="ml-1">Properties</span>
              </Button>
            </div>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-hidden">
        {activePanel === 'templates' && (
          <TemplatePanel
            canvas={canvas}
            onTemplateLoad={handleTemplateLoad}
          />
        )}
        {activePanel === 'menu-browser' && (
          <MenuBrowser
            canvas={canvas}
            currentTemplate={currentTemplate}
            onItemAdded={handleMenuItemAdded}
          />
        )}
        {activePanel === 'properties' && (
          <PropertiesPanel
            canvas={canvas}
            selectedObjects={selectedObjects}
            onAddText={addText}
            onAddRectangle={addRectangle}
            onAddCircle={addCircle}
            onDeleteSelected={deleteSelected}
            onClearCanvas={clearCanvas}
          />
        )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}