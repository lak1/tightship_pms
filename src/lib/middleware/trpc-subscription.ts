import { TRPCError } from '@trpc/server';
import { SubscriptionService } from '../subscriptions';
import { db } from '../db';

export interface TRPCSubscriptionOptions {
  requireFeature?: string;
  requireLimit?: {
    type: 'restaurants' | 'products' | 'apiCalls';
    amount?: number;
  };
  trackApiCall?: boolean;
  allowTrial?: boolean;
}

/**
 * tRPC middleware for subscription checking
 */
export const subscriptionMiddleware = (options: TRPCSubscriptionOptions = {}) => {
  return async ({ ctx, next }: { ctx: any; next: any }) => {
    // Check if user is authenticated
    if (!ctx.session?.user?.email) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    // Get user's organization
    const user = await db.users.findUnique({
      where: { email: ctx.session.user.email },
      include: { organizations: true }
    });

    if (!user?.organizationId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No organization found. Please create an organization first.'
      });
    }

    const organizationId = user.organizationId;

    // Get subscription status
    const subscriptionStatus = await SubscriptionService.getSubscriptionStatus(organizationId);
    
    // Check if subscription is active (unless trial is allowed)
    if (!options.allowTrial && subscriptionStatus.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Active subscription required',
        cause: {
          subscriptionStatus: subscriptionStatus.status,
          upgradeUrl: '/billing'
        }
      });
    }

    // Check if subscription is expired
    if (subscriptionStatus.isExpired && subscriptionStatus.status === 'ACTIVE') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Subscription has expired',
        cause: {
          expiredAt: subscriptionStatus.currentPeriodEnd,
          upgradeUrl: '/billing'
        }
      });
    }

    // Check required feature
    if (options.requireFeature) {
      const hasFeature = await SubscriptionService.hasFeature(
        organizationId, 
        options.requireFeature as any
      );
      
      if (!hasFeature) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `This feature (${options.requireFeature}) requires a higher subscription tier`,
          cause: {
            currentPlan: subscriptionStatus.plan?.name,
            upgradeUrl: '/billing'
          }
        });
      }
    }

    // Check usage limits
    if (options.requireLimit) {
      const limitCheck = await SubscriptionService.checkLimit(
        organizationId,
        options.requireLimit.type,
        options.requireLimit.amount || 1
      );

      if (!limitCheck.allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: limitCheck.message || 'Usage limit exceeded',
          cause: {
            currentUsage: limitCheck.currentUsage,
            limit: limitCheck.limit,
            upgradeUrl: '/billing'
          }
        });
      }
    }

    // Track API call if requested
    if (options.trackApiCall) {
      // Don't await this to avoid slowing down the response
      SubscriptionService.trackApiCall(organizationId).catch(console.error);
    }

    // Add subscription context
    ctx.subscription = subscriptionStatus;
    ctx.organizationId = organizationId;
    ctx.user = user;

    return next();
  };
};

/**
 * Helper to create subscription-aware procedures
 */
export const createSubscriptionProcedure = (
  baseProcedure: any,
  options: TRPCSubscriptionOptions = {}
) => {
  return baseProcedure.use(subscriptionMiddleware({
    ...options,
    trackApiCall: true // Always track API calls for procedures
  }));
};