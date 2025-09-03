import { db } from '../db';
import { logger } from '../logger';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

export interface SubscriptionChangeRequest {
  organizationId: string;
  newPlanId: string;
  effectiveDate?: Date;
  prorationAmount?: number;
  reason?: string;
}

export class SubscriptionManagementService {
  /**
   * Upgrade or downgrade a subscription
   */
  static async changeSubscription({
    organizationId,
    newPlanId,
    effectiveDate = new Date(),
    reason
  }: SubscriptionChangeRequest) {
    try {
      // Get current subscription
      const currentSubscription = await db.subscriptions.findUnique({
        where: { organizationId },
        include: { subscriptionPlan: true }
      });

      if (!currentSubscription) {
        throw new Error('No existing subscription found');
      }

      // Get new plan details
      const newPlan = await db.subscription_plans.findUnique({
        where: { id: newPlanId }
      });

      if (!newPlan) {
        throw new Error('Invalid plan selected');
      }

      // Validate the change is allowed
      await this.validateSubscriptionChange(
        currentSubscription.subscriptionPlan!,
        newPlan,
        organizationId
      );

      // Update subscription
      const updatedSubscription = await db.subscriptions.update({
        where: { organizationId },
        data: {
          planId: newPlanId,
          // Reset period for immediate changes
          currentPeriodStart: effectiveDate,
          currentPeriodEnd: this.calculatePeriodEnd(effectiveDate),
          // Set to trialing for manual changes (Stripe will update this)
          status: 'TRIALING',
          updatedAt: new Date()
        },
        include: {
          subscriptionPlan: true
        }
      });

      // Log the change
      logger.info('Subscription changed:', {
        organizationId,
        oldPlan: currentSubscription.subscriptionPlan?.tier,
        newPlan: newPlan.tier,
        effectiveDate,
        reason
      });

      return {
        success: true,
        subscription: updatedSubscription,
        message: `Successfully changed to ${newPlan.name} plan`
      };

    } catch (error) {
      logger.error('Failed to change subscription:', {
        organizationId,
        newPlanId,
        error: error.message
      });

      throw new Error(`Failed to change subscription: ${error.message}`);
    }
  }

  /**
   * Cancel subscription with optional grace period
   */
  static async cancelSubscription(
    organizationId: string,
    cancelAtPeriodEnd: boolean = true,
    reason?: string
  ) {
    try {
      const subscription = await db.subscriptions.findUnique({
        where: { organizationId },
        include: { subscriptionPlan: true }
      });

      if (!subscription) {
        throw new Error('No subscription found');
      }

      const status: SubscriptionStatus = cancelAtPeriodEnd ? 'ACTIVE' : 'CANCELLED';

      const updatedSubscription = await db.subscriptions.update({
        where: { organizationId },
        data: {
          cancelAtPeriodEnd,
          status,
          updatedAt: new Date()
        }
      });

      logger.info('Subscription cancellation requested:', {
        organizationId,
        cancelAtPeriodEnd,
        currentPeriodEnd: subscription.currentPeriodEnd,
        reason
      });

      return {
        success: true,
        subscription: updatedSubscription,
        message: cancelAtPeriodEnd 
          ? `Your subscription will be cancelled at the end of your billing period (${subscription.currentPeriodEnd.toDateString()})`
          : 'Your subscription has been cancelled immediately'
      };

    } catch (error) {
      logger.error('Failed to cancel subscription:', {
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Reactivate a cancelled subscription
   */
  static async reactivateSubscription(organizationId: string) {
    try {
      const subscription = await db.subscriptions.findUnique({
        where: { organizationId }
      });

      if (!subscription) {
        throw new Error('No subscription found');
      }

      if (subscription.status !== 'CANCELLED' && !subscription.cancelAtPeriodEnd) {
        throw new Error('Subscription is not cancelled');
      }

      const updatedSubscription = await db.subscriptions.update({
        where: { organizationId },
        data: {
          cancelAtPeriodEnd: false,
          status: 'ACTIVE',
          updatedAt: new Date()
        }
      });

      logger.info('Subscription reactivated:', {
        organizationId
      });

      return {
        success: true,
        subscription: updatedSubscription,
        message: 'Your subscription has been reactivated'
      };

    } catch (error) {
      logger.error('Failed to reactivate subscription:', {
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create initial subscription for new organization
   */
  static async createInitialSubscription(organizationId: string, planTier: SubscriptionPlan = 'FREE') {
    try {
      // Get plan details
      const plan = await db.subscription_plans.findUnique({
        where: { tier: planTier }
      });

      if (!plan) {
        throw new Error(`Plan ${planTier} not found`);
      }

      const now = new Date();
      const subscription = await db.subscriptions.create({
        data: {
          id: `sub_${organizationId}_${now.getTime()}`,
          organizationId,
          planId: plan.id,
          status: 'TRIALING',
          currentPeriodStart: now,
          currentPeriodEnd: this.calculatePeriodEnd(now, 30), // 30-day trial
        },
        include: {
          subscriptionPlan: true
        }
      });

      logger.info('Initial subscription created:', {
        organizationId,
        planTier,
        subscriptionId: subscription.id
      });

      return subscription;

    } catch (error) {
      logger.error('Failed to create initial subscription:', {
        organizationId,
        planTier,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get available upgrade/downgrade options
   */
  static async getSubscriptionOptions(organizationId: string) {
    try {
      const currentSubscription = await db.subscriptions.findUnique({
        where: { organizationId },
        include: { subscriptionPlan: true }
      });

      const allPlans = await db.subscription_plans.findMany({
        where: { isActive: true },
        orderBy: { priceMonthly: 'asc' }
      });

      const currentTier = currentSubscription?.subscriptionPlan?.tier;
      
      const options = allPlans.map(plan => ({
        ...plan,
        isCurrent: plan.tier === currentTier,
        isUpgrade: this.isUpgrade(currentTier, plan.tier),
        isDowngrade: this.isDowngrade(currentTier, plan.tier)
      }));

      return {
        currentSubscription,
        availablePlans: options
      };

    } catch (error) {
      logger.error('Failed to get subscription options:', {
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  // Private helper methods

  private static async validateSubscriptionChange(
    currentPlan: any,
    newPlan: any,
    organizationId: string
  ) {
    // Check if downgrading would violate current usage
    if (this.isDowngrade(currentPlan.tier, newPlan.tier)) {
      const newLimits = newPlan.limits as any;
      
      // Check restaurant limit
      if (newLimits.restaurants !== -1) {
        const restaurantCount = await db.restaurants.count({
          where: { organizationId, isActive: true }
        });
        
        if (restaurantCount > newLimits.restaurants) {
          throw new Error(`Cannot downgrade: You have ${restaurantCount} restaurants but the ${newPlan.name} plan only allows ${newLimits.restaurants}`);
        }
      }

      // Check product limit
      if (newLimits.products !== -1) {
        const productCount = await db.products.count({
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
        
        if (productCount > newLimits.products) {
          throw new Error(`Cannot downgrade: You have ${productCount} products but the ${newPlan.name} plan only allows ${newLimits.products}`);
        }
      }
    }
  }

  private static isUpgrade(currentTier?: SubscriptionPlan, newTier?: SubscriptionPlan): boolean {
    const tierOrder = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
    const currentIndex = tierOrder.indexOf(currentTier || 'FREE');
    const newIndex = tierOrder.indexOf(newTier || 'FREE');
    return newIndex > currentIndex;
  }

  private static isDowngrade(currentTier?: SubscriptionPlan, newTier?: SubscriptionPlan): boolean {
    const tierOrder = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
    const currentIndex = tierOrder.indexOf(currentTier || 'FREE');
    const newIndex = tierOrder.indexOf(newTier || 'FREE');
    return newIndex < currentIndex;
  }

  private static calculatePeriodEnd(startDate: Date, days: number = 30): Date {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + days);
    return endDate;
  }
}