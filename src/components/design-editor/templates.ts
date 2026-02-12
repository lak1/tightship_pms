'use client'

/**
 * Templates System
 *
 * This file provides types and re-exports for the professional 50+ template system.
 * The actual templates are generated in the templates/ subfolder.
 */

export interface TemplateSize {
  id: string
  name: string
  description: string
  width: number
  height: number
  dpi: number
  category: 'print' | 'digital' | 'custom'
  orientation: 'portrait' | 'landscape' | 'square'
  units: 'px' | 'mm' | 'in'
}

export interface DesignTemplate {
  id: string
  name: string
  description: string
  category: 'restaurant-menu' | 'takeaway-menu' | 'digital-display' | 'custom'
  size: TemplateSize
  backgroundColor: string
  gridSize?: number
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
  defaultStyles: {
    heading: {
      fontSize: number
      fontFamily: string
      fontWeight: string
      color: string
    }
    category: {
      fontSize: number
      fontFamily: string
      fontWeight: string
      color: string
    }
    itemName: {
      fontSize: number
      fontFamily: string
      fontWeight: string
      color: string
    }
    itemPrice: {
      fontSize: number
      fontFamily: string
      fontWeight: string
      color: string
    }
    itemDescription: {
      fontSize: number
      fontFamily: string
      fontWeight: string
      color: string
    }
  }
}

// Standard template sizes
export const TEMPLATE_SIZES: TemplateSize[] = [
  // Print sizes (300 DPI for high quality printing)
  {
    id: 'a4-portrait',
    name: 'A4 Portrait',
    description: 'Standard A4 paper, portrait orientation (210×297mm)',
    width: 2480,
    height: 3508,
    dpi: 300,
    category: 'print',
    orientation: 'portrait',
    units: 'px'
  },
  {
    id: 'a4-landscape',
    name: 'A4 Landscape',
    description: 'Standard A4 paper, landscape orientation (297×210mm)',
    width: 3508,
    height: 2480,
    dpi: 300,
    category: 'print',
    orientation: 'landscape',
    units: 'px'
  },
  {
    id: 'letter-portrait',
    name: 'Letter Portrait',
    description: 'US Letter size, portrait orientation (8.5×11in)',
    width: 2550,
    height: 3300,
    dpi: 300,
    category: 'print',
    orientation: 'portrait',
    units: 'px'
  },
  {
    id: 'letter-landscape',
    name: 'Letter Landscape',
    description: 'US Letter size, landscape orientation (11×8.5in)',
    width: 3300,
    height: 2550,
    dpi: 300,
    category: 'print',
    orientation: 'landscape',
    units: 'px'
  },
  // Digital sizes
  {
    id: 'hd-landscape',
    name: 'HD Display (1920×1080)',
    description: 'Full HD landscape for digital menu boards',
    width: 1920,
    height: 1080,
    dpi: 72,
    category: 'digital',
    orientation: 'landscape',
    units: 'px'
  },
  {
    id: 'hd-portrait',
    name: 'HD Display (1080×1920)',
    description: 'Full HD portrait for digital menu boards',
    width: 1080,
    height: 1920,
    dpi: 72,
    category: 'digital',
    orientation: 'portrait',
    units: 'px'
  },
]

// Helper functions for template sizes
export function getSizeById(id: string): TemplateSize | undefined {
  return TEMPLATE_SIZES.find(size => size.id === id)
}

export function getSizesByCategory(category: TemplateSize['category']): TemplateSize[] {
  return TEMPLATE_SIZES.filter(size => size.category === category)
}

// Calculate canvas dimensions for display (scaled down for editing)
export function getCanvasDisplayDimensions(template: DesignTemplate, maxWidth: number = 800, maxHeight: number = 600) {
  const { width, height } = template.size
  const aspectRatio = width / height

  let displayWidth = maxWidth
  let displayHeight = maxWidth / aspectRatio

  if (displayHeight > maxHeight) {
    displayHeight = maxHeight
    displayWidth = maxHeight * aspectRatio
  }

  return {
    width: Math.round(displayWidth),
    height: Math.round(displayHeight),
    scale: displayWidth / width
  }
}

// Convert template units to pixels for canvas
export function convertToPixels(value: number, fromUnit: string, dpi: number = 72): number {
  switch (fromUnit) {
    case 'mm':
      return (value * dpi) / 25.4
    case 'in':
      return value * dpi
    case 'px':
    default:
      return value
  }
}

// Basic legacy templates for backward compatibility
export const DESIGN_TEMPLATES: DesignTemplate[] = [
  {
    id: 'classic-menu',
    name: 'Classic Restaurant Menu',
    description: 'Traditional restaurant menu with elegant typography',
    category: 'restaurant-menu',
    size: TEMPLATE_SIZES[0],
    backgroundColor: '#ffffff',
    margins: { top: 60, right: 60, bottom: 60, left: 60 },
    defaultStyles: {
      heading: { fontSize: 36, fontFamily: 'Georgia', fontWeight: 'bold', color: '#2c3e50' },
      category: { fontSize: 24, fontFamily: 'Georgia', fontWeight: 'bold', color: '#34495e' },
      itemName: { fontSize: 16, fontFamily: 'Arial', fontWeight: 'normal', color: '#2c3e50' },
      itemPrice: { fontSize: 16, fontFamily: 'Arial', fontWeight: 'bold', color: '#e74c3c' },
      itemDescription: { fontSize: 13, fontFamily: 'Arial', fontWeight: 'normal', color: '#7f8c8d' }
    }
  },
  {
    id: 'modern-takeaway',
    name: 'Modern Takeaway Menu',
    description: 'Clean and modern design for takeaway menus',
    category: 'takeaway-menu',
    size: TEMPLATE_SIZES[0],
    backgroundColor: '#f8f9fa',
    margins: { top: 40, right: 40, bottom: 40, left: 40 },
    defaultStyles: {
      heading: { fontSize: 32, fontFamily: 'Arial', fontWeight: 'bold', color: '#1a1a1a' },
      category: { fontSize: 22, fontFamily: 'Arial', fontWeight: 'bold', color: '#333333' },
      itemName: { fontSize: 15, fontFamily: 'Arial', fontWeight: 'normal', color: '#1a1a1a' },
      itemPrice: { fontSize: 15, fontFamily: 'Arial', fontWeight: 'bold', color: '#d35400' },
      itemDescription: { fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', color: '#666666' }
    }
  },
  {
    id: 'digital-board',
    name: 'Digital Menu Board',
    description: 'High contrast design for digital displays',
    category: 'digital-display',
    size: TEMPLATE_SIZES[4],
    backgroundColor: '#1a1a1a',
    margins: { top: 80, right: 80, bottom: 80, left: 80 },
    defaultStyles: {
      heading: { fontSize: 48, fontFamily: 'Arial', fontWeight: 'bold', color: '#ffffff' },
      category: { fontSize: 32, fontFamily: 'Arial', fontWeight: 'bold', color: '#f39c12' },
      itemName: { fontSize: 24, fontFamily: 'Arial', fontWeight: 'normal', color: '#ffffff' },
      itemPrice: { fontSize: 28, fontFamily: 'Arial', fontWeight: 'bold', color: '#27ae60' },
      itemDescription: { fontSize: 18, fontFamily: 'Arial', fontWeight: 'normal', color: '#bdc3c7' }
    }
  }
]

// Helper to get templates by legacy category
export function getTemplatesByCategory(category: DesignTemplate['category']): DesignTemplate[] {
  return DESIGN_TEMPLATES.filter(template => template.category === category)
}

// Re-export the 50+ professional templates from templates/index
export {
  getAllTemplates,
  getCategories,
  searchTemplates,
  type TemplateWithData
} from './templates/index'
