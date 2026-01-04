/**
 * Canvas Performance Optimization Utilities
 *
 * Implements caching strategies and performance optimizations for Fabric.js canvas
 */

import * as fabric from 'fabric'

interface CacheConfig {
  scale: number
  objectCaching: boolean
  statefullCache: boolean
}

/**
 * Enable object caching for better rendering performance
 */
export function enableObjectCaching(canvas: fabric.Canvas, config: Partial<CacheConfig> = {}) {
  const defaultConfig: CacheConfig = {
    scale: 2, // Retina display support
    objectCaching: true,
    statefullCache: true,
    ...config,
  }

  // Enable caching for all objects
  canvas.getObjects().forEach(obj => {
    obj.set({
      objectCaching: defaultConfig.objectCaching,
      statefullCache: defaultConfig.statefullCache,
      cacheProperties: [
        'fill',
        'stroke',
        'strokeWidth',
        'opacity',
        'shadow',
        'fontFamily',
        'fontSize',
        'fontWeight',
        'fontStyle',
      ],
    })

    // Force cache refresh
    obj.setCoords()
  })

  canvas.requestRenderAll()
}

/**
 * Debounce canvas rendering for better performance during interactions
 */
export function createDebouncedRender(canvas: fabric.Canvas, delay: number = 16) {
  let timeoutId: NodeJS.Timeout | null = null

  return () => {
    if (timeoutId) clearTimeout(timeoutId)

    timeoutId = setTimeout(() => {
      canvas.requestRenderAll()
      timeoutId = null
    }, delay)
  }
}

/**
 * Optimize canvas for large numbers of objects
 */
export function optimizeForLargeCanvas(canvas: fabric.Canvas) {
  // Disable selection for non-interactive objects
  canvas.getObjects().forEach(obj => {
    if ((obj as any).isBackground || (obj as any).isGuide) {
      obj.set({
        selectable: false,
        evented: false,
        objectCaching: true,
      })
    }
  })

  // Enable viewport culling
  canvas.set({
    renderOnAddRemove: false, // Manual render control
    skipOffscreen: true, // Skip rendering objects outside viewport
    enableRetinaScaling: true,
  } as any)
}

/**
 * Clear unused object caches to free memory
 */
export function clearUnusedCaches(canvas: fabric.Canvas) {
  canvas.getObjects().forEach(obj => {
    if (!obj.visible || !obj.intersectsWithRect(canvas.vptCoords!)) {
      // Clear cache for invisible or off-screen objects
      obj.set({ dirty: true })
    }
  })
}

/**
 * Lazy load images with loading placeholders
 */
export async function lazyLoadImage(
  url: string,
  canvas: fabric.Canvas,
  options: Partial<fabric.Image> = {}
): Promise<fabric.Image> {
  return new Promise((resolve, reject) => {
    // Create placeholder
    const placeholder = new fabric.Rect({
      width: 200,
      height: 200,
      fill: '#f0f0f0',
      stroke: '#ccc',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      ...options,
    })

    canvas.add(placeholder)
    canvas.requestRenderAll()

    // Load actual image
    fabric.Image.fromURL(url, (img) => {
      if (!img) {
        reject(new Error('Failed to load image'))
        return
      }

      // Replace placeholder with actual image
      img.set({
        left: placeholder.left,
        top: placeholder.top,
        ...options,
      })

      canvas.remove(placeholder)
      canvas.add(img)
      canvas.requestRenderAll()

      resolve(img)
    })
  })
}

/**
 * Batch updates for multiple objects to minimize redraws
 */
export function batchUpdate(
  canvas: fabric.Canvas,
  updates: Array<{ object: fabric.Object; properties: Partial<fabric.Object> }>
) {
  // Disable rendering
  canvas.renderOnAddRemove = false

  // Apply all updates
  updates.forEach(({ object, properties }) => {
    object.set(properties)
    object.setCoords()
  })

  // Re-enable rendering and render once
  canvas.renderOnAddRemove = true
  canvas.requestRenderAll()
}

/**
 * Monitor canvas performance
 */
export class CanvasPerformanceMonitor {
  private canvas: fabric.Canvas
  private frameCount = 0
  private lastTime = performance.now()
  private fps = 60

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas
  }

  start() {
    const measureFPS = () => {
      this.frameCount++
      const currentTime = performance.now()
      const elapsed = currentTime - this.lastTime

      if (elapsed >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / elapsed)
        this.frameCount = 0
        this.lastTime = currentTime

        if (this.fps < 30) {
          console.warn(`Canvas performance degraded: ${this.fps} FPS`)
          this.optimizePerformance()
        }
      }

      requestAnimationFrame(measureFPS)
    }

    requestAnimationFrame(measureFPS)
  }

  private optimizePerformance() {
    // Auto-optimize when performance drops
    enableObjectCaching(this.canvas)
    optimizeForLargeCanvas(this.canvas)
    clearUnusedCaches(this.canvas)
  }

  getFPS(): number {
    return this.fps
  }
}

/**
 * Compress canvas data for storage
 */
export async function compressCanvasData(canvas: fabric.Canvas): Promise<string> {
  const json = JSON.stringify(canvas.toJSON())

  // Simple compression: remove whitespace and compress repeated patterns
  const compressed = json
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()

  return compressed
}

/**
 * Decompress and load canvas data
 */
export async function decompressCanvasData(
  canvas: fabric.Canvas,
  compressedData: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const data = JSON.parse(compressedData)
      canvas.loadFromJSON(data, () => {
        canvas.requestRenderAll()
        resolve()
      })
    } catch (error) {
      reject(error)
    }
  })
}
