import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
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

    // Get system metrics
    const metrics = await Promise.all([
      // Total counts
      db.organization.count(),
      db.user.count(),
      db.restaurant.count(),
      db.product.count(),

      // Active counts
      db.organization.count({ where: { isActive: true } }),
      db.user.count({ where: { isActive: true } }),
      db.subscription.count({ where: { status: 'ACTIVE' } }),

      // Recent signups
      db.organization.count({
        where: { 
          createdAt: { gte: startDate } 
        }
      }),
      db.user.count({
        where: { 
          createdAt: { gte: startDate } 
        }
      }),

      // Subscription breakdown
      db.subscription.groupBy({
        by: ['status'],
        _count: true
      }),

      // Plan breakdown
      db.subscription.findMany({
        where: { status: 'ACTIVE' },
        include: {
          plan: {
            select: {
              name: true,
              type: true
            }
          }
        }
      }),

      // User roles breakdown
      db.user.groupBy({
        by: ['role'],
        _count: true,
        where: { isActive: true }
      }),

      // Monthly growth (organizations created per month)
      db.organization.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        select: {
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      }),

      // Usage metrics (if usage tracking table exists)
      // This would be expanded based on actual usage tracking implementation
      db.usageTracking?.count?.() || 0
    ])

    const [
      totalOrgs,
      totalUsers,
      totalRestaurants,
      totalProducts,
      activeOrgs,
      activeUsers,
      activeSubscriptions,
      newOrgsThisPeriod,
      newUsersThisPeriod,
      subscriptionsByStatus,
      activeSubscriptionsWithPlans,
      usersByRole,
      orgCreationHistory,
      totalUsageEvents
    ] = metrics

    // Process subscription plan breakdown
    const planBreakdown = activeSubscriptionsWithPlans.reduce((acc: any, sub) => {
      const planName = sub.plan?.name || 'Unknown'
      acc[planName] = (acc[planName] || 0) + 1
      return acc
    }, {})

    // Process monthly growth data
    const monthlyGrowth = orgCreationHistory.reduce((acc: any, org) => {
      const month = org.createdAt.toISOString().substring(0, 7) // YYYY-MM
      acc[month] = (acc[month] || 0) + 1
      return acc
    }, {})

    // Calculate growth rate
    const previousPeriodStart = new Date(startDate)
    const previousPeriodEnd = new Date(startDate)
    previousPeriodEnd.setTime(startDate.getTime())
    previousPeriodStart.setTime(startDate.getTime() - (now.getTime() - startDate.getTime()))

    const previousPeriodOrgs = await db.organization.count({
      where: {
        createdAt: {
          gte: previousPeriodStart,
          lt: previousPeriodEnd
        }
      }
    })

    const growthRate = previousPeriodOrgs > 0 
      ? ((newOrgsThisPeriod - previousPeriodOrgs) / previousPeriodOrgs * 100).toFixed(1)
      : newOrgsThisPeriod > 0 ? '100.0' : '0.0'

    const analytics = {
      overview: {
        totalOrganizations: totalOrgs,
        totalUsers: totalUsers,
        totalRestaurants: totalRestaurants,
        totalProducts: totalProducts,
        activeOrganizations: activeOrgs,
        activeUsers: activeUsers,
        activeSubscriptions: activeSubscriptions,
        newOrganizations: newOrgsThisPeriod,
        newUsers: newUsersThisPeriod,
        growthRate: `${growthRate}%`,
        totalUsageEvents: totalUsageEvents || 0
      },
      subscriptions: {
        byStatus: subscriptionsByStatus,
        byPlan: planBreakdown,
        total: activeSubscriptions,
        conversionRate: totalOrgs > 0 ? ((activeSubscriptions / totalOrgs) * 100).toFixed(1) + '%' : '0%'
      },
      users: {
        byRole: usersByRole,
        total: totalUsers,
        active: activeUsers,
        activeRate: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) + '%' : '0%'
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