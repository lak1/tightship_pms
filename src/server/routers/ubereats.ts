import { z } from 'zod'
import { createTRPCRouter, organizationProcedure } from '../trpc'
import { createUberEatsClient } from '@/lib/integrations/ubereats/client'
import { transformMenuToUberEats, validateUberEatsMenu, createItemSuspension } from '@/lib/integrations/ubereats/menuTransformer'
import { TRPCError } from '@trpc/server'

/**
 * Uber Eats Integration Router
 * Handles menu sync, item updates, and store management
 *
 * Documentation: https://developer.uber.com/docs/eats
 */
export const uberEatsRouter = createTRPCRouter({
  /**
   * Upload/Update menu to Uber Eats
   */
  upsertMenu: organizationProcedure
    .input(z.object({
      restaurantId: z.string(),
      menuId: z.string(),
      languageCode: z.string().default('en'),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Verify restaurant and menu
      const menu = await ctx.db.menus.findFirst({
        where: {
          id: input.menuId,
          restaurantId: input.restaurantId,
          restaurants: {
            organizationId,
            isActive: true,
          },
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
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Menu not found or access denied',
        })
      }

      // Get Uber Eats integration
      const integration = await ctx.db.integrations.findUnique({
        where: {
          restaurantId_platformId: {
            restaurantId: input.restaurantId,
            platformId: 'ubereats',
          },
        },
      })

      if (!integration || integration.status !== 'CONNECTED') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Uber Eats integration not connected',
        })
      }

      // Get Uber Eats store ID from integration settings
      const settings = integration.settings as { uberEatsStoreId?: string }
      const storeId = settings.uberEatsStoreId

      if (!storeId) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Uber Eats store ID not configured',
        })
      }

      // Create sync job
      const syncJob = await ctx.db.sync_jobs.create({
        data: {
          id: `ubereats_menu_${Date.now()}_${input.restaurantId}`,
          integrationId: integration.id,
          restaurantId: input.restaurantId,
          type: 'FULL',
          direction: 'PUSH',
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          progress: {
            step: 'transforming_menu',
          },
        },
      })

      try {
        // Transform menu to Uber Eats format
        const uberEatsMenu = transformMenuToUberEats(menu, input.languageCode)

        // Validate menu
        const validation = validateUberEatsMenu(uberEatsMenu)
        if (!validation.valid) {
          throw new Error(`Menu validation failed: ${validation.errors.join(', ')}`)
        }

        // Update progress
        await ctx.db.sync_jobs.update({
          where: { id: syncJob.id },
          data: {
            progress: {
              step: 'uploading_to_ubereats',
            },
          },
        })

        // Create Uber Eats client
        const client = await createUberEatsClient(input.restaurantId)
        if (!client) {
          throw new Error('Failed to create Uber Eats client')
        }

        // Upload menu to Uber Eats
        const response = await client.put(`/v2/eats/stores/${storeId}/menus`, uberEatsMenu)

        // Count items
        const totalItems = uberEatsMenu.menus.reduce((sum, menuSection) => {
          return sum + menuSection.categories.reduce((catSum, cat) => catSum + cat.entities.length, 0)
        }, 0)

        // Complete sync job
        await ctx.db.sync_jobs.update({
          where: { id: syncJob.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            result: {
              success: true,
              categoriesUploaded: uberEatsMenu.menus[0]?.categories.length || 0,
              itemsUploaded: totalItems,
              response,
            },
          },
        })

        // Update integration last sync time
        await ctx.db.integrations.update({
          where: { id: integration.id },
          data: {
            lastSyncAt: new Date(),
          },
        })

        return {
          success: true,
          jobId: syncJob.id,
          categoriesUploaded: uberEatsMenu.menus[0]?.categories.length || 0,
          itemsUploaded: totalItems,
          message: 'Menu uploaded successfully to Uber Eats',
        }
      } catch (error) {
        // Mark sync job as failed
        await ctx.db.sync_jobs.update({
          where: { id: syncJob.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            result: {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          },
        })

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to upload menu: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),

  /**
   * Update item availability (suspend/unsuspend)
   */
  updateItemAvailability: organizationProcedure
    .input(z.object({
      restaurantId: z.string(),
      productIds: z.array(z.string()),
      suspended: z.boolean(),
      reason: z.string().optional(),
      suspendUntil: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Verify restaurant
      const restaurant = await ctx.db.restaurants.findFirst({
        where: {
          id: input.restaurantId,
          organizationId,
          isActive: true,
        },
      })

      if (!restaurant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Restaurant not found or access denied',
        })
      }

      // Get integration
      const integration = await ctx.db.integrations.findUnique({
        where: {
          restaurantId_platformId: {
            restaurantId: input.restaurantId,
            platformId: 'ubereats',
          },
        },
      })

      if (!integration || integration.status !== 'CONNECTED') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Uber Eats integration not connected',
        })
      }

      const settings = integration.settings as { uberEatsStoreId?: string }
      const storeId = settings.uberEatsStoreId

      if (!storeId) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Uber Eats store ID not configured',
        })
      }

      try {
        // Create Uber Eats client
        const client = await createUberEatsClient(input.restaurantId)
        if (!client) {
          throw new Error('Failed to create Uber Eats client')
        }

        // Get Uber Eats item IDs from platform mappings
        const mappings = await ctx.db.platform_mappings.findMany({
          where: {
            productId: { in: input.productIds },
            platformId: 'ubereats',
          },
        })

        if (mappings.length === 0) {
          throw new Error('No Uber Eats mappings found for the specified products')
        }

        // Update each item's availability
        const updatePromises = mappings.map(async (mapping) => {
          const itemUpdate = createItemSuspension(
            mapping.externalId,
            input.suspended,
            input.reason,
            input.suspendUntil
          )

          return client.post(
            `/v2/eats/stores/${storeId}/menus/items/${mapping.externalId}`,
            itemUpdate
          )
        })

        await Promise.all(updatePromises)

        return {
          success: true,
          itemsUpdated: mappings.length,
          action: input.suspended ? 'suspended' : 'unsuspended',
          message: `Successfully ${input.suspended ? 'suspended' : 'unsuspended'} ${mappings.length} items`,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),

  /**
   * Get sync history
   */
  getSyncHistory: organizationProcedure
    .input(z.object({
      restaurantId: z.string(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Verify restaurant
      const restaurant = await ctx.db.restaurants.findFirst({
        where: {
          id: input.restaurantId,
          organizationId,
          isActive: true,
        },
      })

      if (!restaurant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Restaurant not found or access denied',
        })
      }

      // Get Uber Eats integration
      const integration = await ctx.db.integrations.findUnique({
        where: {
          restaurantId_platformId: {
            restaurantId: input.restaurantId,
            platformId: 'ubereats',
          },
        },
      })

      if (!integration) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Uber Eats integration not found',
        })
      }

      // Get sync jobs
      const syncJobs = await ctx.db.sync_jobs.findMany({
        where: {
          integrationId: integration.id,
          restaurantId: input.restaurantId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: input.limit,
      })

      return syncJobs.map(job => ({
        id: job.id,
        type: job.type,
        direction: job.direction,
        status: job.status,
        progress: job.progress,
        result: job.result,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
        duration: job.startedAt && job.completedAt
          ? Math.round((job.completedAt.getTime() - job.startedAt.getTime()) / 1000)
          : null,
      }))
    }),

  /**
   * Test connection to Uber Eats
   */
  testConnection: organizationProcedure
    .input(z.object({
      restaurantId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Verify restaurant
      const restaurant = await ctx.db.restaurants.findFirst({
        where: {
          id: input.restaurantId,
          organizationId,
          isActive: true,
        },
      })

      if (!restaurant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Restaurant not found or access denied',
        })
      }

      try {
        // Create Uber Eats client (this will test token generation)
        const client = await createUberEatsClient(input.restaurantId)
        if (!client) {
          throw new Error('Failed to create Uber Eats client - check credentials')
        }

        const integration = await ctx.db.integrations.findUnique({
          where: {
            restaurantId_platformId: {
              restaurantId: input.restaurantId,
              platformId: 'ubereats',
            },
          },
        })

        const settings = integration?.settings as { uberEatsStoreId?: string }
        const storeId = settings?.uberEatsStoreId

        if (storeId) {
          // Try to fetch store details to verify connection
          const store = await client.get(`/v2/eats/stores/${storeId}`)
          return {
            success: true,
            message: 'Successfully connected to Uber Eats API',
            storeInfo: store,
          }
        }

        return {
          success: true,
          message: 'Successfully generated access token',
          note: 'Store ID not configured - cannot verify store access',
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),

  /**
   * Update store status (online/offline/paused)
   */
  updateStoreStatus: organizationProcedure
    .input(z.object({
      restaurantId: z.string(),
      status: z.enum(['online', 'offline', 'paused']),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Verify restaurant
      const restaurant = await ctx.db.restaurants.findFirst({
        where: {
          id: input.restaurantId,
          organizationId,
          isActive: true,
        },
      })

      if (!restaurant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Restaurant not found or access denied',
        })
      }

      // Get integration
      const integration = await ctx.db.integrations.findUnique({
        where: {
          restaurantId_platformId: {
            restaurantId: input.restaurantId,
            platformId: 'ubereats',
          },
        },
      })

      if (!integration || integration.status !== 'CONNECTED') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Uber Eats integration not connected',
        })
      }

      const settings = integration.settings as { uberEatsStoreId?: string }
      const storeId = settings.uberEatsStoreId

      if (!storeId) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Uber Eats store ID not configured',
        })
      }

      try {
        // Create Uber Eats client
        const client = await createUberEatsClient(input.restaurantId)
        if (!client) {
          throw new Error('Failed to create Uber Eats client')
        }

        // Update store status
        await client.patch(`/v2/eats/stores/${storeId}/status`, {
          status: input.status,
        })

        return {
          success: true,
          status: input.status,
          message: `Store status updated to ${input.status}`,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update store status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),
})
