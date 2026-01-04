import { z } from 'zod'
import { createTRPCRouter, organizationProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

/**
 * Analytics Router
 * Provides metrics for sync jobs, menus, subscriptions, and platform performance
 */
export const analyticsRouter = createTRPCRouter({
  /**
   * Get sync analytics
   */
  getSyncAnalytics: organizationProcedure
    .input(
      z.object({
        restaurantId: z.string().optional(),
        dateRange: z.enum(['7d', '30d', '90d', '12m']).default('30d'),
      })
    )
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Calculate date range
      const now = new Date()
      const rangeMap = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '12m': 365,
      }
      const daysAgo = rangeMap[input.dateRange]
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

      // Get sync jobs
      const syncJobs = await ctx.db.sync_jobs.findMany({
        where: {
          ...(input.restaurantId
            ? { restaurantId: input.restaurantId }
            : {
                restaurant: {
                  organizationId,
                },
              }),
          createdAt: {
            gte: startDate,
          },
        },
        include: {
          integration: {
            select: {
              platformId: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      // Calculate metrics
      const totalSyncs = syncJobs.length
      const successfulSyncs = syncJobs.filter((job) => job.status === 'COMPLETED').length
      const failedSyncs = syncJobs.filter((job) => job.status === 'FAILED').length
      const inProgressSyncs = syncJobs.filter((job) => job.status === 'IN_PROGRESS').length
      const successRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0

      // Group by platform
      const platformStats: Record<string, { total: number; successful: number; failed: number }> = {}
      syncJobs.forEach((job) => {
        const platform = job.integration.platformId
        if (!platformStats[platform]) {
          platformStats[platform] = { total: 0, successful: 0, failed: 0 }
        }
        platformStats[platform].total++
        if (job.status === 'COMPLETED') platformStats[platform].successful++
        if (job.status === 'FAILED') platformStats[platform].failed++
      })

      // Group by date for chart
      const syncsByDate: Record<string, { date: string; successful: number; failed: number }> = {}
      syncJobs.forEach((job) => {
        const date = job.createdAt.toISOString().split('T')[0]
        if (!syncsByDate[date]) {
          syncsByDate[date] = { date, successful: 0, failed: 0 }
        }
        if (job.status === 'COMPLETED') syncsByDate[date].successful++
        if (job.status === 'FAILED') syncsByDate[date].failed++
      })

      const syncTrend = Object.values(syncsByDate).sort((a, b) =>
        a.date.localeCompare(b.date)
      )

      // Calculate average duration
      const completedJobs = syncJobs.filter(
        (job) => job.status === 'COMPLETED' && job.startedAt && job.completedAt
      )
      const avgDuration =
        completedJobs.length > 0
          ? completedJobs.reduce((sum, job) => {
              const duration =
                new Date(job.completedAt!).getTime() - new Date(job.startedAt!).getTime()
              return sum + duration
            }, 0) / completedJobs.length
          : 0

      return {
        totalSyncs,
        successfulSyncs,
        failedSyncs,
        inProgressSyncs,
        successRate: Math.round(successRate * 10) / 10,
        avgDuration: Math.round(avgDuration / 1000), // Convert to seconds
        platformStats,
        syncTrend,
        recentSyncs: syncJobs.slice(0, 10).map((job) => ({
          id: job.id,
          platform: job.integration.platformId,
          type: job.type,
          status: job.status,
          createdAt: job.createdAt.toISOString(),
          completedAt: job.completedAt?.toISOString(),
          result: job.result,
        })),
      }
    }),

  /**
   * Get menu analytics
   */
  getMenuAnalytics: organizationProcedure
    .input(
      z.object({
        restaurantId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId

      // Get restaurants
      const restaurants = await ctx.db.restaurants.findMany({
        where: {
          organizationId,
          ...(input.restaurantId ? { id: input.restaurantId } : {}),
          isActive: true,
        },
        include: {
          menus: {
            where: { isActive: true },
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
          },
        },
      })

      const totalRestaurants = restaurants.length
      const totalMenus = restaurants.reduce((sum, r) => sum + r.menus.length, 0)
      const totalCategories = restaurants.reduce(
        (sum, r) => sum + r.menus.reduce((catSum, m) => catSum + m.categories.length, 0),
        0
      )
      const totalProducts = restaurants.reduce(
        (sum, r) =>
          sum +
          r.menus.reduce(
            (menuSum, m) =>
              menuSum + m.categories.reduce((catSum, c) => catSum + c.products.length, 0),
            0
          ),
        0
      )

      // Calculate average prices
      const allProducts: number[] = []
      restaurants.forEach((r) => {
        r.menus.forEach((m) => {
          m.categories.forEach((c) => {
            c.products.forEach((p) => {
              allProducts.push(Number(p.basePrice))
            })
          })
        })
      })

      const avgPrice =
        allProducts.length > 0
          ? allProducts.reduce((sum, price) => sum + price, 0) / allProducts.length
          : 0

      // Product distribution by category
      const categoryDistribution: Record<string, number> = {}
      restaurants.forEach((r) => {
        r.menus.forEach((m) => {
          m.categories.forEach((c) => {
            if (!categoryDistribution[c.name]) {
              categoryDistribution[c.name] = 0
            }
            categoryDistribution[c.name] += c.products.length
          })
        })
      })

      return {
        totalRestaurants,
        totalMenus,
        totalCategories,
        totalProducts,
        avgPrice: Math.round(avgPrice * 100) / 100,
        categoryDistribution,
        menuDetails: restaurants.map((r) => ({
          restaurantId: r.id,
          restaurantName: r.name,
          menus: r.menus.map((m) => ({
            menuId: m.id,
            menuName: m.name,
            categories: m.categories.length,
            products: m.categories.reduce((sum, c) => sum + c.products.length, 0),
          })),
        })),
      }
    }),

  /**
   * Get subscription analytics
   */
  getSubscriptionAnalytics: organizationProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.user.organizationId

    // Get organization with subscription
    const organization = await ctx.db.organizations.findUnique({
      where: { id: organizationId },
      include: {
        subscription: true,
      },
    })

    if (!organization) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Organization not found',
      })
    }

    const subscription = organization.subscription

    // Get restaurant count
    const restaurantCount = await ctx.db.restaurants.count({
      where: {
        organizationId,
        isActive: true,
      },
    })

    // Get usage limits based on tier
    const tierLimits: Record<string, { restaurants: number; menus: number; products: number }> = {
      FREE: { restaurants: 1, menus: 1, products: 50 },
      SINGLE: { restaurants: 1, menus: 5, products: 200 },
      MULTI: { restaurants: 3, menus: 999, products: 999999 },
      GROWING: { restaurants: 9, menus: 999, products: 999999 },
      ENTERPRISE: { restaurants: 999, menus: 999, products: 999999 },
    }

    const limits = tierLimits[subscription?.tier || 'FREE'] || tierLimits.FREE

    // Get menu count
    const menuCount = await ctx.db.menus.count({
      where: {
        restaurants: {
          organizationId,
          isActive: true,
        },
        isActive: true,
      },
    })

    // Get product count
    const productCount = await ctx.db.products.count({
      where: {
        organizationId,
        isActive: true,
      },
    })

    // Calculate usage percentages
    const restaurantUsage = (restaurantCount / limits.restaurants) * 100
    const menuUsage = (menuCount / limits.menus) * 100
    const productUsage = (productCount / limits.products) * 100

    return {
      tier: subscription?.tier || 'FREE',
      status: subscription?.status || 'active',
      currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString(),
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
      usage: {
        restaurants: {
          current: restaurantCount,
          limit: limits.restaurants,
          percentage: Math.min(Math.round(restaurantUsage), 100),
        },
        menus: {
          current: menuCount,
          limit: limits.menus,
          percentage: Math.min(Math.round(menuUsage), 100),
        },
        products: {
          current: productCount,
          limit: limits.products,
          percentage: Math.min(Math.round(productUsage), 100),
        },
      },
    }
  }),

  /**
   * Get platform integration stats
   */
  getPlatformStats: organizationProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.user.organizationId

    // Get all integrations
    const integrations = await ctx.db.integrations.findMany({
      where: {
        restaurant: {
          organizationId,
        },
      },
      include: {
        restaurant: {
          select: {
            name: true,
          },
        },
      },
    })

    // Group by platform
    const platformCounts: Record<string, number> = {}
    const platformsByStatus: Record<string, { connected: number; disconnected: number }> = {}

    integrations.forEach((integration) => {
      const platform = integration.platformId

      // Count total
      platformCounts[platform] = (platformCounts[platform] || 0) + 1

      // Count by status
      if (!platformsByStatus[platform]) {
        platformsByStatus[platform] = { connected: 0, disconnected: 0 }
      }
      if (integration.status === 'CONNECTED') {
        platformsByStatus[platform].connected++
      } else {
        platformsByStatus[platform].disconnected++
      }
    })

    // Get last sync times per platform
    const platformLastSync: Record<string, string> = {}
    for (const platform of Object.keys(platformCounts)) {
      const lastSync = await ctx.db.sync_jobs.findFirst({
        where: {
          integration: {
            platformId: platform,
            restaurant: {
              organizationId,
            },
          },
          status: 'COMPLETED',
        },
        orderBy: {
          completedAt: 'desc',
        },
        select: {
          completedAt: true,
        },
      })

      if (lastSync?.completedAt) {
        platformLastSync[platform] = lastSync.completedAt.toISOString()
      }
    }

    return {
      totalIntegrations: integrations.length,
      platformCounts,
      platformsByStatus,
      platformLastSync,
      integrations: integrations.map((i) => ({
        id: i.id,
        platform: i.platformId,
        restaurant: i.restaurant.name,
        status: i.status,
        lastSyncAt: i.lastSyncAt?.toISOString(),
        createdAt: i.createdAt.toISOString(),
      })),
    }
  }),
})
