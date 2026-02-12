'use client'

import { useState, useRef } from 'react'
import { useRestaurantMenu } from '@/contexts/RestaurantMenuContext'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Download, Eye, Save } from 'lucide-react'
import MenuTemplate from '@/components/menu-designer/MenuTemplate'
import CustomizationPanel from '@/components/menu-designer/CustomizationPanel'

export default function MenuDesignerPage() {
  const { selectedRestaurant, selectedMenu } = useRestaurantMenu()
  const menuPreviewRef = useRef<HTMLDivElement>(null)

  const [customization, setCustomization] = useState({
    primaryColor: '#1a1a1a',
    secondaryColor: '#d4af37',
    fontFamily: 'Georgia, serif',
    logoUrl: undefined as string | undefined,
  })

  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')

  // Fetch menu items
  const { data: productsData } = trpc.product.list.useQuery(
    {
      restaurantId: selectedRestaurant?.id || '',
      menuId: selectedMenu?.id || '',
      limit: 500,
    },
    {
      enabled: !!selectedRestaurant?.id && !!selectedMenu?.id,
    }
  )

  const handleUpdateCustomization = (updates: Partial<typeof customization>) => {
    setCustomization(prev => ({ ...prev, ...updates }))
  }

  const handleExportPDF = async () => {
    // This will use Puppeteer on the backend later
    // For now, just trigger browser print
    window.print()
  }

  const handleExportImage = async () => {
    if (!menuPreviewRef.current) return

    // Use html2canvas to convert to image
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(menuPreviewRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
    })

    // Download as PNG
    const link = document.createElement('a')
    link.download = `${selectedRestaurant?.name || 'menu'}-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handleSaveDesign = () => {
    // TODO: Save customization to database
    alert('Design saved! (Feature coming soon)')
  }

  if (!selectedRestaurant || !selectedMenu) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">No Restaurant Selected</h1>
          <p className="mt-2 text-gray-600">Please select a restaurant and menu to continue.</p>
        </div>
      </div>
    )
  }

  const items = productsData?.products || []

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Menu Designer</h1>
            <p className="text-sm text-gray-600">
              {selectedRestaurant.name} - {selectedMenu.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'edit' ? 'default' : 'outline'}
              onClick={() => setViewMode('edit')}
            >
              <Eye className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant={viewMode === 'preview' ? 'default' : 'outline'}
              onClick={() => setViewMode('preview')}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button variant="outline" onClick={handleSaveDesign}>
              <Save className="mr-2 h-4 w-4" />
              Save Design
            </Button>
            <Button onClick={handleExportImage}>
              <Download className="mr-2 h-4 w-4" />
              Export Image
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Customization Panel */}
        {viewMode === 'edit' && (
          <div className="w-96 overflow-y-auto border-r bg-gray-50 p-6">
            <CustomizationPanel
              customization={customization}
              onUpdate={handleUpdateCustomization}
            />
          </div>
        )}

        {/* Menu Preview */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-8">
          <div ref={menuPreviewRef}>
            <MenuTemplate
              restaurantName={selectedRestaurant.name}
              items={items}
              customization={customization}
            />
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #menu-preview,
          #menu-preview * {
            visibility: visible;
          }
          #menu-preview {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  )
}
