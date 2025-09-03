import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth';
import { SubscriptionService } from '../subscriptions';
import { db } from '../db';

export interface SubscriptionMiddlewareOptions {
  requireFeature?: string;
  requireLimit?: {
    type: 'restaurants' | 'products' | 'apiCalls';
    amount?: number;
  };
  trackApiCall?: boolean;
  allowTrial?: boolean;
}

/**
 * Middleware factory for checking subscription limits and features
 */
export function withSubscriptionCheck(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  options: SubscriptionMiddlewareOptions = {}
) {
  return async (req: NextRequest, context: any = {}) => {
    try {
      // Get session
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Get user's organization
      const user = await db.users.findUnique({
        where: { email: session.user.email },
        include: { organizations: true }
      });

      if (!user?.organizationId) {
        return NextResponse.json({ 
          error: 'No organization found. Please create an organization first.' 
        }, { status: 400 });
      }

      const organizationId = user.organizationId;

      // Get subscription status
      const subscriptionStatus = await SubscriptionService.getSubscriptionStatus(organizationId);
      
      // Check if subscription is active (unless trial is allowed)
      if (!options.allowTrial && subscriptionStatus.status !== 'ACTIVE') {
        return NextResponse.json({
          error: 'Active subscription required',
          subscriptionStatus: subscriptionStatus.status,
          upgradeUrl: '/billing'
        }, { status: 402 }); // Payment Required
      }

      // Check if subscription is expired
      if (subscriptionStatus.isExpired && subscriptionStatus.status === 'ACTIVE') {
        return NextResponse.json({
          error: 'Subscription has expired',
          expiredAt: subscriptionStatus.currentPeriodEnd,
          upgradeUrl: '/billing'
        }, { status: 402 });
      }

      // Check required feature
      if (options.requireFeature) {
        const hasFeature = await SubscriptionService.hasFeature(
          organizationId, 
          options.requireFeature as any
        );
        
        if (!hasFeature) {
          return NextResponse.json({
            error: `This feature (${options.requireFeature}) requires a higher subscription tier`,
            currentPlan: subscriptionStatus.plan?.name,
            upgradeUrl: '/billing'
          }, { status: 402 });
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
          return NextResponse.json({
            error: limitCheck.message,
            currentUsage: limitCheck.currentUsage,
            limit: limitCheck.limit,
            upgradeUrl: '/billing'
          }, { status: 402 });
        }
      }

      // Track API call if requested
      if (options.trackApiCall) {
        // Don't await this to avoid slowing down the response
        SubscriptionService.trackApiCall(organizationId).catch(console.error);
      }

      // Add subscription context to request
      context.subscription = subscriptionStatus;
      context.organizationId = organizationId;
      context.user = user;

      // Call the actual handler
      return await handler(req, context);

    } catch (error) {
      console.error('Subscription middleware error:', error);
      return NextResponse.json({ 
        error: 'Internal server error' 
      }, { status: 500 });
    }
  };
}

/**
 * Helper function to create subscription-aware API handlers
 */
export function createSubscriptionHandler(
  handlers: {
    GET?: (req: NextRequest, context: any) => Promise<NextResponse>;
    POST?: (req: NextRequest, context: any) => Promise<NextResponse>;
    PUT?: (req: NextRequest, context: any) => Promise<NextResponse>;
    DELETE?: (req: NextRequest, context: any) => Promise<NextResponse>;
  },
  options: SubscriptionMiddlewareOptions = {}
) {
  const wrappedHandlers: any = {};

  for (const [method, handler] of Object.entries(handlers)) {
    if (handler) {
      wrappedHandlers[method] = withSubscriptionCheck(handler, {
        ...options,
        trackApiCall: true // Always track API calls
      });
    }
  }

  return wrappedHandlers;
}

/**
 * Rate limiting based on subscription tier
 */
export async function getSubscriptionRateLimit(organizationId: string) {
  const subscription = await SubscriptionService.getSubscription(organizationId);
  
  // Define rate limits based on tier (requests per minute)
  const rateLimits = {
    FREE: 10,
    STARTER: 30,
    PROFESSIONAL: 100,
    ENTERPRISE: 1000
  };

  const tier = subscription.plan?.tier || 'FREE';
  return rateLimits[tier as keyof typeof rateLimits] || 10;
}