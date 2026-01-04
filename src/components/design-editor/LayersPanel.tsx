'use client'

import { useState, useEffect } from 'react'
import * as fabric from 'fabric'
import { Eye, EyeOff, Lock, Unlock, Trash2, ChevronUp, ChevronDown, Type, Square, Circle, Image as ImageIcon, Group } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface LayersPanelProps {
  canvas: fabric.Canvas | null
  onLayerSelect?: (object: fabric.Object | null) => void
}

interface LayerItem {
  id: string
  object: fabric.Object
  name: string
  type: string
  visible: boolean
  locked: boolean
  selected: boolean
}

export default function LayersPanel({ canvas, onLayerSelect }: LayersPanelProps) {
  const [layers, setLayers] = useState<LayerItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    if (!canvas) return

    const updateLayers = () => {
      const objects = canvas.getObjects()
      const activeObject = canvas.getActiveObject()

      const layerItems: LayerItem[] = objects.map((obj, index) => {
        const isSelected = activeObject === obj ||
          (activeObject instanceof fabric.ActiveSelection && activeObject.contains(obj))

        return {
          id: obj.data?.id || `layer-${index}`,
          object: obj,
          name: obj.data?.name || getObjectTypeName(obj),
          type: getObjectType(obj),
          visible: obj.visible !== false,
          locked: obj.selectable === false,
          selected: isSelected
        }
      }).reverse() // Reverse to show top layers first

      setLayers(layerItems)
    }

    // Update on canvas events
    canvas.on('object:added', updateLayers)
    canvas.on('object:removed', updateLayers)
    canvas.on('object:modified', updateLayers)
    canvas.on('selection:created', updateLayers)
    canvas.on('selection:updated', updateLayers)
    canvas.on('selection:cleared', updateLayers)

    // Initial update
    updateLayers()

    return () => {
      canvas.off('object:added', updateLayers)
      canvas.off('object:removed', updateLayers)
      canvas.off('object:modified', updateLayers)
      canvas.off('selection:created', updateLayers)
      canvas.off('selection:updated', updateLayers)
      canvas.off('selection:cleared', updateLayers)
    }
  }, [canvas])

  const getObjectType = (obj: fabric.Object): string => {
    if (obj instanceof fabric.Text || obj instanceof fabric.Textbox || obj instanceof fabric.IText) {
      return 'text'
    } else if (obj instanceof fabric.Image) {
      return 'image'
    } else if (obj instanceof fabric.Rect) {
      return 'rect'
    } else if (obj instanceof fabric.Circle) {
      return 'circle'
    } else if (obj instanceof fabric.Group) {
      return 'group'
    } else if (obj instanceof fabric.Line) {
      return 'line'
    } else if (obj instanceof fabric.Polygon) {
      return 'polygon'
    } else if (obj instanceof fabric.Path) {
      return 'path'
    }
    return 'object'
  }

  const getObjectTypeName = (obj: fabric.Object): string => {
    const type = getObjectType(obj)

    if (type === 'text' && obj instanceof fabric.Text) {
      const text = obj.text || ''
      return text.length > 20 ? text.substring(0, 20) + '...' : text
    }

    const typeNames: Record<string, string> = {
      text: 'Text',
      image: 'Image',
      rect: 'Rectangle',
      circle: 'Circle',
      group: 'Group',
      line: 'Line',
      polygon: 'Polygon',
      path: 'Path'
    }

    return typeNames[type] || 'Object'
  }

  const getLayerIcon = (type: string) => {
    const icons: Record<string, any> = {
      text: Type,
      image: ImageIcon,
      rect: Square,
      circle: Circle,
      group: Group
    }

    const Icon = icons[type] || Square
    return <Icon className="w-4 h-4" />
  }

  const handleLayerClick = (layer: LayerItem) => {
    if (!canvas) return

    canvas.discardActiveObject()
    canvas.setActiveObject(layer.object)
    canvas.requestRenderAll()
    onLayerSelect?.(layer.object)
  }

  const handleToggleVisibility = (layer: LayerItem, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canvas) return

    layer.object.visible = !layer.object.visible
    canvas.requestRenderAll()
  }

  const handleToggleLock = (layer: LayerItem, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canvas) return

    const newLocked = !layer.locked
    layer.object.set({
      selectable: !newLocked,
      evented: !newLocked
    })
    canvas.requestRenderAll()
  }

  const handleDelete = (layer: LayerItem, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canvas) return

    canvas.remove(layer.object)
    canvas.requestRenderAll()
  }

  const handleMoveUp = (layer: LayerItem, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canvas) return

    canvas.bringForward(layer.object)
    canvas.requestRenderAll()
  }

  const handleMoveDown = (layer: LayerItem, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canvas) return

    canvas.sendBackwards(layer.object)
    canvas.requestRenderAll()
  }

  const handleStartRename = (layer: LayerItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(layer.id)
    setEditingName(layer.name)
  }

  const handleFinishRename = (layer: LayerItem) => {
    if (!layer.object.data) {
      layer.object.set('data', {})
    }
    layer.object.data.name = editingName
    setEditingId(null)
    setEditingName('')
  }

  const handleKeyDown = (e: React.KeyboardEvent, layer: LayerItem) => {
    if (e.key === 'Enter') {
      handleFinishRename(layer)
    } else if (e.key === 'Escape') {
      setEditingId(null)
      setEditingName('')
    }
  }

  return (
    <div className="flex flex-col h-full border-l bg-background">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Layers</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {layers.length} {layers.length === 1 ? 'object' : 'objects'}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {layers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No layers yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add objects to the canvas to see them here
              </p>
            </div>
          ) : (
            layers.map((layer) => (
              <div
                key={layer.id}
                onClick={() => handleLayerClick(layer)}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors group',
                  layer.selected && 'bg-accent'
                )}
              >
                {/* Layer Icon */}
                <div className="flex-shrink-0 text-muted-foreground">
                  {getLayerIcon(layer.type)}
                </div>

                {/* Layer Name */}
                <div className="flex-1 min-w-0">
                  {editingId === layer.id ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleFinishRename(layer)}
                      onKeyDown={(e) => handleKeyDown(e, layer)}
                      className="h-6 text-sm"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div
                      className="text-sm truncate"
                      onDoubleClick={(e) => handleStartRename(layer, e)}
                      title={layer.name}
                    >
                      {layer.name}
                    </div>
                  )}
                </div>

                {/* Layer Controls */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Move Up */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => handleMoveUp(layer, e)}
                    title="Move up"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>

                  {/* Move Down */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => handleMoveDown(layer, e)}
                    title="Move down"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>

                  {/* Visibility Toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => handleToggleVisibility(layer, e)}
                    title={layer.visible ? 'Hide' : 'Show'}
                  >
                    {layer.visible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>

                  {/* Lock Toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => handleToggleLock(layer, e)}
                    title={layer.locked ? 'Unlock' : 'Lock'}
                  >
                    {layer.locked ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <Unlock className="h-3 w-3" />
                    )}
                  </Button>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={(e) => handleDelete(layer, e)}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Layer Actions Footer */}
      <div className="p-2 border-t">
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => {
              if (!canvas) return
              const activeObject = canvas.getActiveObject()
              if (activeObject instanceof fabric.ActiveSelection) {
                const group = activeObject.toGroup()
                canvas.requestRenderAll()
              }
            }}
            disabled={!canvas || !(canvas.getActiveObject() instanceof fabric.ActiveSelection)}
          >
            Group
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => {
              if (!canvas) return
              const activeObject = canvas.getActiveObject()
              if (activeObject instanceof fabric.Group) {
                activeObject.toActiveSelection()
                canvas.requestRenderAll()
              }
            }}
            disabled={!canvas || !(canvas.getActiveObject() instanceof fabric.Group)}
          >
            Ungroup
          </Button>
        </div>
      </div>
    </div>
  )
}
