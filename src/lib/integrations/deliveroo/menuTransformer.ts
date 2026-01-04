/**
 * Deliveroo Menu Transformer
 * Converts Tightship menu structure to Deliveroo Menu API format
 *
 * Documentation: https://api-docs.deliveroo.com/docs/menu-api-guidelines
 * Structure: menus → mealtimes → categories → items → modifiers → choices
 */

import type { DeliverooMenu, DeliverooCategory, DeliverooMenuItem, DeliverooModifierGroup } from './types'

interface TightshipMenu {
  id: string
  name: string
  description?: string | null
  isActive: boolean
  categories: TightshipCategory[]
}

interface TightshipCategory {
  id: string
  name: string
  description?: string | null
  displayOrder: number
  isActive: boolean
  products: TightshipProduct[]
}

interface TightshipProduct {
  id: string
  name: string
  description?: string | null
  basePrice: number
  images?: string[]
  isActive: boolean
  allergens?: string[]
  dietaryInfo?: string[]
  nutritionInfo?: Record<string, unknown>
}

/**
 * Transform Tightship menu to Deliveroo format
 */
export function transformMenuToDeliveroo(
  menu: TightshipMenu,
  deliverooRestaurantId: string
): Partial<DeliverooMenu> {
  // Filter active categories and products
  const activeCategories = menu.categories.filter(cat => cat.isActive)

  const deliverooCategories: DeliverooCategory[] = activeCategories.map((category, index) => {
    const activeProducts = category.products.filter(p => p.isActive)

    const items: DeliverooMenuItem[] = activeProducts.map((product, productIndex) => ({
      id: product.id,
      name: truncateString(product.name, 120),
      description: product.description ? truncateString(product.description, 500) : undefined,
      price: Number(product.basePrice),
      image_url: product.images && product.images.length > 0 ? product.images[0] : undefined,
      display_order: productIndex,
      active: product.isActive,
      dietary_info: transformDietaryInfo(product),
      // TODO: Add allergen transformation when allergen data is available
      // allergens: product.allergens,
    }))

    return {
      id: category.id,
      name: truncateString(category.name, 120),
      description: category.description ? truncateString(category.description, 255) : undefined,
      display_order: index,
      active: category.isActive,
      items,
    }
  })

  return {
    id: menu.id,
    restaurant_id: deliverooRestaurantId,
    name: truncateString(menu.name, 120),
    description: menu.description ? truncateString(menu.description, 500) : undefined,
    active: menu.isActive,
    categories: deliverooCategories,
  }
}

/**
 * Transform dietary information to Deliveroo format
 */
function transformDietaryInfo(product: TightshipProduct) {
  if (!product.dietaryInfo || product.dietaryInfo.length === 0) {
    return undefined
  }

  const dietaryInfo: Record<string, boolean> = {}

  for (const info of product.dietaryInfo) {
    const infoLower = info.toLowerCase()
    if (infoLower.includes('vegan')) {
      dietaryInfo.vegan = true
    }
    if (infoLower.includes('vegetarian')) {
      dietaryInfo.vegetarian = true
    }
    if (infoLower.includes('gluten')) {
      dietaryInfo.gluten_free = true
    }
    if (infoLower.includes('dairy')) {
      dietaryInfo.dairy_free = true
    }
    if (infoLower.includes('halal')) {
      dietaryInfo.halal = true
    }
  }

  return Object.keys(dietaryInfo).length > 0 ? dietaryInfo : undefined
}

/**
 * Truncate string to maximum length
 */
function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str
  }
  return str.substring(0, maxLength - 3) + '...'
}

/**
 * Validate menu before sending to Deliveroo
 */
export function validateDeliverooMenu(menu: Partial<DeliverooMenu>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!menu.name || menu.name.length < 3 || menu.name.length > 120) {
    errors.push('Menu name must be between 3 and 120 characters')
  }

  if (menu.description && menu.description.length > 500) {
    errors.push('Menu description must be less than 500 characters')
  }

  if (!menu.categories || menu.categories.length === 0) {
    errors.push('Menu must have at least one category')
  }

  if (menu.categories) {
    menu.categories.forEach((category, catIndex) => {
      if (!category.name || category.name.length < 3 || category.name.length > 120) {
        errors.push(`Category ${catIndex + 1}: name must be between 3 and 120 characters`)
      }

      if (category.description && category.description.length > 255) {
        errors.push(`Category ${catIndex + 1}: description must be less than 255 characters`)
      }

      if (!category.items || category.items.length === 0) {
        errors.push(`Category "${category.name}": must have at least one item (Deliveroo removes empty categories)`)
      }

      if (category.items) {
        category.items.forEach((item, itemIndex) => {
          if (!item.name || item.name.length < 2 || item.name.length > 120) {
            errors.push(`Category "${category.name}", Item ${itemIndex + 1}: name must be between 2 and 120 characters`)
          }

          if (item.description && item.description.length > 500) {
            errors.push(`Category "${category.name}", Item "${item.name}": description must be less than 500 characters`)
          }

          if (typeof item.price !== 'number' || item.price < 0) {
            errors.push(`Category "${category.name}", Item "${item.name}": price must be a positive number`)
          }
        })
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Transform item unavailability updates
 */
export function transformItemUnavailabilities(productIds: string[]): {
  unavailable_items: string[]
} {
  return {
    unavailable_items: productIds,
  }
}
