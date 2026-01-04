'use client'

import * as fabric from 'fabric'
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Maximize2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface AlignmentToolbarProps {
  canvas: fabric.Canvas | null
}

export default function AlignmentToolbar({ canvas }: AlignmentToolbarProps) {
  const hasSelection = canvas?.getActiveObjects().length ?? 0 > 0
  const hasMultipleSelection = canvas?.getActiveObjects().length ?? 0 > 1

  const alignLeft = () => {
    if (!canvas) return
    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length === 0) return

    const leftmost = Math.min(...activeObjects.map(obj => obj.left || 0))
    activeObjects.forEach(obj => {
      obj.set({ left: leftmost })
      obj.setCoords()
    })
    canvas.requestRenderAll()
  }

  const alignCenter = () => {
    if (!canvas) return
    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length === 0) return

    // Calculate bounding box of all selected objects
    const left = Math.min(...activeObjects.map(obj => obj.left || 0))
    const right = Math.max(...activeObjects.map(obj => (obj.left || 0) + (obj.width || 0) * (obj.scaleX || 1)))
    const centerX = left + (right - left) / 2

    activeObjects.forEach(obj => {
      const objWidth = (obj.width || 0) * (obj.scaleX || 1)
      obj.set({ left: centerX - objWidth / 2 })
      obj.setCoords()
    })
    canvas.requestRenderAll()
  }

  const alignRight = () => {
    if (!canvas) return
    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length === 0) return

    const rightmost = Math.max(...activeObjects.map(obj => (obj.left || 0) + (obj.width || 0) * (obj.scaleX || 1)))
    activeObjects.forEach(obj => {
      const objWidth = (obj.width || 0) * (obj.scaleX || 1)
      obj.set({ left: rightmost - objWidth })
      obj.setCoords()
    })
    canvas.requestRenderAll()
  }

  const alignTop = () => {
    if (!canvas) return
    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length === 0) return

    const topmost = Math.min(...activeObjects.map(obj => obj.top || 0))
    activeObjects.forEach(obj => {
      obj.set({ top: topmost })
      obj.setCoords()
    })
    canvas.requestRenderAll()
  }

  const alignMiddle = () => {
    if (!canvas) return
    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length === 0) return

    // Calculate bounding box of all selected objects
    const top = Math.min(...activeObjects.map(obj => obj.top || 0))
    const bottom = Math.max(...activeObjects.map(obj => (obj.top || 0) + (obj.height || 0) * (obj.scaleY || 1)))
    const centerY = top + (bottom - top) / 2

    activeObjects.forEach(obj => {
      const objHeight = (obj.height || 0) * (obj.scaleY || 1)
      obj.set({ top: centerY - objHeight / 2 })
      obj.setCoords()
    })
    canvas.requestRenderAll()
  }

  const alignBottom = () => {
    if (!canvas) return
    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length === 0) return

    const bottommost = Math.max(...activeObjects.map(obj => (obj.top || 0) + (obj.height || 0) * (obj.scaleY || 1)))
    activeObjects.forEach(obj => {
      const objHeight = (obj.height || 0) * (obj.scaleY || 1)
      obj.set({ top: bottommost - objHeight })
      obj.setCoords()
    })
    canvas.requestRenderAll()
  }

  const distributeHorizontal = () => {
    if (!canvas) return
    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length < 3) return

    // Sort objects by left position
    const sorted = [...activeObjects].sort((a, b) => (a.left || 0) - (b.left || 0))

    const leftmost = sorted[0].left || 0
    const rightmost = (sorted[sorted.length - 1].left || 0) +
      (sorted[sorted.length - 1].width || 0) * (sorted[sorted.length - 1].scaleX || 1)

    const totalWidth = sorted.reduce((sum, obj) => sum + (obj.width || 0) * (obj.scaleX || 1), 0)
    const spacing = (rightmost - leftmost - totalWidth) / (sorted.length - 1)

    let currentX = leftmost
    sorted.forEach((obj, index) => {
      if (index > 0 && index < sorted.length - 1) {
        obj.set({ left: currentX })
        obj.setCoords()
      }
      currentX += (obj.width || 0) * (obj.scaleX || 1) + spacing
    })

    canvas.requestRenderAll()
  }

  const distributeVertical = () => {
    if (!canvas) return
    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length < 3) return

    // Sort objects by top position
    const sorted = [...activeObjects].sort((a, b) => (a.top || 0) - (b.top || 0))

    const topmost = sorted[0].top || 0
    const bottommost = (sorted[sorted.length - 1].top || 0) +
      (sorted[sorted.length - 1].height || 0) * (sorted[sorted.length - 1].scaleY || 1)

    const totalHeight = sorted.reduce((sum, obj) => sum + (obj.height || 0) * (obj.scaleY || 1), 0)
    const spacing = (bottommost - topmost - totalHeight) / (sorted.length - 1)

    let currentY = topmost
    sorted.forEach((obj, index) => {
      if (index > 0 && index < sorted.length - 1) {
        obj.set({ top: currentY })
        obj.setCoords()
      }
      currentY += (obj.height || 0) * (obj.scaleY || 1) + spacing
    })

    canvas.requestRenderAll()
  }

  const centerToCanvas = () => {
    if (!canvas) return
    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length === 0) return

    const canvasWidth = canvas.getWidth()
    const canvasHeight = canvas.getHeight()

    activeObjects.forEach(obj => {
      const objWidth = (obj.width || 0) * (obj.scaleX || 1)
      const objHeight = (obj.height || 0) * (obj.scaleY || 1)

      obj.set({
        left: (canvasWidth - objWidth) / 2,
        top: (canvasHeight - objHeight) / 2
      })
      obj.setCoords()
    })

    canvas.requestRenderAll()
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-2 bg-background border rounded-lg">
        {/* Horizontal Alignment */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={alignLeft}
                disabled={!hasSelection}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align Left</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={alignCenter}
                disabled={!hasSelection}
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align Center</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={alignRight}
                disabled={!hasSelection}
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align Right</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Vertical Alignment */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={alignTop}
                disabled={!hasSelection}
              >
                <AlignVerticalJustifyStart className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align Top</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={alignMiddle}
                disabled={!hasSelection}
              >
                <AlignVerticalJustifyCenter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align Middle</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={alignBottom}
                disabled={!hasSelection}
              >
                <AlignVerticalJustifyEnd className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align Bottom</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Distribution */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={distributeHorizontal}
                disabled={!hasMultipleSelection || (canvas?.getActiveObjects().length ?? 0) < 3}
              >
                <AlignHorizontalDistributeCenter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Distribute Horizontally</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={distributeVertical}
                disabled={!hasMultipleSelection || (canvas?.getActiveObjects().length ?? 0) < 3}
              >
                <AlignVerticalDistributeCenter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Distribute Vertically</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Center to Canvas */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={centerToCanvas}
              disabled={!hasSelection}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Center to Canvas</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
