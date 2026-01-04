'use client'

import { useEffect, useState, useCallback } from 'react'
import * as fabric from 'fabric'
import {
  Copy,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Layers,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Scissors,
  Clipboard,
  Palette,
} from 'lucide-react'

interface QuickActionsMenuProps {
  canvas: fabric.Canvas | null
  onCopyStyle?: (style: any) => void
}

interface MenuPosition {
  x: number
  y: number
}

export default function QuickActionsMenu({ canvas, onCopyStyle }: QuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 })
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null)
  const [copiedObject, setCopiedObject] = useState<fabric.Object | null>(null)

  // Handle right-click on canvas
  useEffect(() => {
    if (!canvas) return

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()

      const activeObject = canvas.getActiveObject()
      if (!activeObject) {
        setIsOpen(false)
        return
      }

      setSelectedObject(activeObject)
      setPosition({ x: e.clientX, y: e.clientY })
      setIsOpen(true)
    }

    const handleClick = () => {
      setIsOpen(false)
    }

    const canvasElement = canvas.getElement().parentElement
    if (canvasElement) {
      canvasElement.addEventListener('contextmenu', handleContextMenu)
      document.addEventListener('click', handleClick)
    }

    return () => {
      if (canvasElement) {
        canvasElement.removeEventListener('contextmenu', handleContextMenu)
      }
      document.removeEventListener('click', handleClick)
    }
  }, [canvas])

  // Menu Actions
  const handleCopy = useCallback(() => {
    if (!canvas || !selectedObject) return

    selectedObject.clone((cloned: fabric.Object) => {
      setCopiedObject(cloned)
    })
    setIsOpen(false)
  }, [canvas, selectedObject])

  const handlePaste = useCallback(() => {
    if (!canvas || !copiedObject) return

    copiedObject.clone((cloned: fabric.Object) => {
      cloned.set({
        left: (cloned.left || 0) + 10,
        top: (cloned.top || 0) + 10,
      })
      canvas.add(cloned)
      canvas.setActiveObject(cloned)
      canvas.requestRenderAll()
    })
    setIsOpen(false)
  }, [canvas, copiedObject])

  const handleCut = useCallback(() => {
    if (!canvas || !selectedObject) return

    selectedObject.clone((cloned: fabric.Object) => {
      setCopiedObject(cloned)
    })
    canvas.remove(selectedObject)
    canvas.requestRenderAll()
    setIsOpen(false)
  }, [canvas, selectedObject])

  const handleDuplicate = useCallback(() => {
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
    setIsOpen(false)
  }, [canvas, selectedObject])

  const handleDelete = useCallback(() => {
    if (!canvas || !selectedObject) return
    canvas.remove(selectedObject)
    canvas.requestRenderAll()
    setIsOpen(false)
  }, [canvas, selectedObject])

  const handleToggleLock = useCallback(() => {
    if (!canvas || !selectedObject) return

    const isLocked = selectedObject.lockMovementX === true
    selectedObject.set({
      lockMovementX: !isLocked,
      lockMovementY: !isLocked,
      lockRotation: !isLocked,
      lockScalingX: !isLocked,
      lockScalingY: !isLocked,
      selectable: isLocked,
    })
    canvas.requestRenderAll()
    setIsOpen(false)
  }, [canvas, selectedObject])

  const handleToggleVisibility = useCallback(() => {
    if (!canvas || !selectedObject) return

    selectedObject.set({ visible: !selectedObject.visible })
    canvas.requestRenderAll()
    setIsOpen(false)
  }, [canvas, selectedObject])

  const handleBringToFront = useCallback(() => {
    if (!canvas || !selectedObject) return
    canvas.bringObjectToFront(selectedObject)
    canvas.requestRenderAll()
    setIsOpen(false)
  }, [canvas, selectedObject])

  const handleBringForward = useCallback(() => {
    if (!canvas || !selectedObject) return
    canvas.bringObjectForward(selectedObject)
    canvas.requestRenderAll()
    setIsOpen(false)
  }, [canvas, selectedObject])

  const handleSendBackward = useCallback(() => {
    if (!canvas || !selectedObject) return
    canvas.sendObjectBackwards(selectedObject)
    canvas.requestRenderAll()
    setIsOpen(false)
  }, [canvas, selectedObject])

  const handleSendToBack = useCallback(() => {
    if (!canvas || !selectedObject) return
    canvas.sendObjectToBack(selectedObject)
    canvas.requestRenderAll()
    setIsOpen(false)
  }, [canvas, selectedObject])

  const handleCopyStyle = useCallback(() => {
    if (!selectedObject || !onCopyStyle) return

    const style = {
      fill: selectedObject.fill,
      stroke: selectedObject.stroke,
      strokeWidth: selectedObject.strokeWidth,
      opacity: selectedObject.opacity,
      shadow: selectedObject.shadow,
    }

    if (selectedObject instanceof fabric.Text) {
      Object.assign(style, {
        fontFamily: selectedObject.fontFamily,
        fontSize: selectedObject.fontSize,
        fontWeight: selectedObject.fontWeight,
        fontStyle: selectedObject.fontStyle,
        textAlign: selectedObject.textAlign,
        underline: selectedObject.underline,
      })
    }

    onCopyStyle(style)
    setIsOpen(false)
  }, [selectedObject, onCopyStyle])

  if (!isOpen || !selectedObject) return null

  const isLocked = selectedObject.lockMovementX === true
  const isVisible = selectedObject.visible !== false

  return (
    <div
      className="fixed z-50 w-56 rounded-lg border border-gray-200 bg-white shadow-lg"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="py-1">
        {/* Copy/Cut/Paste */}
        <button
          onClick={handleCopy}
          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <Copy className="h-4 w-4" />
          Copy
          <span className="ml-auto text-xs text-gray-400">Ctrl+C</span>
        </button>
        <button
          onClick={handleCut}
          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <Scissors className="h-4 w-4" />
          Cut
          <span className="ml-auto text-xs text-gray-400">Ctrl+X</span>
        </button>
        {copiedObject && (
          <button
            onClick={handlePaste}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <Clipboard className="h-4 w-4" />
            Paste
            <span className="ml-auto text-xs text-gray-400">Ctrl+V</span>
          </button>
        )}
        <button
          onClick={handleDuplicate}
          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <Copy className="h-4 w-4" />
          Duplicate
          <span className="ml-auto text-xs text-gray-400">Ctrl+D</span>
        </button>

        <div className="my-1 h-px bg-gray-200" />

        {/* Layer Order */}
        <button
          onClick={handleBringToFront}
          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <ChevronsUp className="h-4 w-4" />
          Bring to Front
        </button>
        <button
          onClick={handleBringForward}
          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <ArrowUp className="h-4 w-4" />
          Bring Forward
        </button>
        <button
          onClick={handleSendBackward}
          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <ArrowDown className="h-4 w-4" />
          Send Backward
        </button>
        <button
          onClick={handleSendToBack}
          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <ChevronsDown className="h-4 w-4" />
          Send to Back
        </button>

        <div className="my-1 h-px bg-gray-200" />

        {/* Object Properties */}
        <button
          onClick={handleToggleLock}
          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          {isLocked ? 'Unlock' : 'Lock'}
          <span className="ml-auto text-xs text-gray-400">Ctrl+L</span>
        </button>
        <button
          onClick={handleToggleVisibility}
          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {isVisible ? 'Hide' : 'Show'}
        </button>
        <button
          onClick={handleCopyStyle}
          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <Palette className="h-4 w-4" />
          Copy Style
        </button>

        <div className="my-1 h-px bg-gray-200" />

        {/* Delete */}
        <button
          onClick={handleDelete}
          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          Delete
          <span className="ml-auto text-xs text-gray-400">Del</span>
        </button>
      </div>
    </div>
  )
}
