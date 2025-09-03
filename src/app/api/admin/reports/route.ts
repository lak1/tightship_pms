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
    const reportType = searchParams.get('type') || 'overview'
    const format = searchParams.get('format') || 'json'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Parse date range
    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = dateTo ? new Date(dateTo) : new Date()

    let reportData: any = {}

    switch (reportType) {
      case 'overview':
        reportData = await generateOverviewReport(startDate, endDate)
        break
      case 'users':
        reportData = await generateUsersReport(startDate, endDate)
        break
      case 'organizations':
        reportData = await generateOrganizationsReport(startDate, endDate)
        break
      case 'subscriptions':
        reportData = await generateSubscriptionsReport(startDate, endDate)
        break
      case 'revenue':
        reportData = await generateRevenueReport(startDate, endDate)
        break
      case 'growth':
        reportData = await generateGrowthReport(startDate, endDate)
        break
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    await AuditLogService.logSystemAction(
      AuditAction.BULK_ACTION_PERFORMED,
      { action: 'GENERATE_REPORT', reportType, format, dateRange: { startDate, endDate } },
      req
    )

    if (format === 'csv') {
      const csv = convertToCSV(reportData)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    return NextResponse.json({
      success: true,
      report: {
        type: reportType,
        dateRange: { startDate, endDate },
        generatedAt: new Date().toISOString(),
        data: reportData
      }
    })

  } catch (error) {
    logger.error('Admin reports API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function generateOverviewReport(startDate: Date, endDate: Date) {
  const [
    totalUsers,
    totalOrganizations,
    totalSubscriptions,
    activeSubscriptions,
    newUsersInPeriod,
    newOrganizationsInPeriod,
    revenueData
  ] = await Promise.all([
    db.users.count(),
    db.organizations.count(),
    db.subscriptions.count(),
    db.subscriptions.count({ where: { status: 'ACTIVE' } }),
    db.users.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
    db.organizations.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
    db.subscriptions.findMany({
      where: {
        status: 'ACTIVE',
        createdAt: { gte: startDate, lte: endDate }
      },
      include: { subscriptionPlan: { select: { priceMonthly: true } } }
    })
  ])

  const totalRevenue = revenueData.reduce((sum, sub) => sum + (sub.subscriptionPlan?.priceMonthly || 0), 0)

  return {
    summary: {
      totalUsers,
      totalOrganizations,
      totalSubscriptions,
      activeSubscriptions,
      newUsersInPeriod,
      newOrganizationsInPeriod,
      totalRevenue,
      averageRevenuePerUser: totalUsers > 0 ? (totalRevenue / totalUsers).toFixed(2) : 0
    },
    metrics: {
      userGrowthRate: ((newUsersInPeriod / Math.max(totalUsers - newUsersInPeriod, 1)) * 100).toFixed(1),
      organizationGrowthRate: ((newOrganizationsInPeriod / Math.max(totalOrganizations - newOrganizationsInPeriod, 1)) * 100).toFixed(1),
      subscriptionConversionRate: totalOrganizations > 0 ? ((activeSubscriptions / totalOrganizations) * 100).toFixed(1) : 0
    }
  }
}

async function generateUsersReport(startDate: Date, endDate: Date) {
  const users = await db.users.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      organizations: {
        select: { name: true, slug: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  const roleBreakdown = await db.users.groupBy({
    by: ['role'],
    _count: true,
    where: { createdAt: { gte: startDate, lte: endDate } }
  })

  const statusBreakdown = await db.users.groupBy({
    by: ['isActive'],
    _count: true,
    where: { createdAt: { gte: startDate, lte: endDate } }
  })

  return {
    users: users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      organizationName: user.organizations?.name,
      createdAt: user.createdAt
    })),
    statistics: {
      total: users.length,
      roleBreakdown,
      statusBreakdown
    }
  }
}

async function generateOrganizationsReport(startDate: Date, endDate: Date) {
  const organizations = await db.organizations.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      _count: {
        select: {
          users: true,
          restaurants: true
        }
      },
      subscriptions: {
        include: {
          subscriptionPlan: {
            select: { name: true, priceMonthly: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return {
    organizations: organizations.map(org => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      userCount: org._count.users,
      restaurantCount: org._count.restaurants,
      subscriptionPlan: org.subscriptions?.subscriptionPlan?.name || 'No Plan',
      monthlyRevenue: org.subscriptions?.subscriptionPlan?.priceMonthly || 0,
      createdAt: org.createdAt
    })),
    statistics: {
      total: organizations.length,
      totalRevenue: organizations.reduce((sum, org) => sum + (org.subscriptions?.subscriptionPlan?.priceMonthly || 0), 0),
      averageUsersPerOrg: organizations.length > 0 ? 
        (organizations.reduce((sum, org) => sum + org._count.users, 0) / organizations.length).toFixed(1) : 0
    }
  }
}

async function generateSubscriptionsReport(startDate: Date, endDate: Date) {
  const subscriptions = await db.subscriptions.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      organizations: {
        select: { name: true, slug: true }
      },
      plan: {
        select: { name: true, type: true, price: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  const statusBreakdown = await db.subscriptions.groupBy({
    by: ['status'],
    _count: true,
    where: { createdAt: { gte: startDate, lte: endDate } }
  })

  const planBreakdown = await db.subscriptions.findMany({
    where: { createdAt: { gte: startDate, lte: endDate } },
    include: { subscriptionPlan: { select: { name: true } } }
  }).then(subs => {
    const breakdown = {}
    subs.forEach(sub => {
      const planName = sub.subscriptionPlan?.name || 'Unknown'
      breakdown[planName] = (breakdown[planName] || 0) + 1
    })
    return Object.entries(breakdown).map(([name, count]) => ({ planName: name, count }))
  })

  return {
    subscriptions: subscriptions.map(sub => ({
      id: sub.id,
      organizationName: sub.organizations?.name,
      planName: sub.subscriptionPlan?.name,
      planType: sub.subscriptionPlan?.tier,
      price: sub.subscriptionPlan?.priceMonthly,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      createdAt: sub.createdAt
    })),
    statistics: {
      total: subscriptions.length,
      statusBreakdown,
      planBreakdown,
      totalRevenue: subscriptions
        .filter(sub => sub.status === 'ACTIVE')
        .reduce((sum, sub) => sum + (sub.subscriptionPlan?.priceMonthly || 0), 0)
    }
  }
}

async function generateRevenueReport(startDate: Date, endDate: Date) {
  const activeSubscriptions = await db.subscriptions.findMany({
    where: {
      status: 'ACTIVE',
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      subscriptionPlan: { select: { name: true, priceMonthly: true } },
      organizations: { select: { name: true } }
    }
  })

  const monthlyRevenue = activeSubscriptions.reduce((sum, sub) => sum + (sub.subscriptionPlan?.priceMonthly || 0), 0)
  const annualRevenue = monthlyRevenue * 12

  const revenueByPlan = activeSubscriptions.reduce((acc, sub) => {
    const planName = sub.subscriptionPlan?.name || 'Unknown'
    if (!acc[planName]) {
      acc[planName] = { count: 0, revenue: 0 }
    }
    acc[planName].count += 1
    acc[planName].revenue += sub.subscriptionPlan?.priceMonthly || 0
    return acc
  }, {})

  return {
    summary: {
      monthlyRecurringRevenue: monthlyRevenue,
      annualRecurringRevenue: annualRevenue,
      averageRevenuePerUser: activeSubscriptions.length > 0 ? 
        (monthlyRevenue / activeSubscriptions.length).toFixed(2) : 0,
      totalActiveSubscriptions: activeSubscriptions.length
    },
    breakdown: {
      byPlan: Object.entries(revenueByPlan).map(([planName, data]) => ({
        planName,
        subscriptionCount: data.count,
        monthlyRevenue: data.revenue,
        percentage: ((data.revenue / monthlyRevenue) * 100).toFixed(1)
      }))
    },
    subscriptions: activeSubscriptions.map(sub => ({
      organizationName: sub.organizations?.name,
      planName: sub.subscriptionPlan?.name,
      monthlyRevenue: sub.subscriptionPlan?.priceMonthly || 0,
      createdAt: sub.createdAt
    }))
  }
}

async function generateGrowthReport(startDate: Date, endDate: Date) {
  // Generate daily/weekly/monthly growth data
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const interval = days > 90 ? 'month' : days > 30 ? 'week' : 'day'

  const userGrowth = await getUserGrowthData(startDate, endDate, interval)
  const organizationGrowth = await getOrganizationGrowthData(startDate, endDate, interval)
  const revenueGrowth = await getRevenueGrowthData(startDate, endDate, interval)

  return {
    interval,
    dateRange: { startDate, endDate },
    growth: {
      users: userGrowth,
      organizations: organizationGrowth,
      revenue: revenueGrowth
    }
  }
}

async function getUserGrowthData(startDate: Date, endDate: Date, interval: string) {
  // This would implement proper time-series queries
  // For demo, return mock growth data
  return [
    { period: '2024-01', count: 25, cumulative: 125 },
    { period: '2024-02', count: 32, cumulative: 157 },
    { period: '2024-03', count: 28, cumulative: 185 }
  ]
}

async function getOrganizationGrowthData(startDate: Date, endDate: Date, interval: string) {
  return [
    { period: '2024-01', count: 8, cumulative: 45 },
    { period: '2024-02', count: 12, cumulative: 57 },
    { period: '2024-03', count: 9, cumulative: 66 }
  ]
}

async function getRevenueGrowthData(startDate: Date, endDate: Date, interval: string) {
  return [
    { period: '2024-01', revenue: 2400, cumulative: 12400 },
    { period: '2024-02', revenue: 3200, cumulative: 15600 },
    { period: '2024-03', revenue: 2800, cumulative: 18400 }
  ]
}

function convertToCSV(data: any): string {
  if (!data || typeof data !== 'object') {
    return 'No data available'
  }

  // Handle different data structures
  if (data.users) {
    return convertArrayToCSV(data.users)
  } else if (data.organizations) {
    return convertArrayToCSV(data.organizations)
  } else if (data.subscriptions) {
    return convertArrayToCSV(data.subscriptions)
  } else if (Array.isArray(data)) {
    return convertArrayToCSV(data)
  } else {
    // Convert object to key-value CSV
    const rows = Object.entries(data).map(([key, value]) => [key, String(value)])
    return [['Key', 'Value'], ...rows].map(row => row.join(',')).join('\n')
  }
}

function convertArrayToCSV(array: any[]): string {
  if (!array.length) return 'No data available'

  const headers = Object.keys(array[0])
  const csvContent = [
    headers.join(','),
    ...array.map(row => 
      headers.map(header => {
        const value = row[header]
        if (value === null || value === undefined) return ''
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`
        }
        return String(value)
      }).join(',')
    )
  ].join('\n')

  return csvContent
}