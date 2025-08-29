import { db } from '@/lib/db'
import { 
  type google_integrations,
  type restaurants,
  type menus,
  type categories,
  type products,
  type tax_rates,
  GoogleSyncStatus,
  GoogleSyncType,
  SyncStatus,
  SyncTriggerType
} from '@prisma/client'

// Google Menu structure types
interface GoogleMenuItem {
  labels: {
    displayName: string
    description?: string
    language?: string
  }[]
  price?: {
    currencyCode: string
    units: string
    nanos?: number
  }
  dietaryRestrictions?: string[]
  allergens?: string[]
  spiciness?: 'SPICE_UNSPECIFIED' | 'MILD' | 'MODERATE' | 'HOT'
  portionSize?: {
    quantity: number
    unit: string
  }
}

interface GoogleMenuSection {
  labels: {
    displayName: string
    description?: string
  }[]
  items: GoogleMenuItem[]
}

interface GoogleFoodMenu {
  menus: {
    cuisines?: string[]
    sections: GoogleMenuSection[]
  }[]
}

// Utility class for syncing menus to Google Business Profile
export class GoogleMenuSync {
  private integration: google_integrations
  private accessToken: string
  
  constructor(integration: google_integrations) {
    this.integration = integration
    this.accessToken = integration.accessToken
  }

  /**
   * Main sync method - orchestrates the entire sync process
   */
  async syncMenu(): Promise<{ success: boolean; message: string; details?: any }> {
    let syncHistoryId: string | null = null
    
    try {
      // Start sync history record
      syncHistoryId = await this.startSyncHistory()
      
      // Update integration status
      await db.google_integrations.update({
        where: { id: this.integration.id },
        data: { 
          syncStatus: GoogleSyncStatus.SYNCING,
          errorMessage: null,
          updatedAt: new Date()
        }
      })
      
      // Get restaurant with full menu data
      const restaurant = await this.getRestaurantWithFullMenu()
      if (!restaurant) {
        throw new Error('Restaurant not found')
      }
      
      // Transform to Google format
      const googleMenu = await this.transformToGoogleFormat(restaurant)
      
      // Send to Google API
      const apiResponse = await this.updateGoogleMenu(googleMenu)
      
      // Update sync history with success
      await this.completeSyncHistory(syncHistoryId, true, {
        itemsSynced: this.countMenuItems(googleMenu),
        apiResponse
      })
      
      // Update integration status
      await db.google_integrations.update({
        where: { id: this.integration.id },
        data: {
          syncStatus: GoogleSyncStatus.SUCCESS,
          lastSyncAt: new Date(),
          errorMessage: null,
          updatedAt: new Date()
        }
      })
      
      return { 
        success: true, 
        message: 'Menu synced successfully',
        details: { itemsSynced: this.countMenuItems(googleMenu) }
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Update sync history with failure
      if (syncHistoryId) {
        await this.completeSyncHistory(syncHistoryId, false, { error: errorMessage })
      }
      
      // Update integration status
      await db.google_integrations.update({
        where: { id: this.integration.id },
        data: {
          syncStatus: GoogleSyncStatus.ERROR,
          errorMessage: errorMessage,
          updatedAt: new Date()
        }
      })
      
      return { 
        success: false, 
        message: `Sync failed: ${errorMessage}`,
        details: { error: errorMessage }
      }
    }
  }

  /**
   * Get restaurant with all menu data
   */
  private async getRestaurantWithFullMenu() {
    return db.restaurants.findUnique({
      where: { id: this.integration.restaurantId },
      include: {
        menus: {
          where: { isActive: true },
          include: {
            categories: {
              where: { isActive: true },
              orderBy: { displayOrder: 'asc' },
              include: {
                products: {
                  where: { isActive: true },
                  orderBy: { name: 'asc' },
                  include: {
                    tax_rates: true,
                    google_menu_mappings: {
                      where: { 
                        integrationId: this.integration.id,
                        includeInSync: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
  }

  /**
   * Transform TightShip menu structure to Google format
   */
  private async transformToGoogleFormat(restaurant: any): Promise<GoogleFoodMenu> {
    const sections: GoogleMenuSection[] = []
    
    // Process each menu and category
    for (const menu of restaurant.menus) {
      for (const category of menu.categories) {
        const items: GoogleMenuItem[] = []
        
        for (const product of category.products) {
          // Skip if explicitly excluded via mapping
          const mapping = product.google_menu_mappings?.[0]
          if (mapping && !mapping.includeInSync) {
            continue
          }
          
          // Calculate display price with tax
          const basePrice = parseFloat(product.basePrice.toString())
          const taxRate = product.tax_rates?.rate ? parseFloat(product.tax_rates.rate.toString()) : 0
          const displayPrice = basePrice * (1 + taxRate)
          
          // Build menu item
          const menuItem: GoogleMenuItem = {
            labels: [{
              displayName: mapping?.customName || product.name,
              description: mapping?.customDescription || product.description || undefined,
              language: 'en'
            }],
            price: {
              currencyCode: 'GBP',
              units: Math.floor(displayPrice).toString(),
              nanos: Math.round((displayPrice % 1) * 1000000000)
            }
          }
          
          // Add allergens if present
          if (product.allergens && product.allergens.length > 0) {
            menuItem.allergens = this.mapAllergens(product.allergens)
          }
          
          // Add dietary restrictions if present
          if (product.dietaryInfo && product.dietaryInfo.length > 0) {
            menuItem.dietaryRestrictions = this.mapDietaryRestrictions(product.dietaryInfo)
          }
          
          items.push(menuItem)
        }
        
        // Only add section if it has items
        if (items.length > 0) {
          sections.push({
            labels: [{
              displayName: category.name,
              description: category.description || undefined
            }],
            items
          })
        }
      }
    }
    
    return {
      menus: [{
        cuisines: this.detectCuisineTypes(restaurant, sections),
        sections
      }]
    }
  }

  /**
   * Send menu update to Google My Business API
   */
  private async updateGoogleMenu(menuData: GoogleFoodMenu): Promise<any> {
    const endpoint = `https://mybusinessbusinessinformation.googleapis.com/v1/${this.integration.googleLocationId}/foodMenus`
    
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(menuData)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      
      // Check for token expiration
      if (response.status === 401) {
        throw new Error('Token expired - re-authentication required')
      }
      
      throw new Error(`Google API error (${response.status}): ${errorText}`)
    }
    
    return response.json()
  }

  /**
   * Map TightShip allergens to Google format
   */
  private mapAllergens(allergens: string[]): string[] {
    const allergenMap: Record<string, string> = {
      'Gluten': 'ALLERGEN_GLUTEN',
      'Dairy': 'ALLERGEN_DAIRY',
      'Eggs': 'ALLERGEN_EGGS',
      'Fish': 'ALLERGEN_FISH',
      'Shellfish': 'ALLERGEN_SHELLFISH',
      'Tree nuts': 'ALLERGEN_TREE_NUTS',
      'Peanuts': 'ALLERGEN_PEANUTS',
      'Soy': 'ALLERGEN_SOY',
      'Sesame': 'ALLERGEN_SESAME',
      'Sulphites': 'ALLERGEN_SULFITES',
      'Celery': 'ALLERGEN_CELERY',
      'Mustard': 'ALLERGEN_MUSTARD',
      'Lupin': 'ALLERGEN_LUPINE'
    }
    
    return allergens
      .map(a => allergenMap[a] || `ALLERGEN_${a.toUpperCase().replace(/\s+/g, '_')}`)
      .filter(Boolean)
  }

  /**
   * Map TightShip dietary info to Google format
   */
  private mapDietaryRestrictions(dietaryInfo: string[]): string[] {
    const dietaryMap: Record<string, string> = {
      'Vegetarian': 'DIETARY_VEGETARIAN',
      'Vegan': 'DIETARY_VEGAN',
      'Gluten-free': 'DIETARY_GLUTEN_FREE',
      'Dairy-free': 'DIETARY_DAIRY_FREE',
      'Low-carb': 'DIETARY_LOW_CARB',
      'Keto': 'DIETARY_KETO',
      'Halal': 'DIETARY_HALAL',
      'Kosher': 'DIETARY_KOSHER',
      'Organic': 'DIETARY_ORGANIC'
    }
    
    return dietaryInfo
      .map(d => dietaryMap[d] || `DIETARY_${d.toUpperCase().replace(/\s+/g, '_')}`)
      .filter(Boolean)
  }

  /**
   * Detect cuisine types based on restaurant name and menu items
   */
  private detectCuisineTypes(restaurant: any, sections: GoogleMenuSection[]): string[] {
    const cuisines: string[] = []
    const name = restaurant.name.toLowerCase()
    
    // Auto-detect based on restaurant name or menu items
    if (name.includes('fish') || name.includes('chips')) {
      cuisines.push('CUISINE_BRITISH', 'CUISINE_SEAFOOD')
    }
    if (name.includes('pizza') || name.includes('italian')) {
      cuisines.push('CUISINE_ITALIAN')
    }
    if (name.includes('chinese')) {
      cuisines.push('CUISINE_CHINESE')
    }
    if (name.includes('indian')) {
      cuisines.push('CUISINE_INDIAN')
    }
    if (name.includes('thai')) {
      cuisines.push('CUISINE_THAI')
    }
    if (name.includes('mexican')) {
      cuisines.push('CUISINE_MEXICAN')
    }
    
    // Check menu sections for cuisine hints
    const sectionNames = sections.map(s => s.labels[0].displayName.toLowerCase()).join(' ')
    if (sectionNames.includes('curry')) {
      cuisines.push('CUISINE_INDIAN')
    }
    if (sectionNames.includes('sushi') || sectionNames.includes('ramen')) {
      cuisines.push('CUISINE_JAPANESE')
    }
    if (sectionNames.includes('burger')) {
      cuisines.push('CUISINE_AMERICAN')
    }
    
    // Default to generic if nothing detected
    if (cuisines.length === 0) {
      cuisines.push('CUISINE_INTERNATIONAL')
    }
    
    // Remove duplicates
    return [...new Set(cuisines)]
  }

  /**
   * Count total menu items
   */
  private countMenuItems(menu: GoogleFoodMenu): number {
    return menu.menus.reduce((total, m) => 
      total + m.sections.reduce((sectionTotal, s) => 
        sectionTotal + s.items.length, 0
      ), 0
    )
  }

  /**
   * Start a sync history record
   */
  private async startSyncHistory(): Promise<string> {
    const history = await db.google_sync_history.create({
      data: {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        integrationId: this.integration.id,
        syncType: GoogleSyncType.MENU,
        status: SyncStatus.IN_PROGRESS,
        triggerType: SyncTriggerType.MANUAL,
        startedAt: new Date()
      }
    })
    
    return history.id
  }

  /**
   * Complete a sync history record
   */
  private async completeSyncHistory(
    historyId: string, 
    success: boolean, 
    details: any
  ): Promise<void> {
    await db.google_sync_history.update({
      where: { id: historyId },
      data: {
        status: success ? SyncStatus.COMPLETED : SyncStatus.FAILED,
        completedAt: new Date(),
        itemsSynced: details.itemsSynced || 0,
        errorDetails: details.error || null,
        apiResponse: details.apiResponse || null,
        changesDetected: details.changes || null
      }
    })
  }
}

/**
 * Queue a menu sync job (for background processing)
 */
export async function queueGoogleMenuSync(
  integrationId: string,
  triggerType: SyncTriggerType = SyncTriggerType.MANUAL
): Promise<void> {
  // In production, this would queue a background job
  // For now, we'll just update the status
  await db.google_integrations.update({
    where: { id: integrationId },
    data: {
      syncStatus: GoogleSyncStatus.PENDING,
      updatedAt: new Date()
    }
  })
  
  // TODO: Implement actual job queue (Bull, BullMQ, etc.)
  console.log(`Menu sync queued for integration ${integrationId} (trigger: ${triggerType})`)
}