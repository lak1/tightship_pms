/**
 * Menu Sync Worker
 *
 * Processes menu synchronization jobs for all platforms
 */

import { Job } from 'bullmq'
import { db } from '@/lib/db'
import { MenuSyncJobData } from '../queues'
import { createWorker, QUEUE_NAMES } from '../config'

/**
 * Process menu sync job
 */
async function processMenuSync(job: Job<MenuSyncJobData>) {
  const { restaurantId, menuId, platformId, integrationId, syncType, languageCode } = job.data

  console.log(`[MenuSyncWorker] Processing menu sync for ${platformId}:`, {
    restaurantId,
    menuId,
    syncType,
  })

  // Update job progress
  await job.updateProgress(10)

  try {
    // Get integration
    const integration = await db.integrations.findUnique({
      where: { id: integrationId },
    })

    if (!integration || integration.status !== 'CONNECTED') {
      throw new Error(`Integration ${integrationId} not connected`)
    }

    await job.updateProgress(20)

    // Get menu with categories and products
    const menu = await db.menus.findFirst({
      where: {
        id: menuId,
        restaurantId,
        isActive: true,
      },
      include: {
        categories: {
          where: { isActive: true },
          include: {
            products: {
              where: { isActive: true },
            },
          },
        },
      },
    })

    if (!menu) {
      throw new Error(`Menu ${menuId} not found`)
    }

    await job.updateProgress(40)

    // Create sync job record in database
    const syncJob = await db.sync_jobs.create({
      data: {
        id: `${platformId}_menu_${Date.now()}_${restaurantId}`,
        integrationId,
        restaurantId,
        type: syncType,
        direction: 'PUSH',
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        progress: {
          step: 'transforming_menu',
          progress: 40,
        },
      },
    })

    await job.updateProgress(50)

    // Platform-specific sync logic
    let result: any
    switch (platformId) {
      case 'deliveroo':
        result = await syncToDeliveroo(menu, integration, languageCode)
        break
      case 'ubereats':
        result = await syncToUberEats(menu, integration, languageCode)
        break
      case 'justeat':
        result = await syncToJustEat(menu, integration, languageCode)
        break
      default:
        throw new Error(`Unsupported platform: ${platformId}`)
    }

    await job.updateProgress(90)

    // Update sync job as completed
    await db.sync_jobs.update({
      where: { id: syncJob.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        result: {
          success: true,
          ...result,
        },
      },
    })

    // Update integration last sync time
    await db.integrations.update({
      where: { id: integrationId },
      data: {
        lastSyncAt: new Date(),
      },
    })

    await job.updateProgress(100)

    console.log(`[MenuSyncWorker] Menu sync completed for ${platformId}`)

    return {
      success: true,
      syncJobId: syncJob.id,
      ...result,
    }
  } catch (error) {
    console.error(`[MenuSyncWorker] Menu sync failed for ${platformId}:`, error)

    // Update sync job as failed if it exists
    try {
      const existingSyncJob = await db.sync_jobs.findFirst({
        where: {
          integrationId,
          restaurantId,
          status: 'IN_PROGRESS',
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      if (existingSyncJob) {
        await db.sync_jobs.update({
          where: { id: existingSyncJob.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            result: {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          },
        })
      }
    } catch (updateError) {
      console.error('[MenuSyncWorker] Failed to update sync job:', updateError)
    }

    throw error
  }
}

/**
 * Sync menu to Deliveroo
 */
async function syncToDeliveroo(menu: any, integration: any, languageCode?: string) {
  // Import Deliveroo client dynamically to avoid circular dependencies
  const { createDeliverooClient } = await import('@/lib/integrations/deliveroo/client')
  const { transformMenuToDeliveroo, validateDeliverooMenu } = await import('@/lib/integrations/deliveroo/menuTransformer')

  const client = await createDeliverooClient(integration.restaurantId)
  if (!client) {
    throw new Error('Failed to create Deliveroo client')
  }

  // Transform menu
  const deliverooMenu = transformMenuToDeliveroo(menu)

  // Validate menu
  const validation = validateDeliverooMenu(deliverooMenu)
  if (!validation.valid) {
    throw new Error(`Menu validation failed: ${validation.errors.join(', ')}`)
  }

  // Get restaurant ID from settings
  const settings = integration.settings as { deliverooRestaurantId?: string }
  const restaurantId = settings.deliverooRestaurantId

  if (!restaurantId) {
    throw new Error('Deliveroo restaurant ID not configured')
  }

  // Upload menu
  const response = await client.put(`/v1/menus/${restaurantId}`, deliverooMenu)

  // Create platform mappings
  for (const category of deliverooMenu.categories) {
    for (const item of category.items) {
      await db.platform_mappings.upsert({
        where: {
          productId_platformId: {
            productId: item.external_data || item.id,
            platformId: 'deliveroo',
          },
        },
        create: {
          id: `mapping_${item.external_data}_deliveroo_${Date.now()}`,
          productId: item.external_data || item.id,
          platformId: 'deliveroo',
          externalId: item.id,
          externalData: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        update: {
          externalId: item.id,
          updatedAt: new Date(),
        },
      })
    }
  }

  return {
    categoriesUploaded: deliverooMenu.categories.length,
    itemsUploaded: deliverooMenu.categories.reduce((sum, cat) => sum + cat.items.length, 0),
    response,
  }
}

/**
 * Sync menu to Uber Eats
 */
async function syncToUberEats(menu: any, integration: any, languageCode?: string) {
  // Import Uber Eats client dynamically
  const { createUberEatsClient } = await import('@/lib/integrations/ubereats/client')
  const { transformMenuToUberEats, validateUberEatsMenu } = await import('@/lib/integrations/ubereats/menuTransformer')

  const client = await createUberEatsClient(integration.restaurantId)
  if (!client) {
    throw new Error('Failed to create Uber Eats client')
  }

  // Transform menu
  const uberEatsMenu = transformMenuToUberEats(menu, languageCode || 'en')

  // Validate menu
  const validation = validateUberEatsMenu(uberEatsMenu)
  if (!validation.valid) {
    throw new Error(`Menu validation failed: ${validation.errors.join(', ')}`)
  }

  // Get store ID from settings
  const settings = integration.settings as { uberEatsStoreId?: string }
  const storeId = settings.uberEatsStoreId

  if (!storeId) {
    throw new Error('Uber Eats store ID not configured')
  }

  // Upload menu
  const response = await client.put(`/v2/eats/stores/${storeId}/menus`, uberEatsMenu)

  // Create platform mappings
  const totalItems = uberEatsMenu.menus.reduce((sum, menuSection) => {
    return sum + menuSection.categories.reduce((catSum, cat) => {
      cat.entities.forEach(async (itemId) => {
        // Find the item in allItems (note: this is simplified, you'd need to track items properly)
        await db.platform_mappings.upsert({
          where: {
            productId_platformId: {
              productId: itemId,
              platformId: 'ubereats',
            },
          },
          create: {
            id: `mapping_${itemId}_ubereats_${Date.now()}`,
            productId: itemId,
            platformId: 'ubereats',
            externalId: itemId,
            externalData: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          update: {
            externalId: itemId,
            updatedAt: new Date(),
          },
        })
      })
      return catSum + cat.entities.length
    }, 0)
  }, 0)

  return {
    categoriesUploaded: uberEatsMenu.menus[0]?.categories.length || 0,
    itemsUploaded: totalItems,
    response,
  }
}

/**
 * Sync menu to Just Eat (placeholder for future implementation)
 */
async function syncToJustEat(menu: any, integration: any, languageCode?: string) {
  throw new Error('Just Eat integration not yet implemented')
}

/**
 * Create and start the menu sync worker
 */
export function startMenuSyncWorker() {
  const worker = createWorker<MenuSyncJobData>(
    QUEUE_NAMES.MENU_SYNC,
    processMenuSync,
    {
      concurrency: 3, // Process up to 3 menu syncs concurrently
    }
  )

  worker.on('completed', (job) => {
    console.log(`[MenuSyncWorker] Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[MenuSyncWorker] Job ${job?.id} failed:`, err)
  })

  worker.on('error', (err) => {
    console.error('[MenuSyncWorker] Worker error:', err)
  })

  console.log('[MenuSyncWorker] Worker started')

  return worker
}
