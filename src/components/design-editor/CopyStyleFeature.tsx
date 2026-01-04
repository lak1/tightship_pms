'use client'

import { useState, useEffect } from 'react'
import * as fabric from 'fabric'
import { Button } from '@/components/ui/button'
import { Palette, Check } from 'lucide-react'

interface CopyStyleFeatureProps {
  canvas: fabric.Canvas | null
}

interface CopiedStyle {
  fill?: string | fabric.Pattern | fabric.Gradient
  stroke?: string
  strokeWidth?: number
  opacity?: number
  shadow?: fabric.Shadow
  fontFamily?: string
  fontSize?: number
  fontWeight?: string | number
  fontStyle?: string
  textAlign?: string
  underline?: boolean
  lineHeight?: number
}

export default function CopyStyleFeature({ canvas }: CopyStyleFeatureProps) {
  const [copiedStyle, setCopiedStyle] = useState<CopiedStyle | null>(null)
  const [showNotification, setShowNotification] = useState(false)
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null)

  useEffect(() => {
    if (!canvas) return

    const handleSelection = () => {
      const activeObject = canvas.getActiveObject()
      setSelectedObject(activeObject || null)
    }

    canvas.on('selection:created', handleSelection)
    canvas.on('selection:updated', handleSelection)
    canvas.on('selection:cleared', () => setSelectedObject(null))

    // Keyboard shortcut: Ctrl+Shift+C to copy style, Ctrl+Shift+V to paste style
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        handleCopyStyle()
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        handlePasteStyle()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      canvas.off('selection:created')
      canvas.off('selection:updated')
      canvas.off('selection:cleared')
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [canvas, copiedStyle])

  const handleCopyStyle = () => {
    if (!canvas || !selectedObject) return

    const style: CopiedStyle = {
      fill: selectedObject.fill,
      stroke: selectedObject.stroke,
      strokeWidth: selectedObject.strokeWidth,
      opacity: selectedObject.opacity,
      shadow: selectedObject.shadow,
    }

    // Copy text-specific properties if it's a text object
    if (selectedObject instanceof fabric.Text) {
      Object.assign(style, {
        fontFamily: selectedObject.fontFamily,
        fontSize: selectedObject.fontSize,
        fontWeight: selectedObject.fontWeight,
        fontStyle: selectedObject.fontStyle,
        textAlign: selectedObject.textAlign,
        underline: selectedObject.underline,
        lineHeight: selectedObject.lineHeight,
      })
    }

    setCopiedStyle(style)
    showSuccessNotification('Style copied!')
  }

  const handlePasteStyle = () => {
    if (!canvas || !selectedObject || !copiedStyle) return

    // Apply common properties
    selectedObject.set({
      fill: copiedStyle.fill,
      stroke: copiedStyle.stroke,
      strokeWidth: copiedStyle.strokeWidth,
      opacity: copiedStyle.opacity,
      shadow: copiedStyle.shadow,
    })

    // Apply text properties if both source and target are text objects
    if (selectedObject instanceof fabric.Text && copiedStyle.fontFamily) {
      selectedObject.set({
        fontFamily: copiedStyle.fontFamily,
        fontSize: copiedStyle.fontSize,
        fontWeight: copiedStyle.fontWeight,
        fontStyle: copiedStyle.fontStyle,
        textAlign: copiedStyle.textAlign,
        underline: copiedStyle.underline,
        lineHeight: copiedStyle.lineHeight,
      })
    }

    canvas.requestRenderAll()
    showSuccessNotification('Style applied!')
  }

  const showSuccessNotification = (message: string) => {
    setShowNotification(true)
    setTimeout(() => setShowNotification(false), 2000)
  }

  if (!canvas) return null

  return (
    <>
      {/* Style Toolbar */}
      {selectedObject && (
        <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-lg">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyStyle}
            className="flex items-center gap-2"
          >
            <Palette className="h-4 w-4" />
            Copy Style
            <span className="ml-1 text-xs text-gray-400">Ctrl+Shift+C</span>
          </Button>

          {copiedStyle && (
            <Button
              size="sm"
              variant="default"
              onClick={handlePasteStyle}
              className="flex items-center gap-2"
            >
              <Palette className="h-4 w-4" />
              Paste Style
              <span className="ml-1 text-xs text-gray-400">Ctrl+Shift+V</span>
            </Button>
          )}
        </div>
      )}

      {/* Success Notification */}
      {showNotification && (
        <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white shadow-lg">
          <Check className="h-4 w-4" />
          <span className="text-sm font-medium">Style copied successfully!</span>
        </div>
      )}
    </>
  )
}
