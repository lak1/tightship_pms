import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { startOfMonth, endOfMonth } from 'date-fns'

export const subscriptionRouter = createTRPCRouter({
  // Get current subscription details
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx

    if (!session?.user?.organizationId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'User must belong to an organization'
      })
    }

    const subscription = await db.subscriptions.findUnique({
      where: {
        organizationId: session.user.organizationId
      },
      include: {
        subscriptionPlan: true
      }
    })

    return subscription
  }),

  // Get usage stats for current month
  getUsage: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx

    if (!session?.user?.organizationId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'User must belong to an organization'
      })
    }

    const organizationId = session.user.organizationId
    const currentMonth = new Date()
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)

    // Get usage tracking records for current month
    const usageRecords = await db.usage_tracking.findMany({
      where: {
        organizationId,
        periodStart: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    })

    // Get current counts from actual data
    const [restaurantCount, productCount] = await Promise.all([
      db.restaurants.count({
        where: {
          organizationId,
          isActive: true
        }
      }),
      db.products.count({
        where: {
          menus: {
            restaurants: {
              organizationId,
              isActive: true
            }
          }
        }
      })
    ])

    // Calculate API calls from usage tracking
    const apiCallsRecord = usageRecords.find(r => r.metricType === 'api_calls')
    const apiCalls = apiCallsRecord?.count || 0

    return {
      restaurants: restaurantCount,
      products: productCount,
      apiCalls
    }
  }),

  // Get all available subscription plans
  getPlans: protectedProcedure.query(async ({ ctx }) => {
    const { db } = ctx

    const plans = await db.subscription_plans.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        priceMonthly: 'asc'
      }
    })

    return plans.map(plan => ({
      ...plan,
      // Parse JSON fields
      features: typeof plan.features === 'string' ? JSON.parse(plan.features as string) : plan.features,
      limits: typeof plan.limits === 'string' ? JSON.parse(plan.limits as string) : plan.limits
    }))
  })
})