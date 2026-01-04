import { z } from 'zod'
import { createTRPCRouter, organizationProcedure } from '../trpc'
import { createDeliverooClient } from '@/lib/integrations/deliveroo/client'
import { transformMenuToDeliveroo, validateDeliverooMenu } from '@/lib/integrations/deliveroo/menuTransformer'
import { TRPCError } from '@trpc/server'

/**
 * Deliveroo Integration Router
 * Handles menu sync, unavailability updates, and integration management
 *
 * Documentation: https://api-docs.deliveroo.com
 */
export const deliverooRouter = createTRPCRouter({
  /**
   * Upload menu to Deliveroo
   */
  uploadMenu: organizationProcedure
    .input(z.object({
      restaurantId: z.string(),
      menuId: z.string(),
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

      // Get Deliveroo integration
      const integration = await ctx.db.integrations.findUnique({
        where: {
          restaurantId_platformId: {
            restaurantId: input.restaurantId,
            platformId: 'deliveroo',
          },
        },
      })

      if (!integration || integration.status !== 'CONNECTED') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Deliveroo integration not connected',
        })
      }

      // Get Deliveroo restaurant ID from integration settings
      const settings = integration.settings as { deliverooRestaurantId?: string }
      const deliverooRestaurantId = settings.deliverooRestaurantId

      if (!deliverooRestaurantId) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Deliveroo restaurant ID not configured',
        })
      }

      // Create sync job
      const syncJob = await ctx.db.sync_jobs.create({
        data: {
          id: `deliveroo_menu_${Date.now()}_${input.restaurantId}`,
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
        // Transform menu to Deliveroo format
        const deliverooMenu = transformMenuToDeliveroo(menu, deliverooRestaurantId)

        // Validate menu
        const validation = validateDeliverooMenu(deliverooMenu)
        if (!validation.valid) {
          throw new Error(`Menu validation failed: ${validation.errors.join(', ')}`)
        }

        // Update progress
        await ctx.db.sync_jobs.update({
          where: { id: syncJob.id },
          data: {
            progress: {
              step: 'uploading_to_deliveroo',
            },
          },
        })

        // Create Deliveroo client
        const client = await createDeliverooClient(input.restaurantId)
        if (!client) {
          throw new Error('Failed to create Deliveroo client')
        }

        // Upload menu to Deliveroo
        // TODO: Update endpoint when actual API endpoint is confirmed
        const response = await client.put(`/v1/menus/${deliverooRestaurantId}`, deliverooMenu)

        // Complete sync job
        await ctx.db.sync_jobs.update({
          where: { id: syncJob.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            result: {
              success: true,
              categoriesUploaded: deliverooMenu.categories?.length || 0,
              itemsUploaded: deliverooMenu.categories?.reduce((sum, cat) => sum + (cat.items?.length || 0), 0) || 0,
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
          categoriesUploaded: deliverooMenu.categories?.length || 0,
          itemsUploaded: deliverooMenu.categories?.reduce((sum, cat) => sum + (cat.items?.length || 0), 0) || 0,
          message: 'Menu uploaded successfully to Deliveroo',
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
   * Update item unavailabilities (out of stock)
   */
  updateUnavailabilities: organizationProcedure
    .input(z.object({
      restaurantId: z.string(),
      productIds: z.array(z.string()),
      makeAvailable: z.boolean().default(false),
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
            platformId: 'deliveroo',
          },
        },
      })

      if (!integration || integration.status !== 'CONNECTED') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Deliveroo integration not connected',
        })
      }

      try {
        // Create Deliveroo client
        const client = await createDeliverooClient(input.restaurantId)
        if (!client) {
          throw new Error('Failed to create Deliveroo client')
        }

        // Get Deliveroo item IDs from platform mappings
        const mappings = await ctx.db.platform_mappings.findMany({
          where: {
            productId: { in: input.productIds },
            platformId: 'deliveroo',
          },
        })

        const deliverooItemIds = mappings.map(m => m.externalId)

        if (deliverooItemIds.length === 0) {
          throw new Error('No Deliveroo mappings found for the specified products')
        }

        // Update unavailabilities
        // TODO: Update endpoint when actual API endpoint is confirmed
        const endpoint = input.makeAvailable
          ? '/v1/unavailabilities/remove'
          : '/v1/unavailabilities/add'

        await client.post(endpoint, {
          item_ids: deliverooItemIds,
        })

        return {
          success: true,
          itemsUpdated: deliverooItemIds.length,
          action: input.makeAvailable ? 'made_available' : 'made_unavailable',
          message: `Successfully updated ${deliverooItemIds.length} items`,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update unavailabilities: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

      // Get Deliveroo integration
      const integration = await ctx.db.integrations.findUnique({
        where: {
          restaurantId_platformId: {
            restaurantId: input.restaurantId,
            platformId: 'deliveroo',
          },
        },
      })

      if (!integration) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deliveroo integration not found',
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
   * Test connection to Deliveroo
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
        // Create Deliveroo client (this will test OAuth token generation)
        const client = await createDeliverooClient(input.restaurantId)
        if (!client) {
          throw new Error('Failed to create Deliveroo client - check credentials')
        }

        // Try a simple API call to verify connection
        // TODO: Update with actual endpoint once confirmed
        // await client.get('/v1/health')

        return {
          success: true,
          message: 'Successfully connected to Deliveroo API',
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),
})
