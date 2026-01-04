'use client'

import { useEffect, useState } from 'react'
import * as fabric from 'fabric'
import {
  Type,
  Square,
  Circle,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Layers,
  ZoomIn,
  ZoomOut,
  Download,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface CompactToolbarProps {
  canvas: fabric.Canvas | null
  onAddText?: () => void
  onAddShape?: (shape: 'rectangle' | 'circle' | 'triangle') => void
  onAddImage?: () => void
  onExport?: () => void
}

export default function CompactToolbar({
  canvas,
  onAddText,
  onAddShape,
  onAddImage,
  onExport,
}: CompactToolbarProps) {
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null)
  const [isTextObject, setIsTextObject] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  // Update selected object state when canvas selection changes
  useEffect(() => {
    if (!canvas) return

    const handleSelection = () => {
      const activeObject = canvas.getActiveObject()
      setSelectedObject(activeObject || null)
      setIsTextObject(activeObject instanceof fabric.Text)
      setIsLocked(activeObject?.lockMovementX === true)
      setIsVisible(activeObject?.visible !== false)
    }

    canvas.on('selection:created', handleSelection)
    canvas.on('selection:updated', handleSelection)
    canvas.on('selection:cleared', () => {
      setSelectedObject(null)
      setIsTextObject(false)
    })

    return () => {
      canvas.off('selection:created')
      canvas.off('selection:updated')
      canvas.off('selection:cleared')
    }
  }, [canvas])

  // Tool Actions
  const handleDuplicate = () => {
    if (!canvas || !selectedObject) return

    selectedObject.clone((cloned: fabric.Object) => {
      cloned.set({
        left: (cloned.left || 0) + 10,
        top: (cloned.top || 0) + 10,
      })
      canvas.add(cloned)
      canvas.setActiveObject(cloned)
      canvas.requestRenderAll()
    })
  }

  const handleDelete = () => {
    if (!canvas || !selectedObject) return
    canvas.remove(selectedObject)
    canvas.requestRenderAll()
  }

  const handleToggleLock = () => {
    if (!canvas || !selectedObject) return

    const newLockState = !isLocked
    selectedObject.set({
      lockMovementX: newLockState,
      lockMovementY: newLockState,
      lockRotation: newLockState,
      lockScalingX: newLockState,
      lockScalingY: newLockState,
      selectable: !newLockState,
    })
    setIsLocked(newLockState)
    canvas.requestRenderAll()
  }

  const handleToggleVisibility = () => {
    if (!canvas || !selectedObject) return

    const newVisibility = !isVisible
    selectedObject.set({ visible: newVisibility })
    setIsVisible(newVisibility)
    canvas.requestRenderAll()
  }

  const handleBringForward = () => {
    if (!canvas || !selectedObject) return
    canvas.bringObjectForward(selectedObject)
    canvas.requestRenderAll()
  }

  const handleSendBackward = () => {
    if (!canvas || !selectedObject) return
    canvas.sendObjectBackwards(selectedObject)
    canvas.requestRenderAll()
  }

  const handleBringToFront = () => {
    if (!canvas || !selectedObject) return
    canvas.bringObjectToFront(selectedObject)
    canvas.requestRenderAll()
  }

  const handleSendToBack = () => {
    if (!canvas || !selectedObject) return
    canvas.sendObjectToBack(selectedObject)
    canvas.requestRenderAll()
  }

  // Text Formatting
  const handleBold = () => {
    if (!canvas || !selectedObject || !(selectedObject instanceof fabric.Text)) return
    const currentWeight = selectedObject.fontWeight === 'bold' ? 'normal' : 'bold'
    selectedObject.set({ fontWeight: currentWeight })
    canvas.requestRenderAll()
  }

  const handleItalic = () => {
    if (!canvas || !selectedObject || !(selectedObject instanceof fabric.Text)) return
    const currentStyle = selectedObject.fontStyle === 'italic' ? 'normal' : 'italic'
    selectedObject.set({ fontStyle: currentStyle })
    canvas.requestRenderAll()
  }

  const handleUnderline = () => {
    if (!canvas || !selectedObject || !(selectedObject instanceof fabric.Text)) return
    selectedObject.set({ underline: !selectedObject.underline })
    canvas.requestRenderAll()
  }

  const handleTextAlign = (align: 'left' | 'center' | 'right') => {
    if (!canvas || !selectedObject || !(selectedObject instanceof fabric.Text)) return
    selectedObject.set({ textAlign: align })
    canvas.requestRenderAll()
  }

  // Zoom Controls
  const handleZoomIn = () => {
    if (!canvas) return
    const zoom = canvas.getZoom()
    canvas.setZoom(Math.min(zoom * 1.1, 3))
  }

  const handleZoomOut = () => {
    if (!canvas) return
    const zoom = canvas.getZoom()
    canvas.setZoom(Math.max(zoom * 0.9, 0.1))
  }

  const handleZoomReset = () => {
    if (!canvas) return
    canvas.setZoom(1)
    canvas.viewportTransform = [1, 0, 0, 1, 0, 0]
  }

  return (
    <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
      {/* Add Tools */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        <span className="text-xs font-medium text-gray-500">Add</span>
        <Button size="sm" variant="ghost" onClick={onAddText} title="Add Text">
          <Type className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" title="Add Shape">
              <Square className="h-4 w-4" />
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onAddShape?.('rectangle')}>
              <Square className="mr-2 h-4 w-4" />
              Rectangle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddShape?.('circle')}>
              <Circle className="mr-2 h-4 w-4" />
              Circle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddShape?.('triangle')}>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 2L2 22h20L12 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Triangle
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" variant="ghost" onClick={onAddImage} title="Add Image">
          <ImageIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Text Formatting (shown only when text is selected) */}
      {isTextObject && (
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
          <span className="text-xs font-medium text-gray-500">Format</span>
          <Button size="sm" variant="ghost" onClick={handleBold} title="Bold">
            <Bold className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleItalic} title="Italic">
            <Italic className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleUnderline} title="Underline">
            <Underline className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleTextAlign('left')} title="Align Left">
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleTextAlign('center')} title="Align Center">
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleTextAlign('right')} title="Align Right">
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit Tools (shown only when object is selected) */}
      {selectedObject && (
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
          <span className="text-xs font-medium text-gray-500">Edit</span>
          <Button size="sm" variant="ghost" onClick={handleDuplicate} title="Duplicate">
            <Copy className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDelete} title="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleToggleLock} title={isLocked ? "Unlock" : "Lock"}>
            {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleToggleVisibility} title={isVisible ? "Hide" : "Show"}>
            {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {/* Arrange Tools (shown only when object is selected) */}
      {selectedObject && (
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
          <span className="text-xs font-medium text-gray-500">Arrange</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" title="Layer Order">
                <Layers className="h-4 w-4" />
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleBringToFront}>Bring to Front</DropdownMenuItem>
              <DropdownMenuItem onClick={handleBringForward}>Bring Forward</DropdownMenuItem>
              <DropdownMenuItem onClick={handleSendBackward}>Send Backward</DropdownMenuItem>
              <DropdownMenuItem onClick={handleSendToBack}>Send to Back</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        <span className="text-xs font-medium text-gray-500">Zoom</span>
        <Button size="sm" variant="ghost" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleZoomReset} title="Reset Zoom">
          <span className="text-xs">100%</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* Export */}
      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" variant="default" onClick={onExport} title="Export">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>
    </div>
  )
}
