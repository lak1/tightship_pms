'use client'

import { useEffect, useRef, useState } from 'react'
import * as fabric from 'fabric'

interface FabricCanvasProps {
  width?: number
  height?: number
  className?: string
  onSelectionChange?: (objects: fabric.Object[]) => void
  onCanvasChange?: (canvas: fabric.Canvas) => void
}

export default function FabricCanvas({
  width = 800,
  height = 600,
  className = '',
  onSelectionChange,
  onCanvasChange
}: FabricCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return

    // Initialize Fabric canvas
    let canvas
    try {
      canvas = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: '#ffffff',
        selection: true,
        preserveObjectStacking: true,
      })

      fabricCanvasRef.current = canvas
    } catch (error) {
      console.error('Error initializing Fabric canvas:', error)
      return
    }

    // Set up event listeners
    canvas.on('selection:created', handleSelectionChange)
    canvas.on('selection:updated', handleSelectionChange)
    canvas.on('selection:cleared', handleSelectionChange)
    canvas.on('object:modified', handleObjectModified)
    canvas.on('object:added', handleObjectAdded)
    canvas.on('object:removed', handleObjectRemoved)

    // Notify parent component that canvas is ready
    onCanvasChange?.(canvas)
    setIsReady(true)

    // Cleanup function
    return () => {
      canvas.dispose()
      fabricCanvasRef.current = null
    }
  }, [width, height, onCanvasChange])

  const handleSelectionChange = () => {
    if (!fabricCanvasRef.current) return

    const activeObjects = fabricCanvasRef.current.getActiveObjects()
    onSelectionChange?.(activeObjects)
  }

  const handleObjectModified = () => {
    // Handle object modifications (e.g., save state for undo/redo)
    console.log('Object modified')
  }

  const handleObjectAdded = () => {
    // Handle object additions
    console.log('Object added')
  }

  const handleObjectRemoved = () => {
    // Handle object removals
    console.log('Object removed')
  }

  // Methods to be called by parent components
  const getCanvas = () => fabricCanvasRef.current

  const addText = (text: string = 'Sample Text') => {
    if (!fabricCanvasRef.current) return

    const textObject = new fabric.Text(text, {
      left: 100,
      top: 100,
      fontFamily: 'Arial',
      fontSize: 20,
      fill: '#000000',
    })

    fabricCanvasRef.current.add(textObject)
    fabricCanvasRef.current.setActiveObject(textObject)
  }

  const addRectangle = () => {
    if (!fabricCanvasRef.current) return

    const rect = new fabric.Rect({
      left: 150,
      top: 150,
      width: 100,
      height: 60,
      fill: '#ff0000',
      stroke: '#000000',
      strokeWidth: 2,
    })

    fabricCanvasRef.current.add(rect)
    fabricCanvasRef.current.setActiveObject(rect)
  }

  const addCircle = () => {
    if (!fabricCanvasRef.current) return

    const circle = new fabric.Circle({
      left: 200,
      top: 200,
      radius: 50,
      fill: '#00ff00',
      stroke: '#000000',
      strokeWidth: 2,
    })

    fabricCanvasRef.current.add(circle)
    fabricCanvasRef.current.setActiveObject(circle)
  }

  const deleteSelected = () => {
    if (!fabricCanvasRef.current) return

    const activeObjects = fabricCanvasRef.current.getActiveObjects()
    activeObjects.forEach(obj => {
      fabricCanvasRef.current?.remove(obj)
    })
    fabricCanvasRef.current.discardActiveObject()
  }

  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return
    fabricCanvasRef.current.clear()
    fabricCanvasRef.current.backgroundColor = '#ffffff'
  }

  // Expose methods for parent components
  useEffect(() => {
    if (isReady && fabricCanvasRef.current) {
      // Attach methods to canvas for external access
      const canvas = fabricCanvasRef.current as any
      canvas.addText = addText
      canvas.addRectangle = addRectangle
      canvas.addCircle = addCircle
      canvas.deleteSelected = deleteSelected
      canvas.clearCanvas = clearCanvas
    }
  }, [isReady])

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="border border-gray-300 shadow-lg"
      />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-gray-500">Loading canvas...</div>
        </div>
      )}
    </div>
  )
}

// Export the ref type for parent components
export type FabricCanvasRef = {
  getCanvas: () => fabric.Canvas | null
  addText: (text?: string) => void
  addRectangle: () => void
  addCircle: () => void
  deleteSelected: () => void
  clearCanvas: () => void
}