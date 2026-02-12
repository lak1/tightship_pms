/**
 * Template Generator Factory System
 *
 * This system allows programmatic generation of menu templates with different
 * color schemes, layouts, and styles. Instead of manually creating 50+ templates,
 * we define base templates and generate variations automatically.
 */

export interface ColorPalette {
  primary: string
  secondary: string
  accent: string
  text: string
  textLight: string
  background: string
  border: string
}

export interface Typography {
  headingFont: string
  bodyFont: string
  accentFont?: string
  headingSize: number
  categorySize: number
  itemSize: number
  priceSize: number
  descriptionSize: number
}

export interface LayoutConfig {
  width: number
  height: number
  dpi: number
  orientation: 'portrait' | 'landscape'
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
  columns: number
  spacing: number
}

export interface TemplateConfig {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  colorScheme: ColorPalette
  typography: Typography
  layout: LayoutConfig
  decorativeElements?: boolean
}

// Pre-defined color schemes
export const COLOR_SCHEMES: Record<string, ColorPalette> = {
  elegant: {
    primary: '#2C1810',
    secondary: '#8B6F47',
    accent: '#D4AF37',
    text: '#2C1810',
    textLight: '#6B5744',
    background: '#FBF9F6',
    border: '#E5DDD2',
  },
  modern: {
    primary: '#1A1A1A',
    secondary: '#4A4A4A',
    accent: '#00A8E8',
    text: '#1A1A1A',
    textLight: '#757575',
    background: '#FFFFFF',
    border: '#E0E0E0',
  },
  rustic: {
    primary: '#5C4033',
    secondary: '#8B7355',
    accent: '#D4A373',
    text: '#3E2723',
    textLight: '#795548',
    background: '#FAF5F0',
    border: '#D7CCC8',
  },
  vibrant: {
    primary: '#D32F2F',
    secondary: '#F57C00',
    accent: '#FBC02D',
    text: '#212121',
    textLight: '#616161',
    background: '#FFFDE7',
    border: '#FFE082',
  },
  minimalist: {
    primary: '#000000',
    secondary: '#424242',
    accent: '#9E9E9E',
    text: '#000000',
    textLight: '#757575',
    background: '#FFFFFF',
    border: '#BDBDBD',
  },
  warm: {
    primary: '#BF360C',
    secondary: '#FF6F00',
    accent: '#FFAB00',
    text: '#3E2723',
    textLight: '#6D4C41',
    background: '#FFF3E0',
    border: '#FFCCBC',
  },
  cool: {
    primary: '#01579B',
    secondary: '#0277BD',
    accent: '#00ACC1',
    text: '#263238',
    textLight: '#546E7A',
    background: '#E1F5FE',
    border: '#B3E5FC',
  },
  vintage: {
    primary: '#4A148C',
    secondary: '#7B1FA2',
    accent: '#BA68C8',
    text: '#311B92',
    textLight: '#673AB7',
    background: '#F3E5F5',
    border: '#CE93D8',
  },
}

// Pre-defined typography systems
export const TYPOGRAPHY_SYSTEMS: Record<string, Typography> = {
  serif: {
    headingFont: 'Playfair Display',
    bodyFont: 'Merriweather',
    headingSize: 48,
    categorySize: 28,
    itemSize: 18,
    priceSize: 16,
    descriptionSize: 14,
  },
  sansSerif: {
    headingFont: 'Montserrat',
    bodyFont: 'Open Sans',
    headingSize: 44,
    categorySize: 26,
    itemSize: 16,
    priceSize: 16,
    descriptionSize: 13,
  },
  modern: {
    headingFont: 'Poppins',
    bodyFont: 'Inter',
    headingSize: 42,
    categorySize: 24,
    itemSize: 16,
    priceSize: 15,
    descriptionSize: 12,
  },
  handwritten: {
    headingFont: 'Dancing Script',
    bodyFont: 'Open Sans',
    accentFont: 'Pacifico',
    headingSize: 52,
    categorySize: 30,
    itemSize: 17,
    priceSize: 16,
    descriptionSize: 14,
  },
  bold: {
    headingFont: 'Bebas Neue',
    bodyFont: 'Roboto',
    headingSize: 56,
    categorySize: 32,
    itemSize: 18,
    priceSize: 18,
    descriptionSize: 14,
  },
}

// Standard layout configurations
export const LAYOUT_CONFIGS: Record<string, LayoutConfig> = {
  a4Portrait: {
    width: 2480,
    height: 3508,
    dpi: 300,
    orientation: 'portrait',
    margins: { top: 150, right: 150, bottom: 150, left: 150 },
    columns: 1,
    spacing: 40,
  },
  a4Landscape: {
    width: 3508,
    height: 2480,
    dpi: 300,
    orientation: 'landscape',
    margins: { top: 120, right: 120, bottom: 120, left: 120 },
    columns: 2,
    spacing: 60,
  },
  letterPortrait: {
    width: 2550,
    height: 3300,
    dpi: 300,
    orientation: 'portrait',
    margins: { top: 150, right: 150, bottom: 150, left: 150 },
    columns: 1,
    spacing: 40,
  },
  digital1080p: {
    width: 1920,
    height: 1080,
    dpi: 96,
    orientation: 'landscape',
    margins: { top: 80, right: 80, bottom: 80, left: 80 },
    columns: 3,
    spacing: 40,
  },
  digitalPortrait: {
    width: 1080,
    height: 1920,
    dpi: 96,
    orientation: 'portrait',
    margins: { top: 60, right: 60, bottom: 60, left: 60 },
    columns: 1,
    spacing: 30,
  },
  square: {
    width: 1080,
    height: 1080,
    dpi: 96,
    orientation: 'portrait',
    margins: { top: 60, right: 60, bottom: 60, left: 60 },
    columns: 1,
    spacing: 30,
  },
}

/**
 * Generate a template JSON object for Fabric.js v6
 */
export function generateTemplate(config: TemplateConfig): any {
  const { colorScheme, typography, layout } = config

  const objects: any[] = []

  // Background
  objects.push({
    type: 'Rect',
    version: '6.0.0',
    originX: 'left',
    originY: 'top',
    left: 0,
    top: 0,
    width: layout.width,
    height: layout.height,
    fill: colorScheme.background,
    stroke: null,
    strokeWidth: 0,
    selectable: false,
    evented: false,
  })

  // Title/Header
  const titleY = layout.margins.top
  objects.push({
    type: 'Text',
    version: '6.0.0',
    left: layout.width / 2,
    top: titleY,
    width: 200,
    height: typography.headingSize,
    text: 'MENU',
    fontFamily: typography.headingFont,
    fontSize: typography.headingSize,
    fill: colorScheme.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    originX: 'center',
    originY: 'top',
  })

  // Decorative line under title
  if (config.decorativeElements) {
    objects.push({
      type: 'Rect',
      version: '6.0.0',
      originX: 'left',
      originY: 'top',
      left: layout.width / 2 - 200,
      top: titleY + typography.headingSize + 20,
      width: 400,
      height: 3,
      fill: colorScheme.accent,
      stroke: null,
      strokeWidth: 0,
      selectable: true,
    })
  }

  // Category example
  const categoryY = titleY + typography.headingSize + 80
  objects.push({
    type: 'Text',
    version: '6.0.0',
    originX: 'left',
    originY: 'top',
    left: layout.margins.left,
    top: categoryY,
    width: 200,
    height: typography.categorySize,
    text: 'Appetizers',
    fontFamily: typography.headingFont,
    fontSize: typography.categorySize,
    fill: colorScheme.secondary,
    fontWeight: '600',
  })

  // Category underline
  objects.push({
    type: 'Line',
    version: '6.0.0',
    originX: 'left',
    originY: 'top',
    left: layout.margins.left,
    top: categoryY + typography.categorySize + 10,
    width: 300,
    height: 0,
    x1: 0,
    y1: 0,
    x2: 300,
    y2: 0,
    stroke: colorScheme.border,
    strokeWidth: 2,
    fill: null,
  })

  // Sample menu items
  const itemStartY = categoryY + typography.categorySize + 40
  const itemSpacing = 80

  for (let i = 0; i < 3; i++) {
    const itemY = itemStartY + i * itemSpacing

    // Item name
    objects.push({
      type: 'Text',
      version: '6.0.0',
      originX: 'left',
      originY: 'top',
      left: layout.margins.left,
      top: itemY,
      width: 300,
      height: typography.itemSize,
      text: `Menu Item ${i + 1}`,
      fontFamily: typography.bodyFont,
      fontSize: typography.itemSize,
      fill: colorScheme.text,
      fontWeight: '500',
    })

    // Price
    objects.push({
      type: 'Text',
      version: '6.0.0',
      originX: 'right',
      originY: 'top',
      left: layout.width - layout.margins.right,
      top: itemY,
      width: 100,
      height: typography.priceSize,
      text: `$${(12 + i * 2)}.99`,
      fontFamily: typography.bodyFont,
      fontSize: typography.priceSize,
      fill: colorScheme.accent,
      fontWeight: 'bold',
    })

    // Description
    objects.push({
      type: 'Text',
      version: '6.0.0',
      originX: 'left',
      originY: 'top',
      left: layout.margins.left,
      top: itemY + typography.itemSize + 8,
      width: layout.width - layout.margins.left - layout.margins.right - 100,
      height: typography.descriptionSize,
      text: 'A delicious description of this amazing menu item',
      fontFamily: typography.bodyFont,
      fontSize: typography.descriptionSize,
      fill: colorScheme.textLight,
      fontStyle: 'italic',
    })
  }

  // Footer decorative element
  if (config.decorativeElements) {
    objects.push({
      type: 'Text',
      version: '6.0.0',
      originX: 'center',
      originY: 'top',
      left: layout.width / 2,
      top: layout.height - layout.margins.bottom - 40,
      width: 100,
      height: 20,
      text: '✦ ✦ ✦',
      fontFamily: typography.bodyFont,
      fontSize: 20,
      fill: colorScheme.accent,
    })
  }

  return {
    version: '6.0.0',
    objects,
    background: colorScheme.background,
  }
}

/**
 * Generate multiple template variations
 */
export function generateTemplateVariations(
  baseName: string,
  category: string,
  colorSchemes: string[],
  typographySystems: string[],
  layoutConfigs: string[],
  tags: string[] = []
): TemplateConfig[] {
  const templates: TemplateConfig[] = []
  let counter = 1

  for (const colorKey of colorSchemes) {
    for (const typoKey of typographySystems) {
      for (const layoutKey of layoutConfigs) {
        const colorScheme = COLOR_SCHEMES[colorKey]
        const typography = TYPOGRAPHY_SYSTEMS[typoKey]
        const layout = LAYOUT_CONFIGS[layoutKey]

        if (!colorScheme || !typography || !layout) continue

        const id = `${category.toLowerCase()}-${counter}`
        const name = `${baseName} ${counter}`
        const description = `${baseName} with ${colorKey} colors, ${typoKey} typography, and ${layoutKey} layout`

        templates.push({
          id,
          name,
          description,
          category,
          tags: [...tags, colorKey, typoKey, layoutKey],
          colorScheme,
          typography,
          layout,
          decorativeElements: true,
        })

        counter++
      }
    }
  }

  return templates
}

/**
 * Quick template creation helpers
 */
export function createTemplate(
  name: string,
  category: string,
  colorScheme: string,
  typography: string,
  layout: string,
  tags: string[] = []
): TemplateConfig {
  return {
    id: `${category.toLowerCase()}-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    description: `${name} menu template`,
    category,
    tags,
    colorScheme: COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.modern,
    typography: TYPOGRAPHY_SYSTEMS[typography] || TYPOGRAPHY_SYSTEMS.sansSerif,
    layout: LAYOUT_CONFIGS[layout] || LAYOUT_CONFIGS.a4Portrait,
    decorativeElements: true,
  }
}
