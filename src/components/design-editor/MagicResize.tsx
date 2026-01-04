'use client'

import { useState } from 'react'
import * as fabric from 'fabric'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Maximize2, FileText } from 'lucide-react'

interface MagicResizeProps {
  canvas: fabric.Canvas | null
  isOpen: boolean
  onClose: () => void
}

interface ResizeOption {
  id: string
  name: string
  width: number
  height: number
  dpi: number
  description: string
}

const RESIZE_OPTIONS: ResizeOption[] = [
  { id: 'a4-portrait', name: 'A4 Portrait', width: 2480, height: 3508, dpi: 300, description: '210 × 297 mm' },
  { id: 'a4-landscape', name: 'A4 Landscape', width: 3508, height: 2480, dpi: 300, description: '297 × 210 mm' },
  { id: 'a3-portrait', name: 'A3 Portrait', width: 3508, height: 4960, dpi: 300, description: '297 × 420 mm' },
  { id: 'a3-landscape', name: 'A3 Landscape', width: 4960, height: 3508, dpi: 300, description: '420 × 297 mm' },
  { id: 'letter-portrait', name: 'Letter Portrait', width: 2550, height: 3300, dpi: 300, description: '8.5 × 11 in' },
  { id: 'letter-landscape', name: 'Letter Landscape', width: 3300, height: 2550, dpi: 300, description: '11 × 8.5 in' },
  { id: 'tabloid-portrait', name: 'Tabloid Portrait', width: 3300, height: 5100, dpi: 300, description: '11 × 17 in' },
  { id: 'tabloid-landscape', name: 'Tabloid Landscape', width: 5100, height: 3300, dpi: 300, description: '17 × 11 in' },
  { id: 'digital-hd', name: 'HD Digital', width: 1920, height: 1080, dpi: 96, description: '1920 × 1080 px' },
  { id: 'digital-4k', name: '4K Digital', width: 3840, height: 2160, dpi: 96, description: '3840 × 2160 px' },
]

export default function MagicResize({ canvas, isOpen, onClose }: MagicResizeProps) {
  const [selectedSize, setSelectedSize] = useState<ResizeOption | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleResize = async () => {
    if (!canvas || !selectedSize) return

    setIsProcessing(true)

    try {
      const currentWidth = canvas.width!
      const currentHeight = canvas.height!
      const newWidth = selectedSize.width
      const newHeight = selectedSize.height

      // Calculate scale factors
      const scaleX = newWidth / currentWidth
      const scaleY = newHeight / currentHeight
      const uniformScale = Math.min(scaleX, scaleY)

      // Get all objects
      const objects = canvas.getObjects()

      // Resize canvas
      canvas.setDimensions({ width: newWidth, height: newHeight })

      // Scale and reposition all objects
      objects.forEach(obj => {
        // Skip grid lines and guides
        if ((obj as any).excludeFromExport) return

        const objLeft = obj.left || 0
        const objTop = obj.top || 0
        const objScaleX = obj.scaleX || 1
        const objScaleY = obj.scaleY || 1

        // Reposition
        obj.set({
          left: objLeft * scaleX,
          top: objTop * scaleY,
          scaleX: objScaleX * uniformScale,
          scaleY: objScaleY * uniformScale,
        })

        // Scale font size for text objects
        if (obj instanceof fabric.Text) {
          const currentFontSize = obj.fontSize || 16
          obj.set({
            fontSize: currentFontSize * uniformScale,
            scaleX: objScaleX, // Reset scale after font size adjustment
            scaleY: objScaleY,
          })
        }

        obj.setCoords()
      })

      canvas.requestRenderAll()
      onClose()
    } catch (error) {
      console.error('Error resizing canvas:', error)
      alert('Failed to resize. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Maximize2 className="h-5 w-5" />
            Magic Resize
          </DialogTitle>
          <DialogDescription>
            Intelligently resize your design to a different paper size. All elements will be scaled proportionally.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-3">
          {RESIZE_OPTIONS.map(option => (
            <button
              key={option.id}
              onClick={() => setSelectedSize(option)}
              className={`flex flex-col items-start rounded-lg border-2 p-4 text-left transition-all hover:border-blue-400 hover:bg-blue-50 ${
                selectedSize?.id === option.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <FileText className={`mb-2 h-5 w-5 ${
                selectedSize?.id === option.id ? 'text-blue-600' : 'text-gray-400'
              }`} />
              <div className="font-semibold text-gray-900">{option.name}</div>
              <div className="mt-1 text-xs text-gray-500">{option.description}</div>
              <div className="mt-2 text-xs text-gray-400">
                {option.width} × {option.height} px
              </div>
            </button>
          ))}
        </div>

        {selectedSize && (
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              <strong>Selected:</strong> {selectedSize.name} ({selectedSize.description})
              <br />
              <strong>Resolution:</strong> {selectedSize.width} × {selectedSize.height} pixels at {selectedSize.dpi} DPI
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleResize}
            disabled={!selectedSize || isProcessing}
          >
            {isProcessing ? 'Resizing...' : 'Apply Resize'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
