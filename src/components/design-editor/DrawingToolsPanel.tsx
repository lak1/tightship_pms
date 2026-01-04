'use client'

import { useState } from 'react'
import * as fabric from 'fabric'
import {
  Minus,
  ArrowRight,
  Pen,
  Slash,
  Triangle,
  Star,
  Heart,
  Hexagon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from '@/components/ui/separator'

interface DrawingToolsPanelProps {
  canvas: fabric.Canvas | null
}

type DrawingTool = 'line' | 'arrow' | 'curve' | 'freehand' | null

export default function DrawingToolsPanel({ canvas }: DrawingToolsPanelProps) {
  const [activeTool, setActiveTool] = useState<DrawingTool>(null)
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [strokeColor, setStrokeColor] = useState('#000000')
  const [arrowStyle, setArrowStyle] = useState<'start' | 'end' | 'both'>('end')

  const addLine = () => {
    if (!canvas) return

    const line = new fabric.Line([50, 50, 200, 50], {
      stroke: strokeColor,
      strokeWidth,
      selectable: true,
      evented: true,
    })

    canvas.add(line)
    canvas.setActiveObject(line)
    canvas.requestRenderAll()
  }

  const addArrow = () => {
    if (!canvas) return

    // Create arrow using path
    const arrowPath = createArrowPath(50, 50, 200, 50, arrowStyle)
    const arrow = new fabric.Path(arrowPath, {
      stroke: strokeColor,
      strokeWidth,
      fill: 'transparent',
      selectable: true,
      evented: true,
    })

    arrow.set('data', { type: 'arrow', arrowStyle })
    canvas.add(arrow)
    canvas.setActiveObject(arrow)
    canvas.requestRenderAll()
  }

  const createArrowPath = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    style: 'start' | 'end' | 'both'
  ): string => {
    const headLength = 15
    const angle = Math.atan2(y2 - y1, x2 - x1)

    let path = `M ${x1} ${y1} L ${x2} ${y2}`

    // Add arrowhead at end
    if (style === 'end' || style === 'both') {
      const arrowX1 = x2 - headLength * Math.cos(angle - Math.PI / 6)
      const arrowY1 = y2 - headLength * Math.sin(angle - Math.PI / 6)
      const arrowX2 = x2 - headLength * Math.cos(angle + Math.PI / 6)
      const arrowY2 = y2 - headLength * Math.sin(angle + Math.PI / 6)

      path += ` M ${arrowX1} ${arrowY1} L ${x2} ${y2} L ${arrowX2} ${arrowY2}`
    }

    // Add arrowhead at start
    if (style === 'start' || style === 'both') {
      const reverseAngle = angle + Math.PI
      const arrowX1 = x1 - headLength * Math.cos(reverseAngle - Math.PI / 6)
      const arrowY1 = y1 - headLength * Math.sin(reverseAngle - Math.PI / 6)
      const arrowX2 = x1 - headLength * Math.cos(reverseAngle + Math.PI / 6)
      const arrowY2 = y1 - headLength * Math.sin(reverseAngle + Math.PI / 6)

      path += ` M ${arrowX1} ${arrowY1} L ${x1} ${y1} L ${arrowX2} ${arrowY2}`
    }

    return path
  }

  const addCurve = () => {
    if (!canvas) return

    const curve = new fabric.Path('M 50 100 Q 150 50, 250 100', {
      stroke: strokeColor,
      strokeWidth,
      fill: 'transparent',
      selectable: true,
      evented: true,
    })

    curve.set('data', { type: 'curve' })
    canvas.add(curve)
    canvas.setActiveObject(curve)
    canvas.requestRenderAll()
  }

  const enableFreehandDrawing = () => {
    if (!canvas) return

    canvas.isDrawingMode = !canvas.isDrawingMode

    if (canvas.isDrawingMode) {
      canvas.freeDrawingBrush.width = strokeWidth
      canvas.freeDrawingBrush.color = strokeColor
      setActiveTool('freehand')
    } else {
      setActiveTool(null)
    }
  }

  const addPolygon = (sides: number) => {
    if (!canvas) return

    const points = generatePolygonPoints(sides, 50)
    const polygon = new fabric.Polygon(points, {
      left: 100,
      top: 100,
      fill: 'transparent',
      stroke: strokeColor,
      strokeWidth,
      selectable: true,
      evented: true,
    })

    polygon.set('data', { type: 'polygon', sides })
    canvas.add(polygon)
    canvas.setActiveObject(polygon)
    canvas.requestRenderAll()
  }

  const generatePolygonPoints = (sides: number, radius: number) => {
    const points = []
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2
      points.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle)
      })
    }
    return points
  }

  const addStar = () => {
    if (!canvas) return

    const points = generateStarPoints(5, 50, 25)
    const star = new fabric.Polygon(points, {
      left: 100,
      top: 100,
      fill: 'transparent',
      stroke: strokeColor,
      strokeWidth,
      selectable: true,
      evented: true,
    })

    star.set('data', { type: 'star' })
    canvas.add(star)
    canvas.setActiveObject(star)
    canvas.requestRenderAll()
  }

  const generateStarPoints = (spikes: number, outerRadius: number, innerRadius: number) => {
    const points = []
    const step = Math.PI / spikes

    for (let i = 0; i < 2 * spikes; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius
      const angle = i * step - Math.PI / 2
      points.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle)
      })
    }
    return points
  }

  return (
    <TooltipProvider>
      <div className="p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-sm mb-3">Drawing Tools</h3>

          {/* Basic Lines */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === 'line' ? 'default' : 'outline'}
                  size="icon"
                  onClick={addLine}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Line</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === 'arrow' ? 'default' : 'outline'}
                  size="icon"
                  onClick={addArrow}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Arrow</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === 'curve' ? 'default' : 'outline'}
                  size="icon"
                  onClick={addCurve}
                >
                  <Slash className="h-4 w-4 rotate-12" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Curve</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === 'freehand' ? 'default' : 'outline'}
                  size="icon"
                  onClick={enableFreehandDrawing}
                >
                  <Pen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Freehand</TooltipContent>
            </Tooltip>
          </div>

          {/* Polygons */}
          <Label className="text-xs text-muted-foreground">Polygons</Label>
          <div className="grid grid-cols-4 gap-2 mt-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => addPolygon(3)}
                >
                  <Triangle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Triangle</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => addPolygon(6)}
                >
                  <Hexagon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Hexagon</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={addStar}
                >
                  <Star className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Star</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => addPolygon(8)}
                >
                  <div className="text-xs font-bold">8</div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Octagon</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <Separator />

        {/* Stroke Settings */}
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Stroke Width: {strokeWidth}px</Label>
            <Slider
              value={[strokeWidth]}
              onValueChange={([value]) => setStrokeWidth(value)}
              min={1}
              max={20}
              step={1}
              className="mt-2"
            />
          </div>

          <div>
            <Label className="text-xs">Stroke Color</Label>
            <div className="flex gap-2 mt-2">
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="h-10 w-full rounded border cursor-pointer"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Arrow Style</Label>
            <Select value={arrowStyle} onValueChange={(value: any) => setArrowStyle(value)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="end">End Arrow</SelectItem>
                <SelectItem value="start">Start Arrow</SelectItem>
                <SelectItem value="both">Both Ends</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeTool === 'freehand' && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground">
              Freehand drawing mode active. Click and drag on the canvas to draw.
              Click the pen icon again to exit.
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
