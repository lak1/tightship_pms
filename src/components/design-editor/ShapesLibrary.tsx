'use client'

import * as fabric from 'fabric'
import {
  Square,
  Circle,
  Triangle,
  Star,
  Heart,
  Hexagon,
  Utensils,
  Coffee,
  Wine,
  Pizza,
  IceCream,
  Cake,
  Apple,
  Salad
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ShapesLibraryProps {
  canvas: fabric.Canvas | null
}

export default function ShapesLibrary({ canvas }: ShapesLibraryProps) {

  const addRectangle = () => {
    if (!canvas) return

    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 60,
      fill: '#3b82f6',
      stroke: '#1e40af',
      strokeWidth: 2,
      rx: 0,
      ry: 0,
    })

    canvas.add(rect)
    canvas.setActiveObject(rect)
    canvas.requestRenderAll()
  }

  const addRoundedRect = () => {
    if (!canvas) return

    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 60,
      fill: '#3b82f6',
      stroke: '#1e40af',
      strokeWidth: 2,
      rx: 10,
      ry: 10,
    })

    canvas.add(rect)
    canvas.setActiveObject(rect)
    canvas.requestRenderAll()
  }

  const addCircle = () => {
    if (!canvas) return

    const circle = new fabric.Circle({
      left: 100,
      top: 100,
      radius: 50,
      fill: '#10b981',
      stroke: '#047857',
      strokeWidth: 2,
    })

    canvas.add(circle)
    canvas.setActiveObject(circle)
    canvas.requestRenderAll()
  }

  const addEllipse = () => {
    if (!canvas) return

    const ellipse = new fabric.Ellipse({
      left: 100,
      top: 100,
      rx: 60,
      ry: 40,
      fill: '#10b981',
      stroke: '#047857',
      strokeWidth: 2,
    })

    canvas.add(ellipse)
    canvas.setActiveObject(ellipse)
    canvas.requestRenderAll()
  }

  const addTriangle = () => {
    if (!canvas) return

    const triangle = new fabric.Triangle({
      left: 100,
      top: 100,
      width: 80,
      height: 80,
      fill: '#f59e0b',
      stroke: '#d97706',
      strokeWidth: 2,
    })

    canvas.add(triangle)
    canvas.setActiveObject(triangle)
    canvas.requestRenderAll()
  }

  const addStar = (points: number = 5) => {
    if (!canvas) return

    const starPoints = []
    const outerRadius = 50
    const innerRadius = 25
    const step = Math.PI / points

    for (let i = 0; i < 2 * points; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius
      const angle = i * step - Math.PI / 2
      starPoints.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle)
      })
    }

    const star = new fabric.Polygon(starPoints, {
      left: 100,
      top: 100,
      fill: '#eab308',
      stroke: '#ca8a04',
      strokeWidth: 2,
    })

    canvas.add(star)
    canvas.setActiveObject(star)
    canvas.requestRenderAll()
  }

  const addHeart = () => {
    if (!canvas) return

    // Create heart shape using SVG path
    const heartPath = 'M 50 90 C 20 70, 5 45, 5 30 C 5 10, 20 0, 35 0 C 50 0, 50 10, 50 10 C 50 10, 50 0, 65 0 C 80 0, 95 10, 95 30 C 95 45, 80 70, 50 90 Z'

    const heart = new fabric.Path(heartPath, {
      left: 100,
      top: 100,
      fill: '#ef4444',
      stroke: '#dc2626',
      strokeWidth: 2,
      scaleX: 0.8,
      scaleY: 0.8,
    })

    canvas.add(heart)
    canvas.setActiveObject(heart)
    canvas.requestRenderAll()
  }

  const addPolygon = (sides: number) => {
    if (!canvas) return

    const points = []
    const radius = 50

    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2
      points.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle)
      })
    }

    const polygon = new fabric.Polygon(points, {
      left: 100,
      top: 100,
      fill: '#8b5cf6',
      stroke: '#7c3aed',
      strokeWidth: 2,
    })

    canvas.add(polygon)
    canvas.setActiveObject(polygon)
    canvas.requestRenderAll()
  }

  const addFoodIcon = (type: string) => {
    if (!canvas) return

    // Create simple SVG-based food icons
    let iconPath = ''
    let color = '#000000'

    switch (type) {
      case 'utensils':
        iconPath = 'M 30 10 L 30 90 M 20 10 L 20 30 M 40 10 L 40 30 M 70 10 L 70 90 L 60 80 L 80 80 Z'
        color = '#64748b'
        break
      case 'coffee':
        iconPath = 'M 20 30 L 20 70 L 70 70 L 70 30 L 20 30 M 70 40 L 85 40 C 90 40, 90 60, 85 60 L 70 60'
        color = '#92400e'
        break
      case 'wine':
        iconPath = 'M 30 10 L 30 40 C 30 60, 70 60, 70 40 L 70 10 M 50 60 L 50 80 M 35 80 L 65 80'
        color = '#7f1d1d'
        break
      case 'pizza':
        iconPath = 'M 50 10 L 90 90 L 10 90 Z M 50 30 C 50 30, 40 35, 40 45 M 60 50 C 60 50, 70 55, 70 65'
        color = '#ea580c'
        break
    }

    if (iconPath) {
      const icon = new fabric.Path(iconPath, {
        left: 100,
        top: 100,
        fill: 'transparent',
        stroke: color,
        strokeWidth: 3,
        scaleX: 0.8,
        scaleY: 0.8,
      })

      canvas.add(icon)
      canvas.setActiveObject(icon)
      canvas.requestRenderAll()
    }
  }

  const addDecorative = (type: string) => {
    if (!canvas) return

    let shape: fabric.Object | null = null

    switch (type) {
      case 'divider':
        shape = new fabric.Line([0, 0, 200, 0], {
          stroke: '#6b7280',
          strokeWidth: 2,
          strokeDashArray: [10, 5],
          left: 100,
          top: 100,
        })
        break
      case 'badge':
        const badgePoints = []
        const sides = 8
        const outerRadius = 40
        const innerRadius = 35

        for (let i = 0; i < sides * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius
          const angle = (i * Math.PI) / sides
          badgePoints.push({
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle)
          })
        }

        shape = new fabric.Polygon(badgePoints, {
          left: 100,
          top: 100,
          fill: '#fbbf24',
          stroke: '#f59e0b',
          strokeWidth: 2,
        })
        break
      case 'burst':
        const burstPoints = []
        const spikes = 12
        const burstOuter = 50
        const burstInner = 30

        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? burstOuter : burstInner
          const angle = (i * Math.PI) / spikes - Math.PI / 2
          burstPoints.push({
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle)
          })
        }

        shape = new fabric.Polygon(burstPoints, {
          left: 100,
          top: 100,
          fill: '#fb923c',
          stroke: '#f97316',
          strokeWidth: 2,
        })
        break
    }

    if (shape) {
      canvas.add(shape)
      canvas.setActiveObject(shape)
      canvas.requestRenderAll()
    }
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm">Shapes Library</h3>
        </div>

        <Tabs defaultValue="basic" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2">
            <TabsTrigger value="basic" className="text-xs">Basic</TabsTrigger>
            <TabsTrigger value="food" className="text-xs">Food</TabsTrigger>
            <TabsTrigger value="decorative" className="text-xs">Decorative</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Rectangles */}
                <div>
                  <h4 className="text-xs font-medium mb-2">Rectangles</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={addRectangle}>
                          <Square className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Rectangle</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={addRoundedRect}>
                          <div className="text-xs font-bold">□</div>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Rounded Rectangle</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Circles */}
                <div>
                  <h4 className="text-xs font-medium mb-2">Circles</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={addCircle}>
                          <Circle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Circle</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={addEllipse}>
                          <div className="w-5 h-3 border-2 border-current rounded-full"></div>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ellipse</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Polygons */}
                <div>
                  <h4 className="text-xs font-medium mb-2">Polygons</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={addTriangle}>
                          <Triangle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Triangle</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => addPolygon(5)}>
                          <div className="text-xs font-bold">⬟</div>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Pentagon</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => addPolygon(6)}>
                          <Hexagon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Hexagon</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => addPolygon(8)}>
                          <div className="text-xs font-bold">⯃</div>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Octagon</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Special Shapes */}
                <div>
                  <h4 className="text-xs font-medium mb-2">Special</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => addStar(5)}>
                          <Star className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Star</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={addHeart}>
                          <Heart className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Heart</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="food" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                <div className="grid grid-cols-3 gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => addFoodIcon('utensils')}>
                        <Utensils className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Utensils</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => addFoodIcon('coffee')}>
                        <Coffee className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Coffee</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => addFoodIcon('wine')}>
                        <Wine className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Wine</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => addFoodIcon('pizza')}>
                        <Pizza className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Pizza</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="decorative" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                <div className="grid grid-cols-3 gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => addDecorative('divider')}>
                        <div className="w-4 h-0.5 bg-current"></div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Divider Line</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => addDecorative('badge')}>
                        <div className="text-xs font-bold">★</div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Badge</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => addDecorative('burst')}>
                        <div className="text-xs font-bold">✱</div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Burst</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}
