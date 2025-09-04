import { db } from '../db'
import { dbService } from '../db-service'
import { logger } from '../logger'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth'

export enum AuditAction {
  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  
  // Organization Management
  ORGANIZATION_CREATED = 'ORGANIZATION_CREATED',
  ORGANIZATION_UPDATED = 'ORGANIZATION_UPDATED',
  ORGANIZATION_DELETED = 'ORGANIZATION_DELETED',
  ORGANIZATION_SUSPENDED = 'ORGANIZATION_SUSPENDED',
  ORGANIZATION_REACTIVATED = 'ORGANIZATION_REACTIVATED',
  
  // Subscription Management
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED = 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  SUBSCRIPTION_UPGRADED = 'SUBSCRIPTION_UPGRADED',
  SUBSCRIPTION_DOWNGRADED = 'SUBSCRIPTION_DOWNGRADED',
  
  // System Actions
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_LOGOUT = 'ADMIN_LOGOUT',
  SYSTEM_SETTINGS_CHANGED = 'SYSTEM_SETTINGS_CHANGED',
  BULK_ACTION_PERFORMED = 'BULK_ACTION_PERFORMED',
  
  // Security Actions
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  SUSPICIOUS_ACTIVITY_DETECTED = 'SUSPICIOUS_ACTIVITY_DETECTED'
}

export interface AuditLogEntry {
  action: AuditAction
  userId?: string
  targetId?: string // ID of the resource being acted upon
  targetType?: 'user' | 'organization' | 'subscription' | 'system'
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

export class AuditLogService {
  /**
   * Log an audit event
   */
  static async log(entry: AuditLogEntry, request?: any): Promise<void> {
    try {
      // Get current session for actor information
      const session = await getServerSession(authOptions)
      
      // Extract IP and user agent from request if available
      const ipAddress = entry.ipAddress || 
        request?.headers?.get('x-forwarded-for') || 
        request?.headers?.get('x-real-ip') || 
        request?.ip || 
        'unknown'
      
      const userAgent = entry.userAgent || 
        request?.headers?.get('user-agent') || 
        'unknown'

      // Create audit log entry in database
      // Note: We'll store this in a separate table for better performance
      const auditEntry = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action: entry.action,
        actorId: session?.user?.id || entry.userId || 'system',
        actorEmail: session?.user?.email,
        actorRole: session?.user?.role,
        targetId: entry.targetId,
        targetType: entry.targetType,
        details: entry.details || {},
        ipAddress,
        userAgent,
        metadata: entry.metadata || {},
        timestamp: new Date(),
      }

      // Log to application logs
      logger.info('Audit log entry', {
        auditId: auditEntry.id,
        action: entry.action,
        actor: auditEntry.actorEmail,
        target: entry.targetId,
        timestamp: auditEntry.timestamp
      })

      // Store in database audit_logs table (with fallback for missing table)
      try {
        await dbService.executeWithRetry(
          (client) => client.audit_logs.create({
            data: {
              id: auditEntry.id,
              action: entry.action,
              actorId: auditEntry.actorId,
              actorEmail: auditEntry.actorEmail,
              actorRole: auditEntry.actorRole,
              targetId: entry.targetId,
              targetType: entry.targetType,
              details: entry.details || {},
              ipAddress: auditEntry.ipAddress,
              userAgent: auditEntry.userAgent,
              metadata: entry.metadata || {},
              timestamp: auditEntry.timestamp
            }
          }),
          'audit_logs.create'
        )
      } catch (dbError) {
        logger.warn('Failed to store audit log in database, continuing with console logging only', {
          error: dbError.message,
          auditId: auditEntry.id
        })
      }
      
      console.log('AUDIT:', JSON.stringify(auditEntry, null, 2))

    } catch (error) {
      logger.error('Failed to create audit log entry', {
        error: error.message,
        entry
      })
      
      // Don't let audit logging failures break the main operation
    }
  }

  /**
   * Log user management actions
   */
  static async logUserAction(
    action: AuditAction,
    targetUserId: string,
    details?: Record<string, any>,
    request?: any
  ): Promise<void> {
    await this.log({
      action,
      targetId: targetUserId,
      targetType: 'user',
      details
    }, request)
  }

  /**
   * Log organization management actions
   */
  static async logOrganizationAction(
    action: AuditAction,
    organizationId: string,
    details?: Record<string, any>,
    request?: any
  ): Promise<void> {
    await this.log({
      action,
      targetId: organizationId,
      targetType: 'organization',
      details
    }, request)
  }

  /**
   * Log subscription management actions
   */
  static async logSubscriptionAction(
    action: AuditAction,
    subscriptionId: string,
    details?: Record<string, any>,
    request?: any
  ): Promise<void> {
    await this.log({
      action,
      targetId: subscriptionId,
      targetType: 'subscription',
      details
    }, request)
  }

  /**
   * Log system-level actions
   */
  static async logSystemAction(
    action: AuditAction,
    details?: Record<string, any>,
    request?: any
  ): Promise<void> {
    await this.log({
      action,
      targetType: 'system',
      details
    }, request)
  }

  /**
   * Log authentication events
   */
  static async logAuthEvent(
    action: AuditAction,
    userId?: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      action,
      userId,
      targetId: userId,
      targetType: 'user',
      details,
      ipAddress,
      userAgent
    })
  }

  /**
   * Get audit logs (for admin interface)
   * In production, this would query a dedicated audit log table
   */
  static async getAuditLogs(options: {
    page?: number
    limit?: number
    userId?: string
    action?: AuditAction
    dateFrom?: Date
    dateTo?: Date
  }) {
    try {
      const { page = 1, limit = 50, userId, action, dateFrom, dateTo } = options
      const skip = (page - 1) * limit

      // Build where clause
      const where: any = {}
      
      if (userId) {
        where.OR = [
          { actorId: userId },
          { targetId: userId }
        ]
      }
      
      if (action) {
        where.action = action
      }
      
      if (dateFrom || dateTo) {
        where.timestamp = {}
        if (dateFrom) where.timestamp.gte = dateFrom
        if (dateTo) where.timestamp.lte = dateTo
      }

      let logs = []
      let total = 0

      try {
        logs = await dbService.executeWithRetry(
          (client) => client.audit_logs.findMany({
            where,
            skip,
            take: limit,
            orderBy: { timestamp: 'desc' }
          }),
          'audit_logs.findMany'
        )
        
        total = await dbService.count('audit_logs', { where })
      } catch (dbError) {
        logger.warn('Failed to retrieve audit logs from database, table may not exist yet', {
          error: dbError.message
        })
        // Return empty results if table doesn't exist
        logs = []
        total = 0
      }

      return {
        logs: logs.map(log => ({
          id: log.id,
          action: log.action,
          actorId: log.actorId,
          actorEmail: log.actorEmail,
          actorRole: log.actorRole,
          targetId: log.targetId,
          targetType: log.targetType,
          details: log.details,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          timestamp: log.timestamp.toISOString()
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }

    } catch (error) {
      logger.error('Failed to retrieve audit logs', {
        error: error.message,
        options
      })

      return {
        logs: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0
      }
    }
  }

  /**
   * Get audit logs for a specific user
   */
  static async getUserAuditLogs(userId: string, limit: number = 10) {
    try {
      // In production, implement user-specific audit log querying
      return {
        logs: [],
        total: 0
      }

    } catch (error) {
      logger.error('Failed to retrieve user audit logs', {
        error: error.message,
        userId
      })

      return {
        logs: [],
        total: 0
      }
    }
  }

  /**
   * Get audit logs for a specific organization
   */
  static async getOrganizationAuditLogs(organizationId: string, limit: number = 10) {
    try {
      // In production, implement organization-specific audit log querying
      return {
        logs: [],
        total: 0
      }

    } catch (error) {
      logger.error('Failed to retrieve organization audit logs', {
        error: error.message,
        organizationId
      })

      return {
        logs: [],
        total: 0
      }
    }
  }

  /**
   * Clean up old audit logs (for maintenance)
   */
  static async cleanupOldLogs(retentionDays: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      logger.info('Audit log cleanup initiated', {
        cutoffDate,
        retentionDays
      })

      // In production, implement actual cleanup logic
      // This would delete audit logs older than the retention period

    } catch (error) {
      logger.error('Failed to cleanup old audit logs', {
        error: error.message,
        retentionDays
      })
    }
  }
}