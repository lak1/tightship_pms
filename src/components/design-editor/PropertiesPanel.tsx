'use client'

import { useState, useEffect } from 'react'
import * as fabric from 'fabric'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Trash2, Type, Square, Circle, Image, Upload } from 'lucide-react'

interface PropertiesPanelProps {
  canvas: fabric.Canvas | null
  selectedObjects: fabric.Object[]
  onAddText: () => void
  onAddRectangle: () => void
  onAddCircle: () => void
  onDeleteSelected: () => void
  onClearCanvas: () => void
}

export default function PropertiesPanel({
  canvas,
  selectedObjects,
  onAddText,
  onAddRectangle,
  onAddCircle,
  onDeleteSelected,
  onClearCanvas
}: PropertiesPanelProps) {
  const [objectProperties, setObjectProperties] = useState<any>({})

  // Update properties when selection changes
  useEffect(() => {
    if (selectedObjects.length === 1) {
      const obj = selectedObjects[0]
      try {
        setObjectProperties({
          left: Math.round(Number(obj.left) || 0),
          top: Math.round(Number(obj.top) || 0),
          width: Math.round(Number(obj.width) || 0),
          height: Math.round(Number(obj.height) || 0),
          angle: Math.round(Number(obj.angle) || 0),
          opacity: Number(obj.opacity) || 1,
          fill: (typeof obj.fill === 'string' && obj.fill) ? obj.fill : '#000000',
          stroke: (typeof obj.stroke === 'string' && obj.stroke) ? obj.stroke : '#000000',
          strokeWidth: Number(obj.strokeWidth) || 0,
          // Text specific properties
          fontSize: obj.type === 'text' ? (Number((obj as fabric.Text).fontSize) || 20) : 20,
          fontFamily: obj.type === 'text' ? (String((obj as fabric.Text).fontFamily) || 'Arial') : 'Arial',
          text: obj.type === 'text' ? (String((obj as fabric.Text).text) || '') : '',
        })
      } catch (error) {
        console.error('Error setting object properties:', error)
        setObjectProperties({})
      }
    } else {
      setObjectProperties({})
    }
  }, [selectedObjects])

  const updateProperty = (property: string, value: any) => {
    if (!canvas || selectedObjects.length !== 1) return

    try {
      const obj = selectedObjects[0]
      if (!obj) return

      // Handle different property types
      if (property === 'text' && obj.type === 'text') {
        (obj as fabric.Text).set('text', String(value || ''))
      } else if (property === 'fontSize' && obj.type === 'text') {
        const fontSize = parseInt(value) || 12
        (obj as fabric.Text).set('fontSize', fontSize)
      } else if (property === 'fontFamily' && obj.type === 'text') {
        (obj as fabric.Text).set('fontFamily', String(value || 'Arial'))
      } else {
        // Ensure value is not undefined/null for certain properties
        let safeValue = value
        if (property === 'fill' && !value) safeValue = '#000000'
        if (property === 'stroke' && !value) safeValue = '#000000'

        obj.set(property as any, safeValue)
      }

      canvas.renderAll()
      setObjectProperties(prev => ({ ...prev, [property]: value }))
    } catch (error) {
      console.error('Error updating property:', error)
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !canvas) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string
      fabric.Image.fromURL(imageUrl, (img) => {
        // Scale image to reasonable size
        const maxWidth = 300
        const maxHeight = 300

        if (img.width! > maxWidth || img.height! > maxHeight) {
          const scaleX = maxWidth / img.width!
          const scaleY = maxHeight / img.height!
          const scale = Math.min(scaleX, scaleY)

          img.scale(scale)
        }

        img.set({
          left: 100,
          top: 100,
        })

        canvas.add(img)
        canvas.setActiveObject(img)
      })
    }
    reader.readAsDataURL(file)
  }

  const selectedObj = selectedObjects[0]
  const hasSelection = selectedObjects.length > 0

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full max-h-screen">
      <div className="p-4 overflow-y-auto flex-1">
        {/* Add Elements Section */}
      <div className="mb-6">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">Add Elements</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onAddText}
            className="flex items-center gap-2"
          >
            <Type className="w-4 h-4" />
            Text
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddRectangle}
            className="flex items-center gap-2"
          >
            <Square className="w-4 h-4" />
            Rectangle
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddCircle}
            className="flex items-center gap-2"
          >
            <Circle className="w-4 h-4" />
            Circle
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => document.getElementById('image-upload')?.click()}
          >
            <Image className="w-4 h-4" />
            Image
          </Button>
        </div>
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      <Separator className="mb-6" />

      {/* Object Properties Section */}
      {hasSelection ? (
        <div className="mb-6">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">
            Properties ({selectedObjects.length} selected)
          </h3>

          {selectedObjects.length === 1 && (
            <div className="space-y-4">
              {/* Text Properties */}
              {selectedObj?.type === 'text' && (
                <>
                  <div>
                    <Label htmlFor="text-content" className="text-xs">Text</Label>
                    <Input
                      id="text-content"
                      value={objectProperties.text || ''}
                      onChange={(e) => updateProperty('text', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="font-size" className="text-xs">Font Size</Label>
                      <Input
                        id="font-size"
                        type="number"
                        value={objectProperties.fontSize || 20}
                        onChange={(e) => updateProperty('fontSize', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="font-family" className="text-xs">Font</Label>
                      <select
                        id="font-family"
                        value={objectProperties.fontFamily || 'Arial'}
                        onChange={(e) => updateProperty('fontFamily', e.target.value)}
                        className="w-full h-8 text-xs border border-gray-300 rounded px-2"
                      >
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Courier New">Courier New</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Position */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="left" className="text-xs">X Position</Label>
                  <Input
                    id="left"
                    type="number"
                    value={objectProperties.left || 0}
                    onChange={(e) => updateProperty('left', parseInt(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="top" className="text-xs">Y Position</Label>
                  <Input
                    id="top"
                    type="number"
                    value={objectProperties.top || 0}
                    onChange={(e) => updateProperty('top', parseInt(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Size */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="width" className="text-xs">Width</Label>
                  <Input
                    id="width"
                    type="number"
                    value={objectProperties.width || 0}
                    onChange={(e) => updateProperty('width', parseInt(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="height" className="text-xs">Height</Label>
                  <Input
                    id="height"
                    type="number"
                    value={objectProperties.height || 0}
                    onChange={(e) => updateProperty('height', parseInt(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Appearance */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="fill" className="text-xs">Fill Color</Label>
                  <Input
                    id="fill"
                    type="color"
                    value={typeof objectProperties.fill === 'string' && objectProperties.fill ? objectProperties.fill : '#000000'}
                    onChange={(e) => updateProperty('fill', e.target.value)}
                    className="h-8 p-1"
                  />
                </div>
                <div>
                  <Label htmlFor="opacity" className="text-xs">Opacity</Label>
                  <Input
                    id="opacity"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={objectProperties.opacity || 1}
                    onChange={(e) => updateProperty('opacity', parseFloat(e.target.value))}
                    className="h-8"
                  />
                </div>
              </div>

              {/* Stroke */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="stroke" className="text-xs">Stroke Color</Label>
                  <Input
                    id="stroke"
                    type="color"
                    value={typeof objectProperties.stroke === 'string' && objectProperties.stroke ? objectProperties.stroke : '#000000'}
                    onChange={(e) => updateProperty('stroke', e.target.value)}
                    className="h-8 p-1"
                  />
                </div>
                <div>
                  <Label htmlFor="stroke-width" className="text-xs">Stroke Width</Label>
                  <Input
                    id="stroke-width"
                    type="number"
                    min="0"
                    value={objectProperties.strokeWidth || 0}
                    onChange={(e) => updateProperty('strokeWidth', parseInt(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Rotation */}
              <div>
                <Label htmlFor="angle" className="text-xs">Rotation (degrees)</Label>
                <Input
                  id="angle"
                  type="range"
                  min="0"
                  max="360"
                  value={objectProperties.angle || 0}
                  onChange={(e) => updateProperty('angle', parseInt(e.target.value))}
                  className="h-8"
                />
              </div>
            </div>
          )}

          {/* Delete Button */}
          <div className="mt-4">
            <Button
              variant="destructive"
              size="sm"
              onClick={onDeleteSelected}
              className="w-full flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">Properties</h3>
          <p className="text-xs text-gray-500">Select an object to edit its properties</p>
        </div>
      )}

      <Separator className="mb-6" />

      {/* Canvas Actions */}
      <div>
        <h3 className="font-semibold text-sm text-gray-700 mb-3">Canvas</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearCanvas}
          className="w-full"
        >
          Clear All
        </Button>
      </div>
    </div>
    </div>
  )
}