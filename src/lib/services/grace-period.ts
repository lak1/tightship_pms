import { db } from '../db';
import { logger } from '../logger';
import { SubscriptionService } from '../subscriptions';

export interface GracePeriodSettings {
  durationDays: number;
  allowedOperations: string[];
  warningThresholds: number[]; // Days before expiry to show warnings
}

export class GracePeriodService {
  // Default grace period settings
  private static readonly DEFAULT_SETTINGS: GracePeriodSettings = {
    durationDays: 7, // 7 days grace period
    allowedOperations: ['read', 'export', 'billing'], // What users can do during grace period
    warningThresholds: [7, 3, 1] // Show warnings at 7, 3, and 1 days before expiry
  };

  /**
   * Check if organization is in grace period
   */
  static async isInGracePeriod(organizationId: string): Promise<{
    inGracePeriod: boolean;
    daysRemaining?: number;
    expiredDate?: Date;
    gracePeriodEnd?: Date;
  }> {
    try {
      const subscription = await SubscriptionService.getSubscription(organizationId);
      
      if (!subscription.currentPeriodEnd) {
        return { inGracePeriod: false };
      }

      const now = new Date();
      const periodEnd = new Date(subscription.currentPeriodEnd);
      
      // Check if subscription has expired
      if (now <= periodEnd) {
        return { inGracePeriod: false };
      }

      // Calculate grace period end
      const gracePeriodEnd = new Date(periodEnd);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.DEFAULT_SETTINGS.durationDays);

      // Check if still within grace period
      if (now <= gracePeriodEnd) {
        const daysRemaining = Math.ceil(
          (gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          inGracePeriod: true,
          daysRemaining,
          expiredDate: periodEnd,
          gracePeriodEnd
        };
      }

      // Grace period has ended
      return {
        inGracePeriod: false,
        daysRemaining: 0,
        expiredDate: periodEnd,
        gracePeriodEnd
      };

    } catch (error) {
      logger.error('Error checking grace period:', {
        organizationId,
        error: error.message
      });
      return { inGracePeriod: false };
    }
  }

  /**
   * Check if operation is allowed during grace period
   */
  static async isOperationAllowed(
    organizationId: string,
    operation: string
  ): Promise<{
    allowed: boolean;
    reason?: string;
    gracePeriodInfo?: any;
  }> {
    try {
      const gracePeriodInfo = await this.isInGracePeriod(organizationId);
      
      // If not in grace period, check normal subscription status
      if (!gracePeriodInfo.inGracePeriod) {
        const subscription = await SubscriptionService.getSubscriptionStatus(organizationId);
        
        if (!subscription.isActive && subscription.isExpired) {
          return {
            allowed: false,
            reason: 'Subscription has expired and grace period has ended',
            gracePeriodInfo
          };
        }
        
        // Normal subscription checks apply
        return { allowed: true };
      }

      // During grace period, only allow specific operations
      const isOperationAllowed = this.DEFAULT_SETTINGS.allowedOperations.includes(operation.toLowerCase());
      
      return {
        allowed: isOperationAllowed,
        reason: isOperationAllowed 
          ? undefined 
          : `Operation '${operation}' is not allowed during grace period. Please update your billing information.`,
        gracePeriodInfo
      };

    } catch (error) {
      logger.error('Error checking operation permission:', {
        organizationId,
        operation,
        error: error.message
      });
      return { allowed: false, reason: 'Unable to verify subscription status' };
    }
  }

  /**
   * Get subscription warnings based on expiry date
   */
  static async getSubscriptionWarnings(organizationId: string) {
    try {
      const subscription = await SubscriptionService.getSubscriptionStatus(organizationId);
      const warnings = [];

      if (!subscription.currentPeriodEnd || !subscription.isActive) {
        return warnings;
      }

      const now = new Date();
      const periodEnd = new Date(subscription.currentPeriodEnd);
      const daysUntilExpiry = Math.ceil(
        (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if we should show warnings
      for (const threshold of this.DEFAULT_SETTINGS.warningThresholds) {
        if (daysUntilExpiry <= threshold && daysUntilExpiry > 0) {
          warnings.push({
            type: daysUntilExpiry <= 1 ? 'critical' : daysUntilExpiry <= 3 ? 'urgent' : 'warning',
            title: `Subscription expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
            message: daysUntilExpiry <= 1 
              ? 'Your subscription expires tomorrow. Update your billing information to avoid service interruption.'
              : `Your subscription expires on ${periodEnd.toDateString()}. Please update your billing information.`,
            daysUntilExpiry,
            expiryDate: periodEnd,
            actionUrl: '/billing'
          });
          break; // Only show one warning
        }
      }

      // Check if already expired and in grace period
      if (daysUntilExpiry <= 0) {
        const gracePeriodInfo = await this.isInGracePeriod(organizationId);
        
        if (gracePeriodInfo.inGracePeriod) {
          warnings.push({
            type: 'critical',
            title: 'Subscription Expired - Grace Period Active',
            message: `Your subscription expired on ${periodEnd.toDateString()}. You have ${gracePeriodInfo.daysRemaining} days remaining in your grace period. Some features may be limited.`,
            daysUntilExpiry: gracePeriodInfo.daysRemaining || 0,
            expiryDate: gracePeriodInfo.gracePeriodEnd,
            actionUrl: '/billing',
            isGracePeriod: true
          });
        } else {
          warnings.push({
            type: 'critical',
            title: 'Subscription Suspended',
            message: 'Your subscription has expired and the grace period has ended. Please update your billing information to restore access.',
            daysUntilExpiry: 0,
            expiryDate: periodEnd,
            actionUrl: '/billing',
            isSuspended: true
          });
        }
      }

      return warnings;

    } catch (error) {
      logger.error('Error getting subscription warnings:', {
        organizationId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Handle expired subscriptions (to be run via cron job)
   */
  static async processExpiredSubscriptions() {
    try {
      const now = new Date();
      
      // Find subscriptions that expired today
      const expiredSubscriptions = await db.subscriptions.findMany({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: {
            lt: now
          }
        },
        include: {
          organizations: true,
          subscriptionPlan: true
        }
      });

      logger.info(`Processing ${expiredSubscriptions.length} expired subscriptions`);

      for (const subscription of expiredSubscriptions) {
        try {
          const gracePeriodInfo = await this.isInGracePeriod(subscription.organizationId);
          
          if (gracePeriodInfo.inGracePeriod) {
            // Still in grace period, log but don't change status
            logger.info(`Organization ${subscription.organizationId} is in grace period`, {
              daysRemaining: gracePeriodInfo.daysRemaining
            });
          } else {
            // Grace period has ended, suspend the subscription
            await db.subscriptions.update({
              where: { id: subscription.id },
              data: { status: 'PAST_DUE' }
            });

            logger.info(`Suspended subscription for organization ${subscription.organizationId}`);
          }
        } catch (error) {
          logger.error(`Error processing expired subscription ${subscription.id}:`, {
            error: error.message
          });
        }
      }

    } catch (error) {
      logger.error('Error processing expired subscriptions:', {
        error: error.message
      });
    }
  }

  /**
   * Restore access after successful payment
   */
  static async restoreAccess(organizationId: string) {
    try {
      const subscription = await db.subscriptions.findUnique({
        where: { organizationId }
      });

      if (!subscription) {
        throw new Error('No subscription found');
      }

      // Calculate new period end (1 month from now)
      const now = new Date();
      const newPeriodEnd = new Date(now);
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

      await db.subscriptions.update({
        where: { organizationId },
        data: {
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: newPeriodEnd,
          cancelAtPeriodEnd: false
        }
      });

      logger.info(`Restored access for organization ${organizationId}`);

      return { success: true };

    } catch (error) {
      logger.error('Error restoring access:', {
        organizationId,
        error: error.message
      });
      throw error;
    }
  }
}