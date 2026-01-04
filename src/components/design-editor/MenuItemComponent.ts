'use client'

import * as fabric from 'fabric'

export interface PriceVariant {
  name: string // e.g., "Small", "Medium", "Large"
  price: string
}

export interface MenuItemData {
  id: string
  name: string
  description?: string
  price: string
  variants?: PriceVariant[] // For multi-size pricing
  categoryId?: string
  categoryName?: string
}

export interface MenuItemComponentOptions extends fabric.GroupOptions {
  productId: string
  menuItemData: MenuItemData
  nameStyle?: Partial<fabric.ITextOptions>
  priceStyle?: Partial<fabric.ITextOptions>
  descriptionStyle?: Partial<fabric.ITextOptions>
  variantHeaderStyle?: Partial<fabric.ITextOptions>
  layout?: 'horizontal' | 'vertical' | 'compact' | 'columnar' | 'flexible'
  showDescription?: boolean
  showVariants?: boolean
  maxWidth?: number
  nameToDisplayGap?: number // Distance between name and price/variants
  columnSpacing?: number // Space between variant columns
  variantColumns?: string[] // Order of variants to display
}

export class MenuItemComponent extends fabric.Group {
  public productId: string
  public menuItemData: MenuItemData
  public nameText: fabric.Text
  public priceText: fabric.Text
  public descriptionText?: fabric.Text
  public variantTexts: fabric.Text[] = []
  public variantHeaders: fabric.Text[] = []
  private options: MenuItemComponentOptions

  constructor(options: MenuItemComponentOptions) {
    const objects: fabric.Object[] = []

    // Store configuration
    const config = {
      layout: options.layout || 'horizontal',
      showDescription: options.showDescription !== false,
      showVariants: options.showVariants !== false,
      maxWidth: options.maxWidth || 400,
      nameToDisplayGap: options.nameToDisplayGap || 20,
      columnSpacing: options.columnSpacing || 60,
      variantColumns: options.variantColumns || ['Small', 'Medium', 'Large'],
      nameStyle: {
        fontSize: 18,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fill: '#2c3e50',
        ...options.nameStyle
      },
      priceStyle: {
        fontSize: 16,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fill: '#e74c3c',
        ...options.priceStyle
      },
      descriptionStyle: {
        fontSize: 14,
        fontFamily: 'Arial',
        fill: '#7f8c8d',
        ...options.descriptionStyle
      },
      variantHeaderStyle: {
        fontSize: 12,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fill: '#666666',
        ...options.variantHeaderStyle
      }
    }

    // Create name text
    const nameText = new fabric.Text(options.menuItemData.name, {
      ...config.nameStyle,
      left: 0,
      top: 0,
    })

    // Create price/variant elements
    let priceText: fabric.Text
    const variantTexts: fabric.Text[] = []
    const variantHeaders: fabric.Text[] = []

    // Check if we should show variants or single price
    const hasVariants = config.showVariants && options.menuItemData.variants && options.menuItemData.variants.length > 0

    if (hasVariants) {
      // Create variant headers and prices
      config.variantColumns.forEach((columnName, index) => {
        // Find matching variant
        const variant = options.menuItemData.variants?.find(v => v.name === columnName)

        if (variant) {
          // Create header
          const header = new fabric.Text(variant.name, {
            ...config.variantHeaderStyle,
            left: 0,
            top: 0,
          })
          variantHeaders.push(header)

          // Create price
          const variantPrice = new fabric.Text(`£${variant.price}`, {
            ...config.priceStyle,
            left: 0,
            top: 0,
          })
          variantTexts.push(variantPrice)
        }
      })

      // Use first variant as main price for backward compatibility
      priceText = variantTexts[0] || new fabric.Text(`£${options.menuItemData.price}`, {
        ...config.priceStyle,
        left: 0,
        top: 0,
      })
    } else {
      // Single price
      priceText = new fabric.Text(`£${options.menuItemData.price}`, {
        ...config.priceStyle,
        left: 0,
        top: 0,
      })
    }

    // Create description text if needed
    let descriptionText: fabric.Text | undefined
    if (config.showDescription && options.menuItemData.description) {
      descriptionText = new fabric.Text(options.menuItemData.description, {
        ...config.descriptionStyle,
        left: 0,
        top: 0,
        splitByGrapheme: true,
      })

      // Handle text wrapping
      if (descriptionText.width! > config.maxWidth - 20) {
        const words = options.menuItemData.description.split(' ')
        let lines: string[] = []
        let currentLine = ''

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word
          const testText = new fabric.Text(testLine, config.descriptionStyle)

          if (testText.width! > config.maxWidth - 20 && currentLine) {
            lines.push(currentLine)
            currentLine = word
          } else {
            currentLine = testLine
          }
        }
        if (currentLine) lines.push(currentLine)

        descriptionText.set('text', lines.join('\n'))
      }
    }

    // Add all elements to objects array
    objects.push(nameText)

    // Add variant headers and prices if using variants
    if (hasVariants) {
      variantHeaders.forEach(header => objects.push(header))
      variantTexts.forEach(price => objects.push(price))
    } else {
      objects.push(priceText)
    }

    if (descriptionText) objects.push(descriptionText)

    // Initialize parent Group FIRST
    super(objects, {
      ...options,
      selectable: true,
      hasControls: true,
      hasBorders: true,
    })

    // Position elements based on layout AFTER super() call
    this.layoutElements(nameText, priceText, descriptionText, variantHeaders, variantTexts, config, hasVariants)

    // Store references
    this.productId = options.productId
    this.menuItemData = options.menuItemData
    this.nameText = nameText
    this.priceText = priceText
    this.descriptionText = descriptionText
    this.variantTexts = variantTexts
    this.variantHeaders = variantHeaders
    this.options = { ...options, ...config }

    // Set custom type for identification
    this.set('type', 'menu-item-component')
    this.set('subTargetCheck', true) // Allow selection of sub-objects
  }

  // Layout elements based on the chosen layout type
  private layoutElements(
    nameText: fabric.Text,
    priceText: fabric.Text,
    descriptionText: fabric.Text | undefined,
    variantHeaders: fabric.Text[],
    variantTexts: fabric.Text[],
    config: any,
    hasVariants: boolean
  ) {
    if (config.layout === 'horizontal') {
      // Name on left, price on right
      nameText.set({ left: 0, top: 0 })
      priceText.set({
        left: config.maxWidth - priceText.width! - 10,
        top: 0
      })
      if (descriptionText) {
        descriptionText.set({
          left: 0,
          top: nameText.height! + 5
        })
      }
    } else if (config.layout === 'flexible') {
      // Name on left, price at configurable distance
      nameText.set({ left: 0, top: 0 })
      priceText.set({
        left: nameText.width! + config.nameToDisplayGap,
        top: 0
      })
      if (descriptionText) {
        descriptionText.set({
          left: 0,
          top: nameText.height! + 5
        })
      }
    } else if (config.layout === 'columnar' && hasVariants) {
      // Menu item name on left, variant columns on right
      nameText.set({ left: 0, top: 0 })

      // Position variant headers
      let currentX = nameText.width! + config.nameToDisplayGap
      variantHeaders.forEach((header, index) => {
        header.set({
          left: currentX,
          top: 0
        })

        // Position corresponding price below header
        if (variantTexts[index]) {
          variantTexts[index].set({
            left: currentX,
            top: header.height! + 2
          })
        }

        currentX += config.columnSpacing
      })

      if (descriptionText) {
        descriptionText.set({
          left: 0,
          top: Math.max(nameText.height!, variantHeaders[0]?.height! + variantTexts[0]?.height! + 2 || 0) + 5
        })
      }
    } else if (config.layout === 'vertical') {
      // Name on top, price below, description at bottom
      nameText.set({ left: 0, top: 0 })
      priceText.set({
        left: 0,
        top: nameText.height! + 5
      })
      if (descriptionText) {
        descriptionText.set({
          left: 0,
          top: nameText.height! + priceText.height! + 10
        })
      }
    } else if (config.layout === 'compact') {
      // Name and price on same line, description below if present
      nameText.set({ left: 0, top: 0 })
      const nameWidth = Math.min(nameText.width!, config.maxWidth * 0.85)
      if (nameText.width! > nameWidth) {
        // Truncate name if too long
        nameText.set('text', this.truncateText(nameText.text!, nameWidth, config.nameStyle))
      }
      priceText.set({
        left: nameWidth + 10,
        top: 0
      })
      if (descriptionText) {
        descriptionText.set({
          left: 0,
          top: Math.max(nameText.height!, priceText.height!) + 5
        })
      }
    }
  }

  // Update the menu item data and refresh display
  updateMenuData(newData: Partial<MenuItemData>) {
    this.menuItemData = { ...this.menuItemData, ...newData }

    if (newData.name) {
      this.nameText.set('text', newData.name)
    }

    if (newData.price) {
      this.priceText.set('text', `£${newData.price}`)
    }

    if (newData.description !== undefined) {
      if (this.descriptionText) {
        if (newData.description) {
          this.descriptionText.set('text', newData.description)
        } else {
          // Remove description if set to empty
          this.remove(this.descriptionText)
          this.descriptionText = undefined
        }
      } else if (newData.description && this.options.showDescription) {
        // Add description if it didn't exist before
        this.descriptionText = new fabric.Text(newData.description, {
          ...this.options.descriptionStyle,
          left: 0,
          top: this.nameText.height! + this.priceText.height! + 10
        })
        this.add(this.descriptionText)
      }
    }

    // Re-layout components
    this.relayout()

    // Trigger canvas re-render if attached
    if (this.canvas) {
      this.canvas.renderAll()
    }
  }

  // Re-layout components after data changes
  private relayout() {
    const config = this.options

    if (config.layout === 'horizontal') {
      this.nameText.set({ left: 0, top: 0 })
      this.priceText.set({
        left: config.maxWidth! - this.priceText.width! - 10,
        top: 0
      })
      if (this.descriptionText) {
        this.descriptionText.set({
          left: 0,
          top: this.nameText.height! + 5
        })
      }
    } else if (config.layout === 'vertical') {
      this.nameText.set({ left: 0, top: 0 })
      this.priceText.set({
        left: 0,
        top: this.nameText.height! + 5
      })
      if (this.descriptionText) {
        this.descriptionText.set({
          left: 0,
          top: this.nameText.height! + this.priceText.height! + 10
        })
      }
    } else if (config.layout === 'compact') {
      this.nameText.set({ left: 0, top: 0 })
      const nameWidth = Math.min(this.nameText.width!, config.maxWidth! * 0.85)
      this.priceText.set({
        left: nameWidth + 10,
        top: 0
      })
      if (this.descriptionText) {
        this.descriptionText.set({
          left: 0,
          top: Math.max(this.nameText.height!, this.priceText.height!) + 5
        })
      }
    }
  }

  // Utility method to truncate text
  private truncateText(text: string, maxWidth: number, style: Partial<fabric.ITextOptions>): string {
    const testText = new fabric.Text(text, style)
    if (testText.width! <= maxWidth) return text

    let truncated = text
    while (truncated.length > 0) {
      truncated = truncated.slice(0, -1)
      const test = new fabric.Text(truncated + '...', style)
      if (test.width! <= maxWidth) {
        return truncated + '...'
      }
    }
    return '...'
  }

  // Serialize for saving/loading
  toObject(propertiesToInclude?: string[]) {
    const obj = super.toObject(propertiesToInclude)
    return {
      ...obj,
      type: 'menu-item-component',
      productId: this.productId,
      menuItemData: this.menuItemData,
      options: this.options
    }
  }

  // Static method to create from serialized data
  static fromObject(object: any, callback: (obj: MenuItemComponent) => void) {
    const component = new MenuItemComponent({
      productId: object.productId,
      menuItemData: object.menuItemData,
      ...object.options,
      left: object.left,
      top: object.top,
      angle: object.angle,
      scaleX: object.scaleX,
      scaleY: object.scaleY,
    })
    callback(component)
  }
}

// Register the custom class with fabric.js
fabric.Object.prototype.toObject = (function(toObject) {
  return function(propertiesToInclude) {
    return {
      ...toObject.call(this, propertiesToInclude),
      type: this.type
    }
  }
})(fabric.Object.prototype.toObject)

// Register the custom class for deserialization
declare global {
  interface Window {
    fabric: typeof fabric;
  }
}

if (typeof window !== 'undefined') {
  window.fabric = fabric;
  // Register the custom type for loading from JSON
  // Note: This registration is for fabric.js internal use
  const fabricGlobal = fabric as any;
  fabricGlobal.MenuItemComponent = MenuItemComponent;
}