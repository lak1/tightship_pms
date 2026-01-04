/**
 * Lazy Loading Font Utilities
 *
 * Optimized loading of Google Fonts with caching and preloading
 */

interface FontCache {
  [fontFamily: string]: boolean
}

const loadedFonts: FontCache = {}
const loadingFonts: Map<string, Promise<void>> = new Map()

/**
 * Lazy load a Google Font with caching
 */
export async function lazyLoadGoogleFont(fontFamily: string, weights: string[] = ['400', '700']): Promise<void> {
  // Check if already loaded
  if (loadedFonts[fontFamily]) {
    return Promise.resolve()
  }

  // Check if currently loading
  if (loadingFonts.has(fontFamily)) {
    return loadingFonts.get(fontFamily)!
  }

  // Start loading
  const loadPromise = new Promise<void>((resolve, reject) => {
    try {
      // Create font face
      const weightsParam = weights.join(';')
      const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@${weightsParam}&display=swap`

      // Check if link already exists
      const existingLink = document.querySelector(`link[href*="${fontFamily.replace(/\s+/g, '+')}"]`)
      if (existingLink) {
        loadedFonts[fontFamily] = true
        resolve()
        return
      }

      // Create link element
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = fontUrl

      link.onload = () => {
        loadedFonts[fontFamily] = true
        loadingFonts.delete(fontFamily)

        // Store in localStorage for offline access
        storeFontInCache(fontFamily, fontUrl)

        resolve()
      }

      link.onerror = () => {
        loadingFonts.delete(fontFamily)
        reject(new Error(`Failed to load font: ${fontFamily}`))
      }

      document.head.appendChild(link)
    } catch (error) {
      loadingFonts.delete(fontFamily)
      reject(error)
    }
  })

  loadingFonts.set(fontFamily, loadPromise)
  return loadPromise
}

/**
 * Preload multiple fonts in parallel
 */
export async function preloadFonts(fonts: Array<{ family: string; weights?: string[] }>): Promise<void[]> {
  const loadPromises = fonts.map(font =>
    lazyLoadGoogleFont(font.family, font.weights)
  )

  return Promise.all(loadPromises)
}

/**
 * Store font metadata in cache for offline access
 */
function storeFontInCache(fontFamily: string, fontUrl: string) {
  try {
    const cachedFonts = JSON.parse(localStorage.getItem('cachedFonts') || '{}')
    cachedFonts[fontFamily] = {
      url: fontUrl,
      timestamp: Date.now(),
    }
    localStorage.setItem('cachedFonts', JSON.stringify(cachedFonts))
  } catch (error) {
    console.warn('Failed to cache font:', error)
  }
}

/**
 * Get cached fonts from localStorage
 */
export function getCachedFonts(): string[] {
  try {
    const cachedFonts = JSON.parse(localStorage.getItem('cachedFonts') || '{}')
    return Object.keys(cachedFonts)
  } catch (error) {
    return []
  }
}

/**
 * Clear old cached fonts (older than 30 days)
 */
export function clearOldFontCache() {
  try {
    const cachedFonts = JSON.parse(localStorage.getItem('cachedFonts') || '{}')
    const now = Date.now()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000

    Object.keys(cachedFonts).forEach(fontFamily => {
      const font = cachedFonts[fontFamily]
      if (now - font.timestamp > thirtyDays) {
        delete cachedFonts[fontFamily]
      }
    })

    localStorage.setItem('cachedFonts', JSON.stringify(cachedFonts))
  } catch (error) {
    console.warn('Failed to clear font cache:', error)
  }
}

/**
 * Check if a font is available (loaded or system font)
 */
export function isFontAvailable(fontFamily: string): boolean {
  // Check if already loaded
  if (loadedFonts[fontFamily]) {
    return true
  }

  // Check if it's a system font by attempting to measure text
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return false

  const testString = 'mmmmmmmmmmlli'
  const testSize = '72px'

  // Measure with fallback font
  context.font = `${testSize} monospace`
  const fallbackWidth = context.measureText(testString).width

  // Measure with requested font
  context.font = `${testSize} ${fontFamily}, monospace`
  const actualWidth = context.measureText(testString).width

  // If widths differ, the font is available
  return actualWidth !== fallbackWidth
}

/**
 * Get popular Google Fonts (commonly used in menu design)
 */
export function getPopularMenuFonts() {
  return [
    { family: 'Playfair Display', category: 'serif', weights: ['400', '700'] },
    { family: 'Merriweather', category: 'serif', weights: ['400', '700'] },
    { family: 'Montserrat', category: 'sans-serif', weights: ['400', '700'] },
    { family: 'Open Sans', category: 'sans-serif', weights: ['400', '700'] },
    { family: 'Poppins', category: 'sans-serif', weights: ['400', '700'] },
    { family: 'Inter', category: 'sans-serif', weights: ['400', '700'] },
    { family: 'Dancing Script', category: 'handwriting', weights: ['400', '700'] },
    { family: 'Pacifico', category: 'handwriting', weights: ['400'] },
    { family: 'Bebas Neue', category: 'display', weights: ['400'] },
    { family: 'Roboto', category: 'sans-serif', weights: ['400', '700'] },
  ]
}

/**
 * Preload popular menu fonts on app init
 */
export function initializeMenuFonts() {
  const popularFonts = getPopularMenuFonts()

  // Preload in chunks to avoid overwhelming the browser
  const chunkSize = 3
  let currentChunk = 0

  const loadNextChunk = () => {
    const start = currentChunk * chunkSize
    const end = Math.min(start + chunkSize, popularFonts.length)
    const chunk = popularFonts.slice(start, end)

    if (chunk.length === 0) return

    preloadFonts(chunk).then(() => {
      currentChunk++
      if (currentChunk * chunkSize < popularFonts.length) {
        setTimeout(loadNextChunk, 500) // Stagger loading
      }
    })
  }

  // Start loading after a short delay to not block initial render
  setTimeout(loadNextChunk, 1000)
}
