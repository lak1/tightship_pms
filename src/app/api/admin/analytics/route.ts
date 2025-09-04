import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { dbService } from '@/lib/db-service'
import { AuditLogService, AuditAction } from '@/lib/services/audit-log'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Check admin access
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || '30d' // 7d, 30d, 90d, 1y
    const metric = searchParams.get('metric') || 'all'

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }

    // Get system metrics sequentially to avoid connection pool exhaustion on free tier
    const totalOrgs = await dbService.count('organizations')
    const totalUsers = await dbService.count('users')
    const totalRestaurants = await dbService.count('restaurants')
    const totalProducts = await dbService.count('products')

    // Active counts
    const activeOrgs = totalOrgs // Assume all orgs are active for now
    const activeUsers = await dbService.count('users', { where: { isActive: true } })
    const activeSubscriptions = await dbService.count('subscriptions', { where: { status: 'ACTIVE' } })

    // Recent signups
    const newOrgsThisPeriod = await dbService.count('organizations', {
      where: { 
        createdAt: { gte: startDate } 
      }
    })
    const newUsersThisPeriod = await dbService.count('users', {
      where: { 
        createdAt: { gte: startDate } 
      }
    })

    const basicCounts = [totalOrgs, totalUsers, totalRestaurants, totalProducts]
    const activeCounts = [totalOrgs, activeUsers, activeSubscriptions] // Use totalOrgs as activeOrgs
    const recentSignups = [newOrgsThisPeriod, newUsersThisPeriod]

    // Get subscription data separately with error handling
    let subscriptionsByStatus = []
    let activeSubscriptionsWithPlans = []
    let usersByRole = []
    let orgCreationHistory = []
    let totalUsageEvents = 0

    try {
      subscriptionsByStatus = await dbService.groupBy('subscriptions', {
        by: ['status'],
        _count: true
      })
    } catch (error) {
      logger.error('Failed to get subscription status breakdown:', error)
    }

    try {
      activeSubscriptionsWithPlans = await dbService.executeWithRetry(
        (client) => client.subscriptions.findMany({
          where: { status: 'ACTIVE' },
          include: {
            subscriptionPlan: {
              select: {
                name: true,
                tier: true
              }
            }
          }
        }),
        'subscriptions.findMany with plans'
      )
    } catch (error) {
      logger.error('Failed to get active subscriptions with plans:', error)
    }

    try {
      usersByRole = await dbService.groupBy('users', {
        by: ['role'],
        _count: true,
        where: { isActive: true }
      })
    } catch (error) {
      logger.error('Failed to get users by role breakdown:', error)
    }

    try {
      orgCreationHistory = await dbService.findMany('organizations', {
        where: {
          createdAt: { gte: startDate }
        },
        select: {
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      })
    } catch (error) {
      logger.error('Failed to get organization creation history:', error)
    }

    try {
      totalUsageEvents = await dbService.count('usage_tracking')
    } catch (error) {
      logger.error('Failed to get usage tracking count:', error)
      totalUsageEvents = 0
    }

    const [orgsTotal, usersTotal, restaurantsTotal, productsTotal] = basicCounts
    const [orgsActive, usersActive, subscriptionsActive] = activeCounts
    const [orgsNewThisPeriod, usersNewThisPeriod] = recentSignups

    // Process subscription plan breakdown
    const planBreakdown = activeSubscriptionsWithPlans.reduce((acc: any, sub) => {
      const planName = sub.subscriptionPlan?.name || 'Unknown'
      acc[planName] = (acc[planName] || 0) + 1
      return acc
    }, {})

    // Process monthly growth data
    const monthlyGrowth = orgCreationHistory.reduce((acc: any, org) => {
      const month = org.createdAt.toISOString().substring(0, 7) // YYYY-MM
      acc[month] = (acc[month] || 0) + 1
      return acc
    }, {})

    // Calculate growth rate with error handling
    let previousPeriodOrgs = 0
    try {
      const previousPeriodStart = new Date(startDate)
      const previousPeriodEnd = new Date(startDate)
      previousPeriodEnd.setTime(startDate.getTime())
      previousPeriodStart.setTime(startDate.getTime() - (now.getTime() - startDate.getTime()))

      previousPeriodOrgs = await dbService.count('organizations', {
        where: {
          createdAt: {
            gte: previousPeriodStart,
            lt: previousPeriodEnd
          }
        }
      })
    } catch (error) {
      logger.error('Failed to get previous period organizations count:', error)
      previousPeriodOrgs = 0
    }

    const growthRate = previousPeriodOrgs > 0 
      ? ((orgsNewThisPeriod - previousPeriodOrgs) / previousPeriodOrgs * 100).toFixed(1)
      : orgsNewThisPeriod > 0 ? '100.0' : '0.0'

    const analytics = {
      overview: {
        totalOrganizations: orgsTotal,
        totalUsers: usersTotal,
        totalRestaurants: restaurantsTotal,
        totalProducts: productsTotal,
        activeOrganizations: orgsActive,
        activeUsers: usersActive,
        activeSubscriptions: subscriptionsActive,
        newOrganizations: orgsNewThisPeriod,
        newUsers: usersNewThisPeriod,
        growthRate: `${growthRate}%`,
        totalUsageEvents: totalUsageEvents || 0
      },
      subscriptions: {
        byStatus: subscriptionsByStatus,
        byPlan: planBreakdown,
        total: subscriptionsActive,
        conversionRate: orgsTotal > 0 ? ((subscriptionsActive / orgsTotal) * 100).toFixed(1) + '%' : '0%'
      },
      users: {
        byRole: usersByRole,
        total: usersTotal,
        active: usersActive,
        activeRate: usersTotal > 0 ? ((usersActive / usersTotal) * 100).toFixed(1) + '%' : '0%'
      },
      growth: {
        monthly: monthlyGrowth,
        period: period,
        rate: growthRate + '%'
      },
      system: {
        uptime: '99.9%', // This would be calculated from actual system monitoring
        responseTime: '245ms', // This would be from APM tools
        errorRate: '0.1%', // This would be from error tracking
        lastUpdated: new Date().toISOString()
      }
    }

    await AuditLogService.logSystemAction(
      AuditAction.BULK_ACTION_PERFORMED,
      { action: 'VIEW_ANALYTICS', period, metric },
      req
    )

    return NextResponse.json(analytics)

  } catch (error) {
    logger.error('Admin analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}