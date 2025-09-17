import { db } from './db';
import { SubscriptionPlan } from '@prisma/client';

export interface SubscriptionLimits {
  restaurants: number; // -1 means unlimited
  products: number;    // -1 means unlimited  
  apiCalls: number;    // -1 means unlimited
}

export interface SubscriptionFeatures {
  publicMenuAPI: boolean;
  basicSupport?: boolean;
  emailSupport?: boolean;
  prioritySupport?: boolean;
  dedicatedSupport?: boolean;
  allIntegrations?: boolean;
  priceSync?: boolean;
  advancedAnalytics?: boolean;
  bulkOperations?: boolean;
  apiWebhooks?: boolean;
  customIntegrations?: boolean;
  slaGuarantee?: boolean;
  whiteLabel?: boolean;
}

export class SubscriptionService {
  /**
   * Get organization's current subscription with plan details
   */
  static async getSubscription(organizationId: string) {
    const subscription = await db.subscriptions.findUnique({
      where: { organizationId },
      include: {
        subscriptionPlan: true
      }
    });

    if (!subscription) {
      // Return default free plan if no subscription exists
      const freePlan = await db.subscription_plans.findUnique({
        where: { tier: 'FREE' }
      });
      
      return {
        id: null,
        organizationId,
        status: 'TRIALING' as const,
        plan: freePlan,
        limits: freePlan?.limits as SubscriptionLimits,
        features: freePlan?.features as SubscriptionFeatures
      };
    }

    return {
      id: subscription.id,
      organizationId: subscription.organizationId,
      status: subscription.status,
      plan: subscription.subscriptionPlan,
      limits: subscription.subscriptionPlan?.limits as SubscriptionLimits,
      features: subscription.subscriptionPlan?.features as SubscriptionFeatures,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
    };
  }

  /**
   * Check if organization can perform an action based on their subscription limits
   */
  static async checkLimit(
    organizationId: string,
    limitType: keyof SubscriptionLimits,
    requestedAmount: number = 1
  ): Promise<{
    allowed: boolean;
    currentUsage?: number;
    limit?: number;
    message?: string;
  }> {
    const subscription = await this.getSubscription(organizationId);
    
    if (!subscription.limits) {
      return { allowed: false, message: 'No subscription limits found' };
    }

    const limit = subscription.limits[limitType];
    
    // -1 means unlimited
    if (limit === -1) {
      return { allowed: true, limit: -1 };
    }

    // Get current usage based on limit type
    let currentUsage = 0;
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month

    switch (limitType) {
      case 'restaurants':
        currentUsage = await db.restaurants.count({
          where: { 
            organizationId,
            isActive: true
          }
        });
        break;
      
      case 'products':
        // Count products: Parent + variants count as 1 product, standalone count as 1
        const allProducts = await db.products.findMany({
          where: {
            menus: {
              restaurants: {
                organizationId,
                isActive: true
              }
            },
            isActive: true
          },
          select: {
            id: true,
            productType: true,
            parentProductId: true
          }
        });
        
        // Count logic: Only count parents and standalone products (not individual variants)
        currentUsage = allProducts.filter(product => 
          product.productType === 'PARENT' || product.productType === 'STANDALONE'
        ).length;
        break;
      
      case 'apiCalls':
        // Get current month's API call usage
        const usage = await db.usage_tracking.findFirst({
          where: {
            organizationId,
            metricType: 'api_calls',
            periodStart: {
              gte: periodStart
            }
          }
        });
        currentUsage = usage?.count || 0;
        break;
    }

    const allowed = currentUsage + requestedAmount <= limit;
    
    return {
      allowed,
      currentUsage,
      limit,
      message: allowed 
        ? undefined 
        : `${limitType} limit exceeded. Current: ${currentUsage}, Limit: ${limit}, Requested: ${requestedAmount}`
    };
  }

  /**
   * Check if organization has access to a specific feature
   */
  static async hasFeature(
    organizationId: string,
    feature: keyof SubscriptionFeatures
  ): Promise<boolean> {
    const subscription = await this.getSubscription(organizationId);
    return subscription.features?.[feature] === true;
  }

  /**
   * Get subscription status for display
   */
  static async getSubscriptionStatus(organizationId: string) {
    const subscription = await this.getSubscription(organizationId);
    
    const isActive = subscription.status === 'ACTIVE' || subscription.status === 'TRIALING';
    const isExpired = subscription.currentPeriodEnd && 
      new Date(subscription.currentPeriodEnd) < new Date();
    
    return {
      ...subscription,
      isActive,
      isExpired,
      daysUntilExpiry: subscription.currentPeriodEnd 
        ? Math.ceil(
            (new Date(subscription.currentPeriodEnd).getTime() - new Date().getTime()) 
            / (1000 * 60 * 60 * 24)
          )
        : null
    };
  }

  /**
   * Track API call usage
   */
  static async trackApiCall(organizationId: string) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    await db.usage_tracking.upsert({
      where: {
        organizationId_metricType_periodStart: {
          organizationId,
          metricType: 'api_calls',
          periodStart
        }
      },
      update: {
        count: {
          increment: 1
        }
      },
      create: {
        id: `${organizationId}_api_${now.getTime()}`,
        organizationId,
        metricType: 'api_calls',
        count: 1,
        periodStart,
        periodEnd
      }
    });
  }

  /**
   * Check if organization can add variants to a parent product based on their subscription limits
   */
  static async checkVariantLimit(
    organizationId: string,
    parentProductId: string,
    requestedAmount: number = 1
  ): Promise<{
    allowed: boolean;
    currentVariants?: number;
    limit?: number;
    message?: string;
  }> {
    const subscription = await this.getSubscription(organizationId);
    
    if (!subscription.plan) {
      return { allowed: false, message: 'No subscription plan found' };
    }

    // Define variant limits per subscription tier
    const variantLimits = {
      FREE: 3,
      STARTER: 5,
      PROFESSIONAL: -1, // unlimited
      ENTERPRISE: -1    // unlimited
    };

    const limit = variantLimits[subscription.plan.tier as keyof typeof variantLimits];
    
    if (limit === undefined) {
      return { allowed: false, message: 'Unknown subscription plan' };
    }

    // -1 means unlimited
    if (limit === -1) {
      return { allowed: true, limit: -1 };
    }

    // Count current variants for this parent product
    const currentVariants = await db.products.count({
      where: {
        parentProductId,
        productType: 'VARIANT',
        isActive: true
      }
    });

    const allowed = currentVariants + requestedAmount <= limit;
    
    return {
      allowed,
      currentVariants,
      limit,
      message: allowed 
        ? undefined 
        : `Variant limit exceeded for ${subscription.plan.tier} plan. Current: ${currentVariants}, Limit: ${limit}, Requested: ${requestedAmount}`
    };
  }

  /**
   * Get usage statistics for an organization
   */
  static async getUsageStats(organizationId: string) {
    const subscription = await this.getSubscription(organizationId);
    
    if (!subscription.limits) {
      return null;
    }

    const stats = await Promise.all([
      this.checkLimit(organizationId, 'restaurants', 0),
      this.checkLimit(organizationId, 'products', 0),
      this.checkLimit(organizationId, 'apiCalls', 0)
    ]);

    return {
      restaurants: stats[0],
      products: stats[1],
      apiCalls: stats[2],
      plan: subscription.plan
    };
  }
}