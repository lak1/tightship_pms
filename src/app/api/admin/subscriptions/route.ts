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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || 'all'
    const planType = searchParams.get('planType') || 'all'
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (status !== 'all') {
      where.status = status
    }

    if (planType !== 'all') {
      where.subscriptionPlan = { tier: planType }
    }

    if (search) {
      where.organizations = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } }
        ]
      }
    }

    // Get subscriptions with related data
    const [subscriptions, total] = await Promise.all([
      db.subscriptions.findMany({
        where,
        skip,
        take: limit,
        include: {
          organizations: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          subscriptionPlan: {
            select: {
              id: true,
              name: true,
              tier: true,
              priceMonthly: true,
              features: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      db.subscriptions.count({ where })
    ])

    // Get summary statistics
    const summary = await Promise.all([
      db.subscriptions.count({ where: { status: 'ACTIVE' } }),
      db.subscriptions.count({ where: { status: 'CANCELLED' } }),
      db.subscriptions.count({ where: { status: 'INCOMPLETE' } }),
      db.subscriptions.count({ where: { status: 'PAST_DUE' } }),
      
      // Revenue calculation (simplified)
      db.subscriptions.findMany({
        where: { status: 'ACTIVE' },
        include: { subscriptionPlan: { select: { priceMonthly: true } } }
      })
    ])

    const [activeCount, cancelledCount, incompleteCount, pastDueCount, activeSubsWithPricing] = summary

    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = activeSubsWithPricing.reduce((total, sub) => {
      return total + (sub.subscriptionPlan?.priceMonthly || 0)
    }, 0)

    await AuditLogService.logSystemAction(
      AuditAction.BULK_ACTION_PERFORMED,
      { action: 'LIST_SUBSCRIPTIONS', count: subscriptions.length },
      req
    )

    return NextResponse.json({
      subscriptions,
      summary: {
        active: activeCount,
        cancelled: cancelledCount,
        incomplete: incompleteCount,
        pastDue: pastDueCount,
        total: total,
        mrr: mrr
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    logger.error('Admin subscriptions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Check admin access
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await req.json()
    const { subscriptionId, action, ...data } = body

    if (!subscriptionId || !action) {
      return NextResponse.json({ 
        error: 'Subscription ID and action are required' 
      }, { status: 400 })
    }

    const subscription = await db.subscriptions.findUnique({
      where: { id: subscriptionId },
      include: {
        organizations: { select: { id: true, name: true } },
        subscriptionPlan: { select: { id: true, name: true, tier: true } }
      }
    })

    if (!subscription) {
      return NextResponse.json({ 
        error: 'Subscription not found' 
      }, { status: 404 })
    }

    let updatedSubscription
    let auditAction: AuditAction
    let auditDetails: any = { 
      subscriptionId,
      organizationId: subscription.organizationId,
      organizationName: subscription.organizations?.name
    }

    switch (action) {
      case 'cancel':
        updatedSubscription = await db.subscriptions.update({
          where: { id: subscriptionId },
          data: { 
            status: 'CANCELLED',
            cancelledAt: new Date()
          },
          include: {
            organization: { select: { id: true, name: true } },
            plan: { select: { id: true, name: true, type: true } }
          }
        })
        auditAction = AuditAction.SUBSCRIPTION_CANCELLED
        auditDetails.reason = data.reason
        auditDetails.cancelledBy = session.user.id
        break

      case 'reactivate':
        if (subscription.status !== 'CANCELLED') {
          return NextResponse.json({ 
            error: 'Can only reactivate cancelled subscriptions' 
          }, { status: 400 })
        }

        const newEndDate = new Date()
        newEndDate.setMonth(newEndDate.getMonth() + 1) // Extend by 1 month

        updatedSubscription = await db.subscriptions.update({
          where: { id: subscriptionId },
          data: { 
            status: 'ACTIVE',
            cancelledAt: null,
            currentPeriodEnd: newEndDate
          },
          include: {
            organization: { select: { id: true, name: true } },
            plan: { select: { id: true, name: true, type: true } }
          }
        })
        auditAction = AuditAction.SUBSCRIPTION_UPDATED
        auditDetails.action = 'reactivated'
        auditDetails.newEndDate = newEndDate
        break

      case 'change_plan':
        if (!data.newPlanId) {
          return NextResponse.json({ 
            error: 'New plan ID is required' 
          }, { status: 400 })
        }

        const newPlan = await db.subscriptionsPlan.findUnique({
          where: { id: data.newPlanId }
        })

        if (!newPlan) {
          return NextResponse.json({ 
            error: 'New plan not found' 
          }, { status: 400 })
        }

        const isUpgrade = (newPlan.priceMonthly || 0) > (subscription.subscriptionPlan?.priceMonthly || 0)

        updatedSubscription = await db.subscriptions.update({
          where: { id: subscriptionId },
          data: { 
            planId: data.newPlanId
          },
          include: {
            organization: { select: { id: true, name: true } },
            plan: { select: { id: true, name: true, type: true } }
          }
        })
        
        auditAction = isUpgrade ? AuditAction.SUBSCRIPTION_UPGRADED : AuditAction.SUBSCRIPTION_DOWNGRADED
        auditDetails.oldPlan = subscription.subscriptionPlan?.name
        auditDetails.newPlan = newPlan.name
        auditDetails.oldPrice = subscription.subscriptionPlan?.priceMonthly
        auditDetails.newPrice = newPlan.priceMonthly
        break

      case 'extend':
        if (!data.extensionDays) {
          return NextResponse.json({ 
            error: 'Extension days required' 
          }, { status: 400 })
        }

        const extendedEndDate = new Date(subscription.currentPeriodEnd)
        extendedEndDate.setDate(extendedEndDate.getDate() + parseInt(data.extensionDays))

        updatedSubscription = await db.subscriptions.update({
          where: { id: subscriptionId },
          data: { 
            currentPeriodEnd: extendedEndDate
          },
          include: {
            organization: { select: { id: true, name: true } },
            plan: { select: { id: true, name: true, type: true } }
          }
        })
        
        auditAction = AuditAction.SUBSCRIPTION_UPDATED
        auditDetails.action = 'extended'
        auditDetails.extensionDays = data.extensionDays
        auditDetails.newEndDate = extendedEndDate
        break

      default:
        return NextResponse.json({ 
          error: 'Invalid action' 
        }, { status: 400 })
    }

    await AuditLogService.logSubscriptionAction(
      auditAction,
      subscriptionId,
      auditDetails,
      req
    )

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription
    })

  } catch (error) {
    logger.error('Admin update subscription API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Check admin access
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await req.json()
    const { organizationId, planId } = body

    if (!organizationId || !planId) {
      return NextResponse.json({ 
        error: 'Organization ID and plan ID are required' 
      }, { status: 400 })
    }

    // Check if organization exists
    const organization = await db.organizations.findUnique({
      where: { id: organizationId }
    })

    if (!organization) {
      return NextResponse.json({ 
        error: 'Organization not found' 
      }, { status: 400 })
    }

    // Check if plan exists
    const plan = await db.subscriptionsPlan.findUnique({
      where: { id: planId }
    })

    if (!plan) {
      return NextResponse.json({ 
        error: 'Plan not found' 
      }, { status: 400 })
    }

    // Check if organization already has an active subscription
    const existingSubscription = await db.subscriptions.findFirst({
      where: {
        organizationId,
        status: { in: ['ACTIVE', 'PAST_DUE'] }
      }
    })

    if (existingSubscription) {
      return NextResponse.json({ 
        error: 'Organization already has an active subscription' 
      }, { status: 400 })
    }

    // Create new subscription
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 1) // 1 month from now

    const subscription = await db.subscriptions.create({
      data: {
        organizationId,
        planId,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: endDate
      },
      include: {
        organizations: { select: { id: true, name: true } },
        subscriptionPlan: { select: { id: true, name: true, tier: true } }
      }
    })

    await AuditLogService.logSubscriptionAction(
      AuditAction.SUBSCRIPTION_CREATED,
      subscription.id,
      { 
        organizationId,
        organizationName: organization.name,
        planId,
        planName: plan.name,
        createdBy: session.user.id
      },
      req
    )

    return NextResponse.json({
      success: true,
      subscription
    })

  } catch (error) {
    logger.error('Admin create subscription API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}