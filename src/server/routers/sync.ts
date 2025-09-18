import { z } from 'zod'
import { createTRPCRouter, organizationProcedure } from '../trpc'

export const syncRouter = createTRPCRouter({
  getPlatformStatus: organizationProcedure
    .input(z.object({
      restaurantId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Get all platforms
      const platforms = await ctx.db.platforms.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          name: 'asc',
        },
      })

      // Get integrations for this organization (optionally filtered by restaurant)
      const integrations = await ctx.db.integrations.findMany({
        where: {
          restaurants: {
            organizationId,
            ...(input.restaurantId ? { id: input.restaurantId } : {}),
            isActive: true,
          },
        },
        include: {
          platforms: true,
          restaurants: true,
        },
      })

      // Map platforms with their integration status
      const platformsWithStatus = platforms.map(platform => {
        const integration = integrations.find(int => int.platformId === platform.id)

        return {
          id: platform.id,
          name: platform.name,
          type: platform.type,
          status: integration?.status || 'DISCONNECTED',
          lastSync: integration?.lastSyncAt,
          lastError: integration?.lastError,
          restaurantName: integration?.restaurants.name,
          restaurantId: integration?.restaurantId,
        }
      })

      return platformsWithStatus
    }),

  getPricePushHistory: organizationProcedure
    .input(z.object({
      restaurantId: z.string().optional(),
      productId: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Get price push jobs (sync jobs triggered by price changes)
      const pricePushJobs = await ctx.db.sync_jobs.findMany({
        where: {
          restaurants: {
            organizationId,
            ...(input.restaurantId ? { id: input.restaurantId } : {}),
            isActive: true,
          },
          type: 'PRICE_UPDATE', // Only price update jobs
        },
        include: {
          integrations: {
            include: {
              platforms: true,
            },
          },
          restaurants: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: input.limit,
      })

      return pricePushJobs.map(job => ({
        id: job.id,
        platform: job.integrations.platforms.name,
        platformId: job.integrations.platformId,
        restaurant: job.restaurants.name,
        restaurantId: job.restaurantId,
        productName: (job.result as any)?.productName || 'Unknown Product',
        productId: (job.result as any)?.productId,
        oldPrice: (job.result as any)?.oldPrice,
        newPrice: (job.result as any)?.newPrice,
        status: job.status,
        error: job.error,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
        duration: job.startedAt && job.completedAt
          ? Math.round((job.completedAt.getTime() - job.startedAt.getTime()) / 1000 * 100) / 100
          : null,
      }))
    }),

  getPricePushStats: organizationProcedure
    .input(z.object({
      restaurantId: z.string().optional(),
      days: z.number().min(1).max(365).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - input.days)

      // Get price update jobs in the specified time range
      const pricePushJobs = await ctx.db.sync_jobs.findMany({
        where: {
          restaurants: {
            organizationId,
            ...(input.restaurantId ? { id: input.restaurantId } : {}),
            isActive: true,
          },
          type: 'PRICE_UPDATE',
          createdAt: {
            gte: startDate,
          },
        },
        include: {
          integrations: {
            include: {
              platforms: true,
            },
          },
        },
      })

      const totalPushes = pricePushJobs.length
      const successfulPushes = pricePushJobs.filter(job => job.status === 'COMPLETED').length
      const failedPushes = pricePushJobs.filter(job => job.status === 'FAILED').length
      const successRate = totalPushes > 0 ? (successfulPushes / totalPushes) * 100 : 0

      // Get unique products that had price updates
      const uniqueProducts = new Set(pricePushJobs.map(job => (job.result as any)?.productId).filter(Boolean))

      // Get last failure
      const lastFailure = pricePushJobs
        .filter(job => job.status === 'FAILED')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]

      // Get today's pushes
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayPushes = pricePushJobs.filter(job => job.createdAt >= todayStart).length

      return {
        totalPushes,
        todayPushes,
        successRate: Math.round(successRate * 10) / 10,
        uniqueProductsUpdated: uniqueProducts.size,
        lastFailure: lastFailure ? {
          createdAt: lastFailure.createdAt,
          platform: lastFailure.integrations.platforms.name,
          productName: (lastFailure.result as any)?.productName || 'Unknown Product',
          error: lastFailure.error,
        } : null,
      }
    }),

  pushAllPrices: organizationProcedure
    .input(z.object({
      restaurantId: z.string(),
      platformId: z.string().optional(), // If not provided, push to all platforms
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Verify restaurant belongs to organization
      const restaurant = await ctx.db.restaurants.findFirst({
        where: {
          id: input.restaurantId,
          organizationId,
          isActive: true,
        },
      })

      if (!restaurant) {
        throw new Error('Restaurant not found or access denied')
      }

      // Get integrations to push to (exclude website platform)
      const integrations = await ctx.db.integrations.findMany({
        where: {
          restaurantId: input.restaurantId,
          ...(input.platformId ? { platformId: input.platformId } : {}),
          status: 'CONNECTED',
          platforms: {
            type: {
              not: 'WEBSITE' // Website platform doesn't need price pushing
            }
          }
        },
        include: {
          platforms: true,
        },
      })

      if (integrations.length === 0) {
        throw new Error('No connected platforms found for this restaurant')
      }

      // Get all products for this restaurant
      const products = await ctx.db.products.findMany({
        where: {
          menus: {
            restaurantId: input.restaurantId,
            isActive: true,
          },
          isActive: true,
        },
        include: {
          menus: true,
        },
      })

      // Create price push jobs for each integration
      const pushJobs = await Promise.all(
        integrations.map(integration =>
          ctx.db.sync_jobs.create({
            data: {
              id: `price_push_${Date.now()}_${integration.id}`,
              integrationId: integration.id,
              restaurantId: input.restaurantId,
              type: 'BULK_PRICE_UPDATE',
              direction: 'OUTBOUND',
              status: 'PENDING',
              startedAt: new Date(),
            },
            include: {
              integrations: {
                include: {
                  platforms: true,
                },
              },
            },
          })
        )
      )

      // In a real implementation, this would trigger the actual price push process
      // For now, we'll simulate by updating the jobs to completed after a short delay
      setTimeout(async () => {
        for (const job of pushJobs) {
          await ctx.db.sync_jobs.update({
            where: { id: job.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              result: {
                productsUpdated: products.length,
                totalProducts: products.length,
                success: true,
              },
            },
          })

          // Update integration last sync time
          await ctx.db.integrations.update({
            where: { id: job.integrationId },
            data: {
              lastSyncAt: new Date(),
            },
          })
        }
      }, 3000) // Simulate 3-second push process

      return {
        message: `Price push initiated for ${products.length} products to ${pushJobs.length} platform${pushJobs.length > 1 ? 's' : ''}`,
        jobIds: pushJobs.map(job => job.id),
        productsCount: products.length,
      }
    }),

  // Function to trigger price push when a product price is updated
  triggerPricePush: organizationProcedure
    .input(z.object({
      productId: z.string(),
      oldPrice: z.number(),
      newPrice: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Get product with restaurant info
      const product = await ctx.db.products.findFirst({
        where: {
          id: input.productId,
          menus: {
            restaurants: {
              organizationId,
              isActive: true,
            },
            isActive: true,
          },
          isActive: true,
        },
        include: {
          menus: {
            include: {
              restaurants: true,
            },
          },
        },
      })

      if (!product) {
        throw new Error('Product not found or access denied')
      }

      const restaurant = product.menus.restaurants

      // Get integrations for this restaurant (exclude website platform - it doesn't need price pushing)
      const integrations = await ctx.db.integrations.findMany({
        where: {
          restaurantId: restaurant.id,
          status: 'CONNECTED',
          platforms: {
            type: {
              not: 'WEBSITE' // Website platform doesn't need price pushing
            }
          }
        },
        include: {
          platforms: true,
        },
      })

      if (integrations.length === 0) {
        // No connected platforms, just return success (no action needed)
        return {
          message: 'No connected platforms to push price update to',
          jobIds: [],
        }
      }

      // Create price push jobs for each connected platform
      const pushJobs = await Promise.all(
        integrations.map(integration =>
          ctx.db.sync_jobs.create({
            data: {
              id: `price_${Date.now()}_${product.id}_${integration.id}`,
              integrationId: integration.id,
              restaurantId: restaurant.id,
              type: 'PRICE_UPDATE',
              direction: 'OUTBOUND',
              status: 'PENDING',
              startedAt: new Date(),
              result: {
                productId: product.id,
                productName: product.name,
                oldPrice: input.oldPrice,
                newPrice: input.newPrice,
              },
            },
          })
        )
      )

      // In a real implementation, this would trigger actual API calls to delivery platforms
      // For now, simulate the push process
      setTimeout(async () => {
        for (const job of pushJobs) {
          // Simulate random success/failure (90% success rate)
          const isSuccess = Math.random() > 0.1

          await ctx.db.sync_jobs.update({
            where: { id: job.id },
            data: {
              status: isSuccess ? 'COMPLETED' : 'FAILED',
              completedAt: new Date(),
              error: isSuccess ? null : { message: 'API rate limit exceeded' },
              result: {
                productId: product.id,
                productName: product.name,
                oldPrice: input.oldPrice,
                newPrice: input.newPrice,
                success: isSuccess,
              },
            },
          })

          if (isSuccess) {
            // Update integration last sync time on success
            await ctx.db.integrations.update({
              where: { id: job.integrationId },
              data: {
                lastSyncAt: new Date(),
              },
            })
          }
        }
      }, 1500) // Simulate 1.5-second push process

      return {
        message: `Price update pushed to ${pushJobs.length} platform${pushJobs.length > 1 ? 's' : ''}`,
        jobIds: pushJobs.map(job => job.id),
      }
    }),
})