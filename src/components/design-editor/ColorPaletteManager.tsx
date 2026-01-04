'use client'

import { useState, useEffect } from 'react'
import { ChromePicker, ColorResult } from 'react-color'
import tinycolor from 'tinycolor2'
import { Plus, Trash2, Save, Palette, Pipette, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface Color {
  name: string
  hex: string
  rgb: { r: number; g: number; b: number }
}

interface ColorPalette {
  id: string
  name: string
  colors: Color[]
  isDefault?: boolean
}

interface ColorPaletteManagerProps {
  onColorSelect?: (color: string) => void
  selectedColor?: string
}

// Default color palettes
const DEFAULT_PALETTES: ColorPalette[] = [
  {
    id: 'default',
    name: 'Default',
    isDefault: true,
    colors: [
      { name: 'Black', hex: '#000000', rgb: { r: 0, g: 0, b: 0 } },
      { name: 'White', hex: '#FFFFFF', rgb: { r: 255, g: 255, b: 255 } },
      { name: 'Red', hex: '#EF4444', rgb: { r: 239, g: 68, b: 68 } },
      { name: 'Blue', hex: '#3B82F6', rgb: { r: 59, g: 130, b: 246 } },
      { name: 'Green', hex: '#10B981', rgb: { r: 16, g: 185, b: 129 } },
      { name: 'Yellow', hex: '#F59E0B', rgb: { r: 245, g: 158, b: 11 } },
      { name: 'Purple', hex: '#8B5CF6', rgb: { r: 139, g: 92, b: 246 } },
      { name: 'Pink', hex: '#EC4899', rgb: { r: 236, g: 72, b: 153 } },
    ]
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    colors: [
      { name: 'Burgundy', hex: '#7F1D1D', rgb: { r: 127, g: 29, b: 29 } },
      { name: 'Gold', hex: '#F59E0B', rgb: { r: 245, g: 158, b: 11 } },
      { name: 'Cream', hex: '#FEF3C7', rgb: { r: 254, g: 243, b: 199 } },
      { name: 'Forest', hex: '#064E3B', rgb: { r: 6, g: 78, b: 59 } },
      { name: 'Charcoal', hex: '#1F2937', rgb: { r: 31, g: 41, b: 55 } },
    ]
  },
  {
    id: 'modern',
    name: 'Modern',
    colors: [
      { name: 'Slate', hex: '#64748B', rgb: { r: 100, g: 116, b: 139 } },
      { name: 'Cyan', hex: '#06B6D4', rgb: { r: 6, g: 182, b: 212 } },
      { name: 'Lime', hex: '#84CC16', rgb: { r: 132, g: 204, b: 22 } },
      { name: 'Orange', hex: '#F97316', rgb: { r: 249, g: 115, b: 22 } },
      { name: 'Indigo', hex: '#6366F1', rgb: { r: 99, g: 102, b: 241 } },
    ]
  }
]

export default function ColorPaletteManager({ onColorSelect, selectedColor }: ColorPaletteManagerProps) {
  const [palettes, setPalettes] = useState<ColorPalette[]>(DEFAULT_PALETTES)
  const [activePalette, setActivePalette] = useState<string>('default')
  const [recentColors, setRecentColors] = useState<Color[]>([])
  const [currentColor, setCurrentColor] = useState(selectedColor || '#000000')
  const [showPicker, setShowPicker] = useState(false)
  const [copiedColor, setCopiedColor] = useState<string | null>(null)
  const [newPaletteName, setNewPaletteName] = useState('')

  useEffect(() => {
    if (selectedColor) {
      setCurrentColor(selectedColor)
    }
  }, [selectedColor])

  const handleColorChange = (color: ColorResult) => {
    const hexColor = color.hex
    setCurrentColor(hexColor)
    onColorSelect?.(hexColor)

    // Add to recent colors
    const colorObj: Color = {
      name: hexColor,
      hex: hexColor,
      rgb: color.rgb
    }

    setRecentColors(prev => {
      const filtered = prev.filter(c => c.hex !== hexColor)
      return [colorObj, ...filtered].slice(0, 12)
    })
  }

  const handleColorSelect = (color: Color) => {
    setCurrentColor(color.hex)
    onColorSelect?.(color.hex)

    // Add to recent colors
    setRecentColors(prev => {
      const filtered = prev.filter(c => c.hex !== color.hex)
      return [color, ...filtered].slice(0, 12)
    })
  }

  const copyColorToClipboard = (hex: string) => {
    navigator.clipboard.writeText(hex)
    setCopiedColor(hex)
    setTimeout(() => setCopiedColor(null), 2000)
  }

  const generateHarmony = (type: 'complementary' | 'analogous' | 'triadic' | 'monochromatic') => {
    const baseColor = tinycolor(currentColor)
    let colors: Color[] = []

    switch (type) {
      case 'complementary':
        colors = [
          currentColor,
          baseColor.complement().toHexString()
        ].map(hex => ({
          name: hex,
          hex,
          rgb: tinycolor(hex).toRgb()
        }))
        break

      case 'analogous':
        const analogous = baseColor.analogous(5)
        colors = analogous.map(c => {
          const hex = c.toHexString()
          return { name: hex, hex, rgb: c.toRgb() }
        })
        break

      case 'triadic':
        const triadic = baseColor.triad()
        colors = triadic.map(c => {
          const hex = c.toHexString()
          return { name: hex, hex, rgb: c.toRgb() }
        })
        break

      case 'monochromatic':
        const mono = baseColor.monochromatic(5)
        colors = mono.map(c => {
          const hex = c.toHexString()
          return { name: hex, hex, rgb: c.toRgb() }
        })
        break
    }

    // Create a new palette
    const newPalette: ColorPalette = {
      id: `harmony-${Date.now()}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Harmony`,
      colors
    }

    setPalettes(prev => [...prev, newPalette])
    setActivePalette(newPalette.id)
  }

  const createCustomPalette = () => {
    if (!newPaletteName.trim()) return

    const newPalette: ColorPalette = {
      id: `custom-${Date.now()}`,
      name: newPaletteName,
      colors: recentColors.slice(0, 8)
    }

    setPalettes(prev => [...prev, newPalette])
    setActivePalette(newPalette.id)
    setNewPaletteName('')
  }

  const deletePalette = (id: string) => {
    setPalettes(prev => prev.filter(p => p.id !== id))
    if (activePalette === id) {
      setActivePalette('default')
    }
  }

  const currentPalette = palettes.find(p => p.id === activePalette)

  return (
    <div className="flex flex-col h-full">
      {/* Header with Current Color */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-lg border-2 cursor-pointer shadow-sm"
            style={{ backgroundColor: currentColor }}
            onClick={() => setShowPicker(!showPicker)}
          />
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Current Color</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm font-mono">{currentColor}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyColorToClipboard(currentColor)}
              >
                {copiedColor === currentColor ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Color Picker Popover */}
        {showPicker && (
          <div className="mt-3">
            <ChromePicker
              color={currentColor}
              onChange={handleColorChange}
              disableAlpha={false}
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="palettes" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2">
          <TabsTrigger value="palettes" className="text-xs">Palettes</TabsTrigger>
          <TabsTrigger value="recent" className="text-xs">Recent</TabsTrigger>
          <TabsTrigger value="harmony" className="text-xs">Harmony</TabsTrigger>
        </TabsList>

        {/* Palettes Tab */}
        <TabsContent value="palettes" className="flex-1 mt-0 flex flex-col">
          <div className="p-4 border-b">
            <Label className="text-xs">Select Palette</Label>
            <div className="flex gap-2 mt-2">
              {palettes.map(palette => (
                <Button
                  key={palette.id}
                  variant={activePalette === palette.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActivePalette(palette.id)}
                  className="flex-1"
                >
                  {palette.name}
                </Button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              <div className="grid grid-cols-4 gap-2">
                {currentPalette?.colors.map((color, index) => (
                  <div
                    key={index}
                    className="group relative"
                    onClick={() => handleColorSelect(color)}
                  >
                    <div
                      className={cn(
                        'aspect-square rounded-lg cursor-pointer border-2 transition-all',
                        selectedColor === color.hex ? 'ring-2 ring-primary' : 'hover:scale-105'
                      )}
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        {color.hex}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {currentPalette && !currentPalette.isDefault && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => deletePalette(currentPalette.id)}
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete Palette
                </Button>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Recent Colors Tab */}
        <TabsContent value="recent" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {recentColors.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground text-sm">
                  No recent colors yet
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    {recentColors.map((color, index) => (
                      <div
                        key={index}
                        className="group relative"
                        onClick={() => handleColorSelect(color)}
                      >
                        <div
                          className="aspect-square rounded-lg cursor-pointer border-2 hover:scale-105 transition-all"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            {color.hex}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full mt-4">
                        <Save className="h-3 w-3 mr-2" />
                        Save as Palette
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Save Color Palette</DialogTitle>
                        <DialogDescription>
                          Create a new palette from your recent colors
                        </DialogDescription>
                      </DialogHeader>
                      <div>
                        <Label>Palette Name</Label>
                        <Input
                          value={newPaletteName}
                          onChange={(e) => setNewPaletteName(e.target.value)}
                          placeholder="My Custom Palette"
                          className="mt-2"
                        />
                      </div>
                      <DialogFooter>
                        <Button onClick={createCustomPalette} disabled={!newPaletteName.trim()}>
                          Create Palette
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Harmony Tab */}
        <TabsContent value="harmony" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Generate color harmonies based on current color
              </p>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => generateHarmony('complementary')}
              >
                <Palette className="h-3 w-3 mr-2" />
                Complementary
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => generateHarmony('analogous')}
              >
                <Palette className="h-3 w-3 mr-2" />
                Analogous
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => generateHarmony('triadic')}
              >
                <Palette className="h-3 w-3 mr-2" />
                Triadic
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => generateHarmony('monochromatic')}
              >
                <Palette className="h-3 w-3 mr-2" />
                Monochromatic
              </Button>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
