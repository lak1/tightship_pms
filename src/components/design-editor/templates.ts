'use client'

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
    id: 'a3-portrait',
    name: 'A3 Portrait',
    description: 'Large A3 paper, portrait orientation (297×420mm)',
    width: 3508,
    height: 4961,
    dpi: 300,
    category: 'print',
    orientation: 'portrait',
    units: 'px'
  },
  {
    id: 'a3-landscape',
    name: 'A3 Landscape',
    description: 'Large A3 paper, landscape orientation (420×297mm)',
    width: 4961,
    height: 3508,
    dpi: 300,
    category: 'print',
    orientation: 'landscape',
    units: 'px'
  },
  {
    id: 'letter-portrait',
    name: 'Letter Portrait',
    description: 'US Letter paper, portrait orientation (8.5×11")',
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
    description: 'US Letter paper, landscape orientation (11×8.5")',
    width: 3300,
    height: 2550,
    dpi: 300,
    category: 'print',
    orientation: 'landscape',
    units: 'px'
  },
  {
    id: 'tri-fold',
    name: 'Tri-fold Brochure',
    description: 'Tri-fold takeaway menu (11×8.5", folded)',
    width: 3300,
    height: 2550,
    dpi: 300,
    category: 'print',
    orientation: 'landscape',
    units: 'px'
  },

  // Digital display sizes (72-96 DPI for screens)
  {
    id: 'hd-landscape',
    name: 'HD Landscape',
    description: 'Standard HD display (1920×1080px)',
    width: 1920,
    height: 1080,
    dpi: 72,
    category: 'digital',
    orientation: 'landscape',
    units: 'px'
  },
  {
    id: 'hd-portrait',
    name: 'HD Portrait',
    description: 'HD display, portrait orientation (1080×1920px)',
    width: 1080,
    height: 1920,
    dpi: 72,
    category: 'digital',
    orientation: 'portrait',
    units: 'px'
  },
  {
    id: '4k-landscape',
    name: '4K Landscape',
    description: '4K display (3840×2160px)',
    width: 3840,
    height: 2160,
    dpi: 96,
    category: 'digital',
    orientation: 'landscape',
    units: 'px'
  },
  {
    id: '4k-portrait',
    name: '4K Portrait',
    description: '4K display, portrait orientation (2160×3840px)',
    width: 2160,
    height: 3840,
    dpi: 96,
    category: 'digital',
    orientation: 'portrait',
    units: 'px'
  },
  {
    id: 'tablet-landscape',
    name: 'Tablet Landscape',
    description: 'Tablet display (1024×768px)',
    width: 1024,
    height: 768,
    dpi: 72,
    category: 'digital',
    orientation: 'landscape',
    units: 'px'
  },
  {
    id: 'tablet-portrait',
    name: 'Tablet Portrait',
    description: 'Tablet display, portrait orientation (768×1024px)',
    width: 768,
    height: 1024,
    dpi: 72,
    category: 'digital',
    orientation: 'portrait',
    units: 'px'
  },
  {
    id: 'square-display',
    name: 'Square Display',
    description: 'Square digital menu board (1080×1080px)',
    width: 1080,
    height: 1080,
    dpi: 72,
    category: 'digital',
    orientation: 'square',
    units: 'px'
  }
]

// Pre-designed templates
export const DESIGN_TEMPLATES: DesignTemplate[] = [
  // Restaurant Menu Templates
  {
    id: 'classic-restaurant',
    name: 'Classic Restaurant Menu',
    description: 'Traditional elegant restaurant menu with serif fonts',
    category: 'restaurant-menu',
    size: TEMPLATE_SIZES.find(s => s.id === 'a4-portrait')!,
    backgroundColor: '#ffffff',
    gridSize: 20,
    margins: { top: 60, right: 60, bottom: 60, left: 60 },
    defaultStyles: {
      heading: {
        fontSize: 36,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        color: '#2c3e50'
      },
      category: {
        fontSize: 24,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        color: '#8b4513'
      },
      itemName: {
        fontSize: 16,
        fontFamily: 'Georgia',
        fontWeight: 'normal',
        color: '#2c3e50'
      },
      itemPrice: {
        fontSize: 16,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        color: '#e74c3c'
      },
      itemDescription: {
        fontSize: 12,
        fontFamily: 'Georgia',
        fontWeight: 'normal',
        color: '#7f8c8d'
      }
    }
  },
  {
    id: 'modern-restaurant',
    name: 'Modern Restaurant Menu',
    description: 'Clean modern design with sans-serif fonts',
    category: 'restaurant-menu',
    size: TEMPLATE_SIZES.find(s => s.id === 'a4-portrait')!,
    backgroundColor: '#ffffff',
    gridSize: 15,
    margins: { top: 40, right: 40, bottom: 40, left: 40 },
    defaultStyles: {
      heading: {
        fontSize: 42,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#2c3e50'
      },
      category: {
        fontSize: 28,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#3498db'
      },
      itemName: {
        fontSize: 18,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#2c3e50'
      },
      itemPrice: {
        fontSize: 18,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#e74c3c'
      },
      itemDescription: {
        fontSize: 14,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        color: '#7f8c8d'
      }
    }
  },

  // Takeaway Menu Templates
  {
    id: 'compact-takeaway',
    name: 'Compact Takeaway Menu',
    description: 'Space-efficient design for takeaway menus',
    category: 'takeaway-menu',
    size: TEMPLATE_SIZES.find(s => s.id === 'a4-portrait')!,
    backgroundColor: '#ffffff',
    gridSize: 10,
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    defaultStyles: {
      heading: {
        fontSize: 28,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#2c3e50'
      },
      category: {
        fontSize: 20,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#e74c3c'
      },
      itemName: {
        fontSize: 14,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#2c3e50'
      },
      itemPrice: {
        fontSize: 14,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#e74c3c'
      },
      itemDescription: {
        fontSize: 11,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        color: '#7f8c8d'
      }
    }
  },
  {
    id: 'tri-fold-takeaway',
    name: 'Tri-fold Takeaway',
    description: 'Three-panel folded takeaway menu',
    category: 'takeaway-menu',
    size: TEMPLATE_SIZES.find(s => s.id === 'tri-fold')!,
    backgroundColor: '#ffffff',
    gridSize: 20,
    margins: { top: 30, right: 30, bottom: 30, left: 30 },
    defaultStyles: {
      heading: {
        fontSize: 32,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#2c3e50'
      },
      category: {
        fontSize: 22,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#e74c3c'
      },
      itemName: {
        fontSize: 16,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#2c3e50'
      },
      itemPrice: {
        fontSize: 16,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#e74c3c'
      },
      itemDescription: {
        fontSize: 12,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        color: '#7f8c8d'
      }
    }
  },

  // Digital Display Templates
  {
    id: 'digital-board-landscape',
    name: 'Digital Menu Board',
    description: 'Large text for digital displays in landscape',
    category: 'digital-display',
    size: TEMPLATE_SIZES.find(s => s.id === 'hd-landscape')!,
    backgroundColor: '#1a1a1a',
    gridSize: 25,
    margins: { top: 50, right: 50, bottom: 50, left: 50 },
    defaultStyles: {
      heading: {
        fontSize: 48,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#ffffff'
      },
      category: {
        fontSize: 36,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#f39c12'
      },
      itemName: {
        fontSize: 24,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#ffffff'
      },
      itemPrice: {
        fontSize: 28,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#e74c3c'
      },
      itemDescription: {
        fontSize: 18,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        color: '#ecf0f1'
      }
    }
  },
  {
    id: 'digital-board-portrait',
    name: 'Digital Menu Board Portrait',
    description: 'Portrait orientation for vertical displays',
    category: 'digital-display',
    size: TEMPLATE_SIZES.find(s => s.id === 'hd-portrait')!,
    backgroundColor: '#2c3e50',
    gridSize: 20,
    margins: { top: 40, right: 40, bottom: 40, left: 40 },
    defaultStyles: {
      heading: {
        fontSize: 40,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#ffffff'
      },
      category: {
        fontSize: 30,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#3498db'
      },
      itemName: {
        fontSize: 20,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#ffffff'
      },
      itemPrice: {
        fontSize: 22,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#e74c3c'
      },
      itemDescription: {
        fontSize: 16,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        color: '#ecf0f1'
      }
    }
  },
  {
    id: 'modern-digital-square',
    name: 'Modern Square Display',
    description: 'Modern design for square digital displays',
    category: 'digital-display',
    size: TEMPLATE_SIZES.find(s => s.id === 'square-display')!,
    backgroundColor: '#ffffff',
    gridSize: 20,
    margins: { top: 40, right: 40, bottom: 40, left: 40 },
    defaultStyles: {
      heading: {
        fontSize: 36,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#2c3e50'
      },
      category: {
        fontSize: 26,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#e74c3c'
      },
      itemName: {
        fontSize: 18,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#2c3e50'
      },
      itemPrice: {
        fontSize: 20,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#e74c3c'
      },
      itemDescription: {
        fontSize: 14,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        color: '#7f8c8d'
      }
    }
  }
]

// Helper functions
export function getTemplateById(id: string): DesignTemplate | undefined {
  return DESIGN_TEMPLATES.find(template => template.id === id)
}

export function getTemplatesByCategory(category: DesignTemplate['category']): DesignTemplate[] {
  return DESIGN_TEMPLATES.filter(template => template.category === category)
}

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