import { db } from '../db';
import { logger } from '../logger';

export interface UsageMetric {
  organizationId: string;
  metricType: 'api_calls' | 'restaurants' | 'products' | 'integrations' | 'menu_syncs';
  count: number;
  periodStart: Date;
  periodEnd: Date;
  metadata?: Record<string, any>;
}

export class UsageTrackingService {
  /**
   * Track a single usage event
   */
  static async trackUsage(
    organizationId: string,
    metricType: UsageMetric['metricType'],
    amount: number = 1,
    metadata?: Record<string, any>
  ) {
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      await db.usage_tracking.upsert({
        where: {
          organizationId_metricType_periodStart: {
            organizationId,
            metricType,
            periodStart
          }
        },
        update: {
          count: {
            increment: amount
          }
        },
        create: {
          id: `${organizationId}_${metricType}_${now.getTime()}`,
          organizationId,
          metricType,
          count: amount,
          periodStart,
          periodEnd
        }
      });

      logger.debug(`Tracked usage: ${organizationId} - ${metricType}: +${amount}`, {
        organizationId,
        metricType,
        amount,
        metadata
      });

    } catch (error) {
      logger.error('Failed to track usage:', {
        organizationId,
        metricType,
        amount,
        error: error.message
      });
    }
  }

  /**
   * Get usage statistics for an organization
   */
  static async getUsageStats(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const now = new Date();
    const defaultStartDate = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEndDate = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const usage = await db.usage_tracking.findMany({
      where: {
        organizationId,
        periodStart: {
          gte: defaultStartDate
        },
        periodEnd: {
          lte: defaultEndDate
        }
      },
      orderBy: [
        { metricType: 'asc' },
        { periodStart: 'desc' }
      ]
    });

    // Aggregate by metric type
    const aggregated = usage.reduce((acc, record) => {
      if (!acc[record.metricType]) {
        acc[record.metricType] = {
          total: 0,
          periods: []
        };
      }
      
      acc[record.metricType].total += record.count;
      acc[record.metricType].periods.push({
        periodStart: record.periodStart,
        periodEnd: record.periodEnd,
        count: record.count
      });
      
      return acc;
    }, {} as Record<string, { total: number; periods: any[] }>);

    return aggregated;
  }

  /**
   * Get current month usage for a specific metric
   */
  static async getCurrentUsage(
    organizationId: string,
    metricType: UsageMetric['metricType']
  ): Promise<number> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const usage = await db.usage_tracking.findFirst({
      where: {
        organizationId,
        metricType,
        periodStart: {
          gte: periodStart
        }
      }
    });

    return usage?.count || 0;
  }

  /**
   * Get usage history for analytics
   */
  static async getUsageHistory(
    organizationId: string,
    metricType?: UsageMetric['metricType'],
    months: number = 12
  ) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

    const usage = await db.usage_tracking.findMany({
      where: {
        organizationId,
        ...(metricType && { metricType }),
        periodStart: {
          gte: startDate
        }
      },
      orderBy: [
        { periodStart: 'desc' },
        { metricType: 'asc' }
      ]
    });

    return usage;
  }

  /**
   * Track API call with additional context
   */
  static async trackApiCall(
    organizationId: string,
    endpoint?: string,
    method?: string,
    userAgent?: string
  ) {
    await this.trackUsage(organizationId, 'api_calls', 1, {
      endpoint,
      method,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track integration sync
   */
  static async trackIntegrationSync(
    organizationId: string,
    integrationType: string,
    itemsSynced: number,
    success: boolean
  ) {
    await this.trackUsage(organizationId, 'menu_syncs', 1, {
      integrationType,
      itemsSynced,
      success,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get usage alerts (when approaching limits)
   */
  static async getUsageAlerts(organizationId: string) {
    try {
      // Get current subscription limits
      const subscription = await db.subscriptions.findUnique({
        where: { organizationId },
        include: { subscriptionPlan: true }
      });

      if (!subscription?.subscriptionPlan?.limits) {
        return [];
      }

      const limits = subscription.subscriptionPlan.limits as any;
      const alerts = [];

      // Check each limit
      for (const [limitType, limitValue] of Object.entries(limits)) {
        if (limitValue === -1) continue; // Unlimited

        let currentUsage = 0;
        
        switch (limitType) {
          case 'apiCalls':
            currentUsage = await this.getCurrentUsage(organizationId, 'api_calls');
            break;
          case 'restaurants':
            currentUsage = await db.restaurants.count({
              where: { organizationId, isActive: true }
            });
            break;
          case 'products':
            currentUsage = await db.products.count({
              where: {
                menus: {
                  restaurants: {
                    organizationId,
                    isActive: true
                  }
                },
                isActive: true
              }
            });
            break;
        }

        const usagePercentage = (currentUsage / Number(limitValue)) * 100;

        // Alert at 80% and 95% usage
        if (usagePercentage >= 95) {
          alerts.push({
            type: 'critical',
            metric: limitType,
            currentUsage,
            limit: limitValue,
            percentage: usagePercentage,
            message: `${limitType} usage is at ${usagePercentage.toFixed(1)}% of your limit`
          });
        } else if (usagePercentage >= 80) {
          alerts.push({
            type: 'warning',
            metric: limitType,
            currentUsage,
            limit: limitValue,
            percentage: usagePercentage,
            message: `${limitType} usage is at ${usagePercentage.toFixed(1)}% of your limit`
          });
        }
      }

      return alerts;

    } catch (error) {
      logger.error('Failed to get usage alerts:', {
        organizationId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Reset usage for testing (development only)
   */
  static async resetUsage(organizationId: string) {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Reset usage is only available in development');
    }

    await db.usage_tracking.deleteMany({
      where: { organizationId }
    });

    logger.info(`Reset usage for organization: ${organizationId}`);
  }
}