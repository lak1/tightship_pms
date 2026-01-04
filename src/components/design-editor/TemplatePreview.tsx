'use client'

import { useRef, useEffect } from 'react'
import * as fabric from 'fabric'
import { DesignTemplate } from './templates'
import { Badge } from '@/components/ui/badge'

interface TemplatePreviewProps {
  template: DesignTemplate
  width?: number
  height?: number
  sampleData?: {
    restaurantName: string
    categoryName: string
    itemName: string
    itemPrice: string
    itemDescription: string
  }
}

export default function TemplatePreview({
  template,
  width = 120,
  height = 160,
  sampleData = {
    restaurantName: 'Restaurant Name',
    categoryName: 'Appetizers',
    itemName: 'Sample Item',
    itemPrice: '12.99',
    itemDescription: 'Delicious sample description'
  }
}: TemplatePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // Clean up existing canvas
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose()
    }

    // Create new canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: template.backgroundColor,
      selection: false,
      hoverCursor: 'default',
      moveCursor: 'default'
    })

    fabricCanvasRef.current = canvas

    // Calculate scale factor for preview
    const scaleX = width / template.size.width
    const scaleY = height / template.size.height
    const scale = Math.min(scaleX, scaleY)

    // Add sample content
    const previewContent = createPreviewContent(template, sampleData, scale)
    previewContent.forEach(obj => canvas.add(obj))

    canvas.renderAll()

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose()
        fabricCanvasRef.current = null
      }
    }
  }, [template, width, height, sampleData])

  const createPreviewContent = (template: DesignTemplate, data: any, scale: number) => {
    const objects: fabric.Object[] = []

    // Scale margins
    const margins = {
      top: template.margins.top * scale,
      left: template.margins.left * scale,
      right: template.margins.right * scale,
      bottom: template.margins.bottom * scale
    }

    let currentY = margins.top

    // Restaurant name (scaled down)
    const restaurantName = new fabric.Text(data.restaurantName.toUpperCase(), {
      fontSize: template.defaultStyles.heading.fontSize * scale * 0.6,
      fontFamily: template.defaultStyles.heading.fontFamily,
      fontWeight: template.defaultStyles.heading.fontWeight,
      fill: template.defaultStyles.heading.color,
      left: width / 2,
      top: currentY,
      originX: 'center',
      selectable: false,
      evented: false
    })
    objects.push(restaurantName)
    currentY += restaurantName.height! + 10 * scale

    // Decorative line
    const line = new fabric.Rect({
      left: margins.left,
      top: currentY,
      width: width - margins.left - margins.right,
      height: 1 * scale,
      fill: template.defaultStyles.heading.color,
      selectable: false,
      evented: false
    })
    objects.push(line)
    currentY += 15 * scale

    // Category header
    const categoryHeader = new fabric.Text(data.categoryName.toUpperCase(), {
      fontSize: template.defaultStyles.category.fontSize * scale * 0.8,
      fontFamily: template.defaultStyles.category.fontFamily,
      fontWeight: template.defaultStyles.category.fontWeight,
      fill: template.defaultStyles.category.color,
      left: margins.left,
      top: currentY,
      selectable: false,
      evented: false
    })
    objects.push(categoryHeader)
    currentY += categoryHeader.height! + 8 * scale

    // Sample menu item
    const itemName = new fabric.Text(data.itemName, {
      fontSize: template.defaultStyles.itemName.fontSize * scale * 0.7,
      fontFamily: template.defaultStyles.itemName.fontFamily,
      fontWeight: template.defaultStyles.itemName.fontWeight,
      fill: template.defaultStyles.itemName.color,
      left: margins.left,
      top: currentY,
      selectable: false,
      evented: false
    })
    objects.push(itemName)

    const itemPrice = new fabric.Text(`£${data.itemPrice}`, {
      fontSize: template.defaultStyles.itemPrice.fontSize * scale * 0.7,
      fontFamily: template.defaultStyles.itemPrice.fontFamily,
      fontWeight: template.defaultStyles.itemPrice.fontWeight,
      fill: template.defaultStyles.itemPrice.color,
      left: width - margins.right - 30 * scale,
      top: currentY,
      selectable: false,
      evented: false
    })
    objects.push(itemPrice)
    currentY += Math.max(itemName.height!, itemPrice.height!) + 5 * scale

    // Sample description (truncated)
    const truncatedDesc = data.itemDescription.length > 25
      ? data.itemDescription.substring(0, 22) + '...'
      : data.itemDescription

    const itemDescription = new fabric.Text(truncatedDesc, {
      fontSize: template.defaultStyles.itemDescription.fontSize * scale * 0.6,
      fontFamily: template.defaultStyles.itemDescription.fontFamily,
      fontWeight: template.defaultStyles.itemDescription.fontWeight,
      fill: template.defaultStyles.itemDescription.color,
      left: margins.left,
      top: currentY,
      selectable: false,
      evented: false
    })
    objects.push(itemDescription)

    return objects
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="border border-gray-200 rounded"
      />
      <div className="absolute top-1 right-1">
        <Badge variant="secondary" className="text-xs">
          {template.size.orientation}
        </Badge>
      </div>
    </div>
  )
}