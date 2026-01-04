/**
 * Uber Eats Menu Transformer
 * Converts Tightship menu structure to Uber Eats API format
 *
 * Documentation: https://developer.uber.com/docs/eats/guides/menu-management
 * Structure: menus → categories → items → modifier_groups → modifier_options
 */

import type {
  UberEatsMenu,
  UberEatsMenuSection,
  UberEatsCategory,
  UberEatsItem,
  UberEatsModifierGroup,
  UberEatsModifierOption
} from './types'

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
 * Transform Tightship menu to Uber Eats format
 */
export function transformMenuToUberEats(
  menu: TightshipMenu,
  languageCode: string = 'en'
): UberEatsMenu {
  const activeCategories = menu.categories.filter(cat => cat.isActive)

  // Transform items first (we'll reference them in categories)
  const allItems: UberEatsItem[] = []
  const allModifierGroups: UberEatsModifierGroup[] = []
  const allModifierOptions: UberEatsModifierOption[] = []

  const categories: UberEatsCategory[] = activeCategories.map((category) => {
    const activeProducts = category.products.filter(p => p.isActive)
    const itemIds: string[] = []

    activeProducts.forEach((product) => {
      const item = transformProductToItem(product, languageCode)
      allItems.push(item)
      itemIds.push(item.id)
    })

    return {
      id: category.id,
      title: {
        translations: {
          [languageCode]: category.name,
        },
      },
      subtitle: category.description ? {
        translations: {
          [languageCode]: category.description,
        },
      } : undefined,
      entities: itemIds,
    }
  })

  const menuSection: UberEatsMenuSection = {
    id: menu.id,
    title: {
      translations: {
        [languageCode]: menu.name,
      },
    },
    subtitle: menu.description ? {
      translations: {
        [languageCode]: menu.description,
      },
    } : undefined,
    categories,
  }

  return {
    menus: [menuSection],
  }
}

/**
 * Transform a single product to Uber Eats item format
 */
function transformProductToItem(
  product: TightshipProduct,
  languageCode: string
): UberEatsItem {
  // Convert price from decimal to cents
  const priceInCents = Math.round(Number(product.basePrice) * 100)

  const item: UberEatsItem = {
    id: product.id,
    external_data: product.id, // Store our ID for reference
    title: {
      translations: {
        [languageCode]: product.name,
      },
    },
    description: product.description ? {
      translations: {
        [languageCode]: product.description,
      },
    } : undefined,
    image_url: product.images && product.images.length > 0 ? product.images[0] : undefined,
    price_info: {
      price: priceInCents,
    },
    quantity_info: {
      quantity: {
        min_permitted: 0,
        max_permitted: 100,
        default_quantity: 1,
      },
    },
  }

  // Add dietary classifications if available
  if (product.dietaryInfo && product.dietaryInfo.length > 0) {
    const dietaryLabels: string[] = []

    for (const info of product.dietaryInfo) {
      const infoLower = info.toLowerCase()
      if (infoLower.includes('vegan')) dietaryLabels.push('VEGAN')
      if (infoLower.includes('vegetarian')) dietaryLabels.push('VEGETARIAN')
      if (infoLower.includes('gluten')) dietaryLabels.push('GLUTEN_FREE')
      if (infoLower.includes('halal')) dietaryLabels.push('HALAL')
    }

    if (dietaryLabels.length > 0) {
      item.dish_info = {
        classifications: {
          dietary_labels: dietaryLabels,
        },
      }
    }
  }

  // Add nutritional info if available
  if (product.nutritionInfo) {
    const calories = product.nutritionInfo.calories as number | undefined
    if (calories) {
      item.nutritional_info = {
        calories: {
          display_value: `${calories} cal`,
          energy_value: calories,
        },
      }
    }
  }

  return item
}

/**
 * Create an item suspension (for out of stock)
 */
export function createItemSuspension(
  itemId: string,
  suspended: boolean,
  reason?: string,
  suspendUntil?: Date
): Partial<UberEatsItem> {
  if (!suspended) {
    return {
      id: itemId,
      suspension_info: {
        suspension: {},
      },
    }
  }

  return {
    id: itemId,
    suspension_info: {
      suspension: {
        suspend_until: suspendUntil ? Math.floor(suspendUntil.getTime() / 1000) : undefined,
        reason: reason || 'OUT_OF_STOCK',
      },
    },
  }
}

/**
 * Validate menu before sending to Uber Eats
 */
export function validateUberEatsMenu(menu: UberEatsMenu): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!menu.menus || menu.menus.length === 0) {
    errors.push('Menu must have at least one menu section')
    return { valid: false, errors }
  }

  menu.menus.forEach((menuSection, menuIndex) => {
    if (!menuSection.title || !menuSection.title.translations || Object.keys(menuSection.title.translations).length === 0) {
      errors.push(`Menu section ${menuIndex + 1}: title translations are required`)
    }

    if (!menuSection.categories || menuSection.categories.length === 0) {
      errors.push(`Menu section "${menuSection.id}": must have at least one category`)
    }

    menuSection.categories?.forEach((category, catIndex) => {
      if (!category.title || !category.title.translations || Object.keys(category.title.translations).length === 0) {
        errors.push(`Category ${catIndex + 1}: title translations are required`)
      }

      if (!category.entities || category.entities.length === 0) {
        errors.push(`Category "${category.id}": must have at least one item`)
      }
    })
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Build a menu update request for a specific item
 * Used for individual item updates (price changes, availability, etc.)
 */
export function buildItemUpdateRequest(
  itemId: string,
  updates: Partial<UberEatsItem>
): Partial<UberEatsItem> {
  return {
    id: itemId,
    ...updates,
  }
}
