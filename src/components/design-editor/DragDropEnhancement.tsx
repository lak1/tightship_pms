'use client'

import { useEffect } from 'react'
import * as fabric from 'fabric'

interface DragDropEnhancementProps {
  canvas: fabric.Canvas | null
}

/**
 * Enhances canvas with advanced drag & drop capabilities:
 * - Alt+Drag to duplicate objects
 * - Shift+Drag to constrain movement to horizontal/vertical
 * - Better snapping behavior
 */
export default function DragDropEnhancement({ canvas }: DragDropEnhancementProps) {
  useEffect(() => {
    if (!canvas) return

    let isDragging = false
    let originalObject: fabric.Object | null = null

    // Enhanced object moving with modifiers
    const handleObjectMoving = (e: fabric.IEvent<MouseEvent>) => {
      const obj = e.target
      if (!obj) return

      const pointer = canvas.getPointer(e.e)

      // Shift key: constrain to horizontal or vertical movement
      if (e.e.shiftKey && originalObject) {
        const dx = Math.abs((obj.left || 0) - (originalObject.left || 0))
        const dy = Math.abs((obj.top || 0) - (originalObject.top || 0))

        if (dx > dy) {
          // Constrain to horizontal
          obj.set({ top: originalObject.top })
        } else {
          // Constrain to vertical
          obj.set({ left: originalObject.left })
        }
      }

      // Smart snapping to canvas center and other objects
      const snapThreshold = 10
      const canvasCenter = {
        x: canvas.width! / 2,
        y: canvas.height! / 2,
      }

      // Snap to canvas center
      if (Math.abs((obj.left || 0) - canvasCenter.x) < snapThreshold) {
        obj.set({ left: canvasCenter.x })
      }
      if (Math.abs((obj.top || 0) - canvasCenter.y) < snapThreshold) {
        obj.set({ top: canvasCenter.y })
      }

      // Snap to other objects
      canvas.getObjects().forEach(target => {
        if (target === obj) return

        const targetLeft = target.left || 0
        const targetTop = target.top || 0
        const objLeft = obj.left || 0
        const objTop = obj.top || 0

        // Snap to alignment with other objects
        if (Math.abs(objLeft - targetLeft) < snapThreshold) {
          obj.set({ left: targetLeft })
        }
        if (Math.abs(objTop - targetTop) < snapThreshold) {
          obj.set({ top: targetTop })
        }
      })
    }

    // Alt+Drag to duplicate
    const handleMouseDown = (e: fabric.IEvent<MouseEvent>) => {
      const obj = canvas.getActiveObject()
      if (!obj) return

      isDragging = false
      originalObject = obj

      // Store original position for shift-constrain
      obj.set({
        _originalLeft: obj.left,
        _originalTop: obj.top,
      } as any)

      // Alt key: prepare for duplication
      if (e.e.altKey) {
        obj.clone((cloned: fabric.Object) => {
          cloned.set({
            left: obj.left,
            top: obj.top,
          })
          canvas.add(cloned)
          canvas.setActiveObject(cloned)
          canvas.requestRenderAll()
        })
      }
    }

    const handleMouseMove = (e: fabric.IEvent<MouseEvent>) => {
      if (canvas.getActiveObject()) {
        isDragging = true
      }
    }

    const handleMouseUp = () => {
      isDragging = false
      originalObject = null
    }

    // File drop support
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return

      const file = files[0]
      if (!file.type.startsWith('image/')) return

      // Read image file
      const reader = new FileReader()
      reader.onload = (event) => {
        const imgUrl = event.target?.result as string

        fabric.Image.fromURL(imgUrl, (img) => {
          // Scale image to fit canvas
          const maxWidth = canvas.width! * 0.5
          const maxHeight = canvas.height! * 0.5

          if (img.width! > maxWidth || img.height! > maxHeight) {
            const scale = Math.min(maxWidth / img.width!, maxHeight / img.height!)
            img.scale(scale)
          }

          // Position at drop location
          const pointer = canvas.getPointer(e as any)
          img.set({
            left: pointer.x - (img.width! * img.scaleX!) / 2,
            top: pointer.y - (img.height! * img.scaleY!) / 2,
          })

          canvas.add(img)
          canvas.setActiveObject(img)
          canvas.requestRenderAll()
        })
      }
      reader.readAsDataURL(file)
    }

    // Attach event listeners
    canvas.on('object:moving', handleObjectMoving)
    canvas.on('mouse:down', handleMouseDown)
    canvas.on('mouse:move', handleMouseMove)
    canvas.on('mouse:up', handleMouseUp)

    const canvasElement = canvas.getElement().parentElement
    if (canvasElement) {
      canvasElement.addEventListener('dragover', handleDragOver)
      canvasElement.addEventListener('drop', handleDrop)
    }

    return () => {
      canvas.off('object:moving', handleObjectMoving)
      canvas.off('mouse:down', handleMouseDown)
      canvas.off('mouse:move', handleMouseMove)
      canvas.off('mouse:up', handleMouseUp)

      if (canvasElement) {
        canvasElement.removeEventListener('dragover', handleDragOver)
        canvasElement.removeEventListener('drop', handleDrop)
      }
    }
  }, [canvas])

  return null // This is a behavior-only component
}
