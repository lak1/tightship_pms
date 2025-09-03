import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { hash } from 'bcryptjs'
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
    const role = searchParams.get('role') || 'all'
    const status = searchParams.get('status') || 'all'
    const organizationId = searchParams.get('organizationId') || ''

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (role !== 'all') {
      where.role = role
    }

    if (status !== 'all') {
      where.isActive = status === 'active'
    }

    if (organizationId) {
      where.organizationId = organizationId
    }

    // Get users with organization info
    const [users, total] = await Promise.all([
      db.users.findMany({
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
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      db.users.count({ where })
    ])

    // Remove sensitive information
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      organization: user.organizations,
      organizationId: user.organizationId
    }))

    await AuditLogService.logSystemAction(
      AuditAction.BULK_ACTION_PERFORMED,
      { action: 'LIST_USERS', count: users.length, filters: { role, status, organizationId } },
      req
    )

    return NextResponse.json({
      users: sanitizedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    logger.error('Admin users API error:', error)
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
    const { name, email, password, role, organizationId } = body

    if (!name || !email || !password || !role) {
      return NextResponse.json({ 
        error: 'Name, email, password, and role are required' 
      }, { status: 400 })
    }

    // Validate role
    const validRoles = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role' 
      }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await db.users.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ 
        error: 'User with this email already exists' 
      }, { status: 400 })
    }

    // Validate organization if provided
    if (organizationId) {
      const organization = await db.organizations.findUnique({
        where: { id: organizationId }
      })

      if (!organization) {
        return NextResponse.json({ 
          error: 'Organization not found' 
        }, { status: 400 })
      }
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

    // Create user
    const user = await db.users.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        organizationId: organizationId || null,
        isActive: true
      },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    // Remove sensitive information from response
    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      organization: user.organizations,
      organizationId: user.organizationId
    }

    await AuditLogService.logUserAction(
      AuditAction.USER_CREATED,
      user.id,
      { 
        email: user.email,
        role: user.role,
        organizationId,
        createdBy: session.user.id
      },
      req
    )

    return NextResponse.json({
      success: true,
      user: sanitizedUser
    })

  } catch (error) {
    logger.error('Admin create user API error:', error)
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
    const { userId, action, ...data } = body

    if (!userId || !action) {
      return NextResponse.json({ 
        error: 'User ID and action are required' 
      }, { status: 400 })
    }

    const user = await db.users.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 })
    }

    let updatedUser
    let auditAction: AuditAction
    let auditDetails: any = { userId, targetEmail: user.email }

    switch (action) {
      case 'update':
        const updateData: any = {}
        if (data.name) updateData.name = data.name
        if (data.role && ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'].includes(data.role)) {
          updateData.role = data.role
          auditAction = AuditAction.USER_ROLE_CHANGED
          auditDetails.oldRole = user.role
          auditDetails.newRole = data.role
        }
        if (data.organizationId !== undefined) {
          updateData.organizationId = data.organizationId || null
        }

        updatedUser = await db.users.update({
          where: { id: userId },
          data: updateData,
          include: {
            organizations: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        })
        
        if (!auditAction) {
          auditAction = AuditAction.USER_UPDATED
        }
        auditDetails.changes = updateData
        break

      case 'activate':
        updatedUser = await db.users.update({
          where: { id: userId },
          data: { isActive: true },
          include: {
            organizations: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        })
        auditAction = AuditAction.USER_ACTIVATED
        auditDetails.reason = data.reason
        break

      case 'deactivate':
        updatedUser = await db.users.update({
          where: { id: userId },
          data: { isActive: false },
          include: {
            organizations: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        })
        auditAction = AuditAction.USER_DEACTIVATED
        auditDetails.reason = data.reason
        break

      case 'reset_password':
        if (!data.newPassword) {
          return NextResponse.json({ 
            error: 'New password is required' 
          }, { status: 400 })
        }

        const hashedPassword = await hash(data.newPassword, 12)
        updatedUser = await db.users.update({
          where: { id: userId },
          data: { password: hashedPassword },
          include: {
            organizations: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        })
        auditAction = AuditAction.PASSWORD_RESET_REQUESTED
        auditDetails.resetBy = session.user.id
        break

      default:
        return NextResponse.json({ 
          error: 'Invalid action' 
        }, { status: 400 })
    }

    // Remove sensitive information from response
    const sanitizedUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      emailVerified: updatedUser.emailVerified,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      organization: updatedUser.organizations,
      organizationId: updatedUser.organizationId
    }

    await AuditLogService.logUserAction(
      auditAction,
      userId,
      auditDetails,
      req
    )

    return NextResponse.json({
      success: true,
      user: sanitizedUser
    })

  } catch (error) {
    logger.error('Admin update user API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Check admin access - only OWNER can delete users
    if (!session?.user || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    const user = await db.users.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 })
    }

    // Prevent deletion of other owners
    if (user.role === 'OWNER' && user.id !== session.user.id) {
      return NextResponse.json({ 
        error: 'Cannot delete other owner accounts' 
      }, { status: 403 })
    }

    await db.users.delete({
      where: { id: userId }
    })

    await AuditLogService.logUserAction(
      AuditAction.USER_DELETED,
      userId,
      { 
        email: user.email,
        role: user.role,
        deletedBy: session.user.id
      },
      req
    )

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error) {
    logger.error('Admin delete user API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}