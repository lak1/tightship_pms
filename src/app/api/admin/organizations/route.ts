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
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (status !== 'all') {
      where.isActive = status === 'active'
    }

    // Get organizations with user count and subscription info
    const [organizations, total] = await Promise.all([
      db.organization.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              users: true,
              restaurants: true
            }
          },
          subscription: {
            include: {
              plan: true
            }
          },
          users: {
            where: { role: 'OWNER' },
            take: 1,
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      db.organization.count({ where })
    ])

    await AuditLogService.logSystemAction(
      AuditAction.BULK_ACTION_PERFORMED,
      { action: 'LIST_ORGANIZATIONS', count: organizations.length },
      req
    )

    return NextResponse.json({
      organizations: organizations.map(org => ({
        ...org,
        owner: org.users[0] || null,
        users: undefined // Remove detailed user info
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    logger.error('Admin organizations API error:', error)
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
    const { name, slug, ownerId, planId } = body

    if (!name || !ownerId) {
      return NextResponse.json({ 
        error: 'Organization name and owner are required' 
      }, { status: 400 })
    }

    // Check if owner exists
    const owner = await db.user.findUnique({
      where: { id: ownerId }
    })

    if (!owner) {
      return NextResponse.json({ 
        error: 'Owner user not found' 
      }, { status: 400 })
    }

    // Generate unique slug if not provided
    let finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    let counter = 1
    while (await db.organization.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${counter}`
      counter++
    }

    // Create organization
    const organization = await db.organization.create({
      data: {
        name,
        slug: finalSlug,
        settings: {}
      },
      include: {
        _count: {
          select: {
            users: true,
            restaurants: true
          }
        }
      }
    })

    // Update owner's organization
    await db.user.update({
      where: { id: ownerId },
      data: { 
        organizationId: organization.id,
        role: 'OWNER'
      }
    })

    // Create subscription if plan specified
    if (planId) {
      const plan = await db.subscriptionPlan.findUnique({
        where: { id: planId }
      })

      if (plan) {
        await db.subscription.create({
          data: {
            organizationId: organization.id,
            planId: plan.id,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          }
        })
      }
    }

    await AuditLogService.logOrganizationAction(
      AuditAction.ORGANIZATION_CREATED,
      organization.id,
      { 
        name: organization.name,
        slug: organization.slug,
        ownerId,
        createdBy: session.user.id
      },
      req
    )

    return NextResponse.json({
      success: true,
      organization
    })

  } catch (error) {
    logger.error('Admin create organization API error:', error)
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
    const { organizationId, action, ...data } = body

    if (!organizationId || !action) {
      return NextResponse.json({ 
        error: 'Organization ID and action are required' 
      }, { status: 400 })
    }

    const organization = await db.organization.findUnique({
      where: { id: organizationId }
    })

    if (!organization) {
      return NextResponse.json({ 
        error: 'Organization not found' 
      }, { status: 404 })
    }

    let updatedOrganization
    let auditAction: AuditAction
    let auditDetails: any = { organizationId }

    switch (action) {
      case 'update':
        updatedOrganization = await db.organization.update({
          where: { id: organizationId },
          data: {
            name: data.name || organization.name,
            settings: { ...organization.settings, ...data.settings }
          }
        })
        auditAction = AuditAction.ORGANIZATION_UPDATED
        auditDetails.changes = data
        break

      case 'suspend':
        updatedOrganization = await db.organization.update({
          where: { id: organizationId },
          data: { isActive: false }
        })
        auditAction = AuditAction.ORGANIZATION_SUSPENDED
        auditDetails.reason = data.reason
        break

      case 'reactivate':
        updatedOrganization = await db.organization.update({
          where: { id: organizationId },
          data: { isActive: true }
        })
        auditAction = AuditAction.ORGANIZATION_REACTIVATED
        auditDetails.reason = data.reason
        break

      default:
        return NextResponse.json({ 
          error: 'Invalid action' 
        }, { status: 400 })
    }

    await AuditLogService.logOrganizationAction(
      auditAction,
      organizationId,
      auditDetails,
      req
    )

    return NextResponse.json({
      success: true,
      organization: updatedOrganization
    })

  } catch (error) {
    logger.error('Admin update organization API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}