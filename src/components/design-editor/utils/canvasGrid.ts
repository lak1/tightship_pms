import * as fabric from 'fabric'

export interface GridOptions {
  enabled: boolean
  gridSize: number
  snapToGrid: boolean
  showRulers: boolean
  showGuides: boolean
}

export const defaultGridOptions: GridOptions = {
  enabled: true,
  gridSize: 20,
  snapToGrid: false,
  showRulers: true,
  showGuides: true
}

/**
 * Draw grid lines on canvas
 */
export function drawGrid(canvas: fabric.Canvas, gridSize: number) {
  const width = canvas.getWidth()
  const height = canvas.getHeight()

  // Clear existing grid
  const existingGrid = canvas.getObjects().filter(obj => obj.data?.isGrid)
  existingGrid.forEach(obj => canvas.remove(obj))

  // Draw vertical lines
  for (let i = 0; i < width / gridSize; i++) {
    const line = new fabric.Line([i * gridSize, 0, i * gridSize, height], {
      stroke: '#e0e0e0',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    })
    line.set('data', { isGrid: true })
    canvas.add(line)
  }

  // Draw horizontal lines
  for (let i = 0; i < height / gridSize; i++) {
    const line = new fabric.Line([0, i * gridSize, width, i * gridSize], {
      stroke: '#e0e0e0',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    })
    line.set('data', { isGrid: true })
    canvas.add(line)
  }

  // Send grid to back
  const gridObjects = canvas.getObjects().filter(obj => obj.data?.isGrid)
  gridObjects.forEach(obj => canvas.sendToBack(obj))

  canvas.requestRenderAll()
}

/**
 * Remove grid from canvas
 */
export function removeGrid(canvas: fabric.Canvas) {
  const gridObjects = canvas.getObjects().filter(obj => obj.data?.isGrid)
  gridObjects.forEach(obj => canvas.remove(obj))
  canvas.requestRenderAll()
}

/**
 * Snap coordinates to grid
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize
}

/**
 * Setup snap-to-grid behavior
 */
export function setupSnapToGrid(canvas: fabric.Canvas, gridSize: number) {
  canvas.on('object:moving', (e) => {
    const obj = e.target
    if (!obj) return

    obj.set({
      left: snapToGrid(obj.left || 0, gridSize),
      top: snapToGrid(obj.top || 0, gridSize),
    })
  })

  canvas.on('object:scaling', (e) => {
    const obj = e.target
    if (!obj) return

    const width = (obj.width || 0) * (obj.scaleX || 1)
    const height = (obj.height || 0) * (obj.scaleY || 1)

    const snappedWidth = snapToGrid(width, gridSize)
    const snappedHeight = snapToGrid(height, gridSize)

    obj.set({
      scaleX: snappedWidth / (obj.width || 1),
      scaleY: snappedHeight / (obj.height || 1),
    })
  })
}

/**
 * Draw rulers on canvas
 */
export function drawRulers(
  canvasElement: HTMLCanvasElement,
  rulerSize: number = 30
): { horizontal: HTMLCanvasElement; vertical: HTMLCanvasElement } {
  const canvas = canvasElement.parentElement
  if (!canvas) {
    throw new Error('Canvas element must have a parent')
  }

  const width = canvasElement.width
  const height = canvasElement.height

  // Create horizontal ruler
  const horizontalRuler = document.createElement('canvas')
  horizontalRuler.width = width
  horizontalRuler.height = rulerSize
  horizontalRuler.style.position = 'absolute'
  horizontalRuler.style.top = '0'
  horizontalRuler.style.left = `${rulerSize}px`
  horizontalRuler.style.backgroundColor = '#f5f5f5'
  horizontalRuler.style.borderBottom = '1px solid #ccc'

  const hCtx = horizontalRuler.getContext('2d')
  if (hCtx) {
    hCtx.fillStyle = '#333'
    hCtx.font = '10px Arial'
    hCtx.textAlign = 'center'

    for (let i = 0; i <= width; i += 50) {
      hCtx.beginPath()
      hCtx.moveTo(i, rulerSize - 10)
      hCtx.lineTo(i, rulerSize)
      hCtx.stroke()
      hCtx.fillText(i.toString(), i, rulerSize - 15)
    }

    for (let i = 0; i <= width; i += 10) {
      hCtx.beginPath()
      hCtx.moveTo(i, rulerSize - 5)
      hCtx.lineTo(i, rulerSize)
      hCtx.stroke()
    }
  }

  // Create vertical ruler
  const verticalRuler = document.createElement('canvas')
  verticalRuler.width = rulerSize
  verticalRuler.height = height
  verticalRuler.style.position = 'absolute'
  verticalRuler.style.top = `${rulerSize}px`
  verticalRuler.style.left = '0'
  verticalRuler.style.backgroundColor = '#f5f5f5'
  verticalRuler.style.borderRight = '1px solid #ccc'

  const vCtx = verticalRuler.getContext('2d')
  if (vCtx) {
    vCtx.fillStyle = '#333'
    vCtx.font = '10px Arial'
    vCtx.textAlign = 'center'

    vCtx.save()
    vCtx.translate(rulerSize / 2, 0)
    vCtx.rotate(Math.PI / 2)

    for (let i = 0; i <= height; i += 50) {
      vCtx.beginPath()
      vCtx.moveTo(i, -rulerSize / 2 + 10)
      vCtx.lineTo(i, 0)
      vCtx.stroke()
      vCtx.fillText(i.toString(), i, -rulerSize / 2 + 20)
    }

    for (let i = 0; i <= height; i += 10) {
      vCtx.beginPath()
      vCtx.moveTo(i, -rulerSize / 2 + 5)
      vCtx.lineTo(i, 0)
      vCtx.stroke()
    }

    vCtx.restore()
  }

  return { horizontal: horizontalRuler, vertical: verticalRuler }
}

/**
 * Show smart alignment guides when moving objects
 */
export function setupSmartGuides(canvas: fabric.Canvas) {
  let ctx = canvas.getSelectionContext()
  const canvasWidth = canvas.getWidth()
  const canvasHeight = canvas.getHeight()

  let verticalLines: fabric.Line[] = []
  let horizontalLines: fabric.Line[] = []

  canvas.on('object:moving', (e) => {
    const activeObject = e.target
    if (!activeObject) return

    // Clear previous guides
    verticalLines.forEach(line => canvas.remove(line))
    horizontalLines.forEach(line => canvas.remove(line))
    verticalLines = []
    horizontalLines = []

    const activeObjectLeft = activeObject.left || 0
    const activeObjectTop = activeObject.top || 0
    const activeObjectWidth = (activeObject.width || 0) * (activeObject.scaleX || 1)
    const activeObjectHeight = (activeObject.height || 0) * (activeObject.scaleY || 1)
    const activeObjectRight = activeObjectLeft + activeObjectWidth
    const activeObjectBottom = activeObjectTop + activeObjectHeight
    const activeObjectCenterX = activeObjectLeft + activeObjectWidth / 2
    const activeObjectCenterY = activeObjectTop + activeObjectHeight / 2

    const threshold = 5

    // Check alignment with other objects
    canvas.getObjects().forEach(obj => {
      if (obj === activeObject || obj.data?.isGrid || obj.data?.isGuide) return

      const objLeft = obj.left || 0
      const objTop = obj.top || 0
      const objWidth = (obj.width || 0) * (obj.scaleX || 1)
      const objHeight = (obj.height || 0) * (obj.scaleY || 1)
      const objRight = objLeft + objWidth
      const objBottom = objTop + objHeight
      const objCenterX = objLeft + objWidth / 2
      const objCenterY = objTop + objHeight / 2

      // Vertical alignment
      if (Math.abs(activeObjectLeft - objLeft) < threshold) {
        verticalLines.push(createGuideLine([objLeft, 0, objLeft, canvasHeight]))
      }
      if (Math.abs(activeObjectCenterX - objCenterX) < threshold) {
        verticalLines.push(createGuideLine([objCenterX, 0, objCenterX, canvasHeight]))
      }
      if (Math.abs(activeObjectRight - objRight) < threshold) {
        verticalLines.push(createGuideLine([objRight, 0, objRight, canvasHeight]))
      }

      // Horizontal alignment
      if (Math.abs(activeObjectTop - objTop) < threshold) {
        horizontalLines.push(createGuideLine([0, objTop, canvasWidth, objTop]))
      }
      if (Math.abs(activeObjectCenterY - objCenterY) < threshold) {
        horizontalLines.push(createGuideLine([0, objCenterY, canvasWidth, objCenterY]))
      }
      if (Math.abs(activeObjectBottom - objBottom) < threshold) {
        horizontalLines.push(createGuideLine([0, objBottom, canvasWidth, objBottom]))
      }
    })

    // Add canvas center guides
    const canvasCenterX = canvasWidth / 2
    const canvasCenterY = canvasHeight / 2

    if (Math.abs(activeObjectCenterX - canvasCenterX) < threshold) {
      verticalLines.push(createGuideLine([canvasCenterX, 0, canvasCenterX, canvasHeight]))
    }
    if (Math.abs(activeObjectCenterY - canvasCenterY) < threshold) {
      horizontalLines.push(createGuideLine([0, canvasCenterY, canvasWidth, canvasCenterY]))
    }

    // Add guides to canvas
    verticalLines.forEach(line => canvas.add(line))
    horizontalLines.forEach(line => canvas.add(line))

    canvas.requestRenderAll()
  })

  canvas.on('object:modified', () => {
    // Clear guides after object is modified
    verticalLines.forEach(line => canvas.remove(line))
    horizontalLines.forEach(line => canvas.remove(line))
    verticalLines = []
    horizontalLines = []
    canvas.requestRenderAll()
  })

  canvas.on('selection:cleared', () => {
    // Clear guides when selection is cleared
    verticalLines.forEach(line => canvas.remove(line))
    horizontalLines.forEach(line => canvas.remove(line))
    verticalLines = []
    horizontalLines = []
    canvas.requestRenderAll()
  })
}

function createGuideLine(coords: number[]): fabric.Line {
  const line = new fabric.Line(coords, {
    stroke: '#00aaff',
    strokeWidth: 1,
    strokeDashArray: [5, 5],
    selectable: false,
    evented: false,
    excludeFromExport: true,
  })
  line.set('data', { isGuide: true })
  return line
}
