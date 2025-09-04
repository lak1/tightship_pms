import { createTRPCRouter, organizationProcedure } from '../trpc'
import { dbService } from '@/lib/db-service'

export const dashboardRouter = createTRPCRouter({
  getStats: organizationProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.user.organizationId

    // Get restaurant count
    const restaurantCount = await ctx.db.restaurants.count({
      where: {
        organizationId,
        isActive: true,
      },
    })

    // Get total products count across all restaurants
    const productCount = await ctx.db.products.count({
      where: {
        menus: {
          restaurants: {
            organizationId,
            isActive: true,
          },
        },
        isActive: true,
      },
    })

    // Get total menus count
    const menuCount = await ctx.db.menus.count({
      where: {
        restaurants: {
          organizationId,
          isActive: true,
        },
        isActive: true,
      },
    })

    // Get total categories count
    const categoryCount = await ctx.db.categories.count({
      where: {
        menus: {
          restaurants: {
            organizationId,
            isActive: true,
          },
          isActive: true,
        },
        isActive: true,
      },
    })

    // Get last sync time
    const lastSync = await ctx.db.sync_jobs.findFirst({
      where: {
        restaurants: {
          organizationId,
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    })

    return {
      totalRestaurants: restaurantCount,
      totalProducts: productCount,
      totalMenus: menuCount,
      totalCategories: categoryCount,
      lastSync: lastSync?.completedAt || new Date(Date.now() - 30000), // 30 seconds ago as fallback
    }
  }),

  getRecentActivity: organizationProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.user.organizationId

    // Get recent sync jobs with retry logic
    const recentSyncs = await dbService.executeWithRetry(
      (client) => client.sync_jobs.findMany({
        where: {
          restaurants: {
            organizationId,
          },
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
        take: 10,
      }),
      'sync_jobs.findMany'
    ).catch((error) => {
      console.warn('Failed to get recent syncs:', error)
      return []
    })

    // Get recent price changes with retry logic
    const recentPriceChanges = await dbService.executeWithRetry(
      (client) => client.price_history.findMany({
        where: {
          products: {
            menus: {
              restaurants: {
                organizationId,
              },
            },
          },
        },
        include: {
          products: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
      'price_history.findMany'
    ).catch((error) => {
      console.warn('Failed to get recent price changes:', error)
      return []
    })

    // Get recently created products
    const recentProducts = await ctx.db.products.findMany({
      where: {
        menus: {
          restaurants: {
            organizationId,
            isActive: true,
          },
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
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })

    // Combine and format activities
    const activities = [
      ...recentSyncs.map(sync => ({
        id: `sync_${sync.id}`,
        type: 'sync',
        message: `${sync.status === 'COMPLETED' ? 'Prices synced to' : sync.status === 'FAILED' ? 'Sync failed for' : 'Syncing to'} ${sync.integrations.platforms.name}`,
        time: formatTimeAgo(sync.createdAt),
        status: sync.status === 'COMPLETED' ? 'success' : sync.status === 'FAILED' ? 'error' : 'pending',
        createdAt: sync.createdAt,
      })),
      ...recentPriceChanges.map(change => ({
        id: `price_${change.id}`,
        type: 'price',
        message: `Price updated for "${change.products.name}"`,
        time: formatTimeAgo(change.createdAt),
        status: 'success',
        createdAt: change.createdAt,
      })),
      ...recentProducts.map(product => ({
        id: `product_${product.id}`,
        type: 'product',
        message: `New product "${product.name}" added to ${product.menus.restaurants.name}`,
        time: formatTimeAgo(product.createdAt),
        status: 'success',
        createdAt: product.createdAt,
      })),
    ]

    // Sort by creation time and take the most recent 6
    return activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)
  }),
})

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  return `${Math.floor(diffInSeconds / 86400)} days ago`
}