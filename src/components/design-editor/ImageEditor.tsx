'use client'

import { useState, useRef, useEffect } from 'react'
import * as fabric from 'fabric'
import { Upload, Image as ImageIcon, Crop, RotateCw, Palette, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from '@/lib/utils'

interface ImageEditorProps {
  canvas: fabric.Canvas | null
  onImageAdded?: (image: fabric.Image) => void
}

export default function ImageEditor({ canvas, onImageAdded }: ImageEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedImage, setSelectedImage] = useState<fabric.Image | null>(null)
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [saturation, setSaturation] = useState(0)
  const [blur, setBlur] = useState(0)

  useEffect(() => {
    if (!canvas) return

    const handleSelection = () => {
      const active = canvas.getActiveObject()
      if (active && active instanceof fabric.Image) {
        setSelectedImage(active as fabric.Image)
      } else {
        setSelectedImage(null)
      }
    }

    canvas.on('selection:created', handleSelection)
    canvas.on('selection:updated', handleSelection)
    canvas.on('selection:cleared', () => setSelectedImage(null))

    return () => {
      canvas.off('selection:created', handleSelection)
      canvas.off('selection:updated', handleSelection)
      canvas.off('selection:cleared')
    }
  }, [canvas])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !canvas) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string

      fabric.Image.fromURL(imgUrl, (img) => {
        // Scale image to fit canvas if too large
        const maxWidth = canvas.getWidth() * 0.8
        const maxHeight = canvas.getHeight() * 0.8

        const scale = Math.min(
          maxWidth / (img.width || 1),
          maxHeight / (img.height || 1),
          1
        )

        img.set({
          left: 100,
          top: 100,
          scaleX: scale,
          scaleY: scale,
        })

        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.requestRenderAll()

        setSelectedImage(img)
        onImageAdded?.(img)
      })
    }
    reader.readAsDataURL(file)

    // Reset input
    e.target.value = ''
  }

  const applyFilter = (filterType: string) => {
    if (!selectedImage) return

    selectedImage.filters = selectedImage.filters || []

    switch (filterType) {
      case 'grayscale':
        selectedImage.filters.push(new fabric.Image.filters.Grayscale())
        break
      case 'sepia':
        selectedImage.filters.push(new fabric.Image.filters.Sepia())
        break
      case 'invert':
        selectedImage.filters.push(new fabric.Image.filters.Invert())
        break
      case 'vintage':
        selectedImage.filters.push(
          new fabric.Image.filters.Sepia(),
          new fabric.Image.filters.Brightness({ brightness: -0.1 }),
          new fabric.Image.filters.Contrast({ contrast: 0.1 })
        )
        break
      case 'none':
        selectedImage.filters = []
        setBrightness(0)
        setContrast(0)
        setSaturation(0)
        setBlur(0)
        break
    }

    selectedImage.applyFilters()
    canvas?.requestRenderAll()
  }

  const updateBrightness = (value: number) => {
    if (!selectedImage) return
    setBrightness(value)

    const brightnessValue = value / 100
    selectedImage.filters = selectedImage.filters || []

    // Remove old brightness filter
    selectedImage.filters = selectedImage.filters.filter(
      f => !(f instanceof fabric.Image.filters.Brightness)
    )

    if (brightnessValue !== 0) {
      selectedImage.filters.push(
        new fabric.Image.filters.Brightness({ brightness: brightnessValue })
      )
    }

    selectedImage.applyFilters()
    canvas?.requestRenderAll()
  }

  const updateContrast = (value: number) => {
    if (!selectedImage) return
    setContrast(value)

    const contrastValue = value / 100
    selectedImage.filters = selectedImage.filters || []

    // Remove old contrast filter
    selectedImage.filters = selectedImage.filters.filter(
      f => !(f instanceof fabric.Image.filters.Contrast)
    )

    if (contrastValue !== 0) {
      selectedImage.filters.push(
        new fabric.Image.filters.Contrast({ contrast: contrastValue })
      )
    }

    selectedImage.applyFilters()
    canvas?.requestRenderAll()
  }

  const updateSaturation = (value: number) => {
    if (!selectedImage) return
    setSaturation(value)

    const saturationValue = value / 100
    selectedImage.filters = selectedImage.filters || []

    // Remove old saturation filter
    selectedImage.filters = selectedImage.filters.filter(
      f => !(f instanceof fabric.Image.filters.Saturation)
    )

    if (saturationValue !== 0) {
      selectedImage.filters.push(
        new fabric.Image.filters.Saturation({ saturation: saturationValue })
      )
    }

    selectedImage.applyFilters()
    canvas?.requestRenderAll()
  }

  const updateBlur = (value: number) => {
    if (!selectedImage) return
    setBlur(value)

    selectedImage.filters = selectedImage.filters || []

    // Remove old blur filter
    selectedImage.filters = selectedImage.filters.filter(
      f => !(f instanceof fabric.Image.filters.Blur)
    )

    if (value > 0) {
      selectedImage.filters.push(
        new fabric.Image.filters.Blur({ blur: value / 100 })
      )
    }

    selectedImage.applyFilters()
    canvas?.requestRenderAll()
  }

  const cropImage = (aspectRatio?: string) => {
    if (!selectedImage) return

    // Get current dimensions
    const width = (selectedImage.width || 0) * (selectedImage.scaleX || 1)
    const height = (selectedImage.height || 0) * (selectedImage.scaleY || 1)

    let cropWidth = width
    let cropHeight = height

    if (aspectRatio) {
      const [ratioW, ratioH] = aspectRatio.split(':').map(Number)
      const currentRatio = width / height
      const targetRatio = ratioW / ratioH

      if (currentRatio > targetRatio) {
        cropWidth = height * targetRatio
      } else {
        cropHeight = width / targetRatio
      }
    }

    // Create crop rectangle for visual feedback
    const cropRect = new fabric.Rect({
      left: selectedImage.left,
      top: selectedImage.top,
      width: cropWidth / (selectedImage.scaleX || 1),
      height: cropHeight / (selectedImage.scaleY || 1),
      fill: 'transparent',
      stroke: '#00aaff',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: true,
    })

    canvas?.add(cropRect)
    canvas?.setActiveObject(cropRect)
    canvas?.requestRenderAll()
  }

  const rotateImage = (degrees: number) => {
    if (!selectedImage) return

    const currentAngle = selectedImage.angle || 0
    selectedImage.rotate(currentAngle + degrees)
    canvas?.requestRenderAll()
  }

  const flipImage = (direction: 'horizontal' | 'vertical') => {
    if (!selectedImage) return

    if (direction === 'horizontal') {
      selectedImage.set('flipX', !selectedImage.flipX)
    } else {
      selectedImage.set('flipY', !selectedImage.flipY)
    }

    canvas?.requestRenderAll()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm mb-3">Image Editor</h3>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        <Button
          variant="outline"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Image
        </Button>
      </div>

      {!selectedImage ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Upload an image or select one on the canvas
            </p>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="adjust" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2">
            <TabsTrigger value="adjust" className="text-xs">Adjust</TabsTrigger>
            <TabsTrigger value="filters" className="text-xs">Filters</TabsTrigger>
            <TabsTrigger value="crop" className="text-xs">Crop</TabsTrigger>
            <TabsTrigger value="transform" className="text-xs">Transform</TabsTrigger>
          </TabsList>

          {/* Adjust Tab */}
          <TabsContent value="adjust" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                <div>
                  <Label className="text-xs">Brightness: {brightness}</Label>
                  <Slider
                    value={[brightness]}
                    onValueChange={([v]) => updateBrightness(v)}
                    min={-100}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="text-xs">Contrast: {contrast}</Label>
                  <Slider
                    value={[contrast]}
                    onValueChange={([v]) => updateContrast(v)}
                    min={-100}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="text-xs">Saturation: {saturation}</Label>
                  <Slider
                    value={[saturation]}
                    onValueChange={([v]) => updateSaturation(v)}
                    min={-100}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="text-xs">Blur: {blur}</Label>
                  <Slider
                    value={[blur]}
                    onValueChange={([v]) => updateBlur(v)}
                    min={0}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setBrightness(0)
                    setContrast(0)
                    setSaturation(0)
                    setBlur(0)
                    applyFilter('none')
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reset All
                </Button>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Filters Tab */}
          <TabsContent value="filters" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => applyFilter('none')}
                >
                  Original
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => applyFilter('grayscale')}
                >
                  Grayscale
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => applyFilter('sepia')}
                >
                  Sepia
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => applyFilter('invert')}
                >
                  Invert
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => applyFilter('vintage')}
                >
                  Vintage
                </Button>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Crop Tab */}
          <TabsContent value="crop" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                <Label className="text-xs">Aspect Ratio</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cropImage('1:1')}
                  >
                    1:1 Square
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cropImage('4:3')}
                  >
                    4:3
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cropImage('16:9')}
                  >
                    16:9
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cropImage('3:2')}
                  >
                    3:2
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cropImage()}
                  >
                    Free
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Transform Tab */}
          <TabsContent value="transform" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                <div>
                  <Label className="text-xs mb-2 block">Rotate</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rotateImage(-90)}
                    >
                      <RotateCw className="h-4 w-4 mr-2 scale-x-[-1]" />
                      90° Left
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rotateImage(90)}
                    >
                      <RotateCw className="h-4 w-4 mr-2" />
                      90° Right
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs mb-2 block">Flip</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => flipImage('horizontal')}
                    >
                      Horizontal
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => flipImage('vertical')}
                    >
                      Vertical
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
