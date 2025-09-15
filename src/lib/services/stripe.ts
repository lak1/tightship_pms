import Stripe from 'stripe'
import { logger } from '@/lib/logger'
import { db as db } from '@/lib/db'
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: true,
})

export class StripeService {
  /**
   * Create a new Stripe customer
   */
  static async createCustomer(params: {
    email: string
    name?: string
    organizationId: string
    organizationName: string
  }): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.create({
        email: params.email,
        name: params.name || params.organizationName,
        metadata: {
          organizationId: params.organizationId,
          organizationName: params.organizationName,
        },
      })

      logger.info('Stripe customer created', {
        customerId: customer.id,
        email: params.email,
        organizationId: params.organizationId,
      })

      return customer
    } catch (error) {
      logger.error('Failed to create Stripe customer', error as Error, {
        email: params.email,
        organizationId: params.organizationId,
      })
      throw error
    }
  }

  /**
   * Create a checkout session for subscription
   */
  static async createCheckoutSession(params: {
    customerId: string
    planId: string
    successUrl: string
    cancelUrl: string
    organizationId: string
  }): Promise<Stripe.Checkout.Session> {
    try {
      // Get the plan from database
      const plan = await db.subscription_plans.findUnique({
        where: { id: params.planId },
      })

      if (!plan) {
        throw new Error('Subscription plan not found')
      }

      // Create Stripe price if it doesn't exist
      const stripePriceId = await this.getOrCreateStripePrice(plan)

      const session = await stripe.checkout.sessions.create({
        customer: params.customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          organizationId: params.organizationId,
          planId: params.planId,
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        subscription_data: {
          trial_period_days: 14, // 14-day free trial
          metadata: {
            organizationId: params.organizationId,
            planId: params.planId,
          },
        },
      })

      logger.info('Checkout session created', {
        sessionId: session.id,
        customerId: params.customerId,
        planId: params.planId,
        organizationId: params.organizationId,
      })

      return session
    } catch (error) {
      logger.error('Failed to create checkout session', error as Error, {
        customerId: params.customerId,
        planId: params.planId,
        organizationId: params.organizationId,
      })
      throw error
    }
  }

  /**
   * Get or create a Stripe price for a subscription plan
   */
  private static async getOrCreateStripePrice(plan: any): Promise<string> {
    try {
      // Check if price already exists in plan metadata
      if (plan.stripeMonthlyPriceId) {
        return plan.stripeMonthlyPriceId
      }

      // Create product first
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          planId: plan.id,
          tier: plan.tier,
        },
      })

      // Create monthly price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round((plan.priceMonthly || 0) * 100), // Convert to cents
        currency: 'gbp',
        recurring: {
          interval: 'month',
        },
        metadata: {
          planId: plan.id,
          tier: plan.tier,
        },
      })

      // Update plan with Stripe IDs
      await db.subscription_plans.update({
        where: { id: plan.id },
        data: {
          features: {
            ...(plan.features as object),
            stripeProductId: product.id,
            stripeMonthlyPriceId: price.id,
          },
        },
      })

      logger.info('Stripe price created for plan', {
        planId: plan.id,
        productId: product.id,
        priceId: price.id,
      })

      return price.id
    } catch (error) {
      logger.error('Failed to create Stripe price', error as Error, {
        planId: plan.id,
      })
      throw error
    }
  }

  /**
   * Create customer portal session
   */
  static async createPortalSession(params: {
    customerId: string
    returnUrl: string
  }): Promise<Stripe.BillingPortal.Session> {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: params.customerId,
        return_url: params.returnUrl,
      })

      logger.info('Customer portal session created', {
        sessionId: session.id,
        customerId: params.customerId,
      })

      return session
    } catch (error) {
      logger.error('Failed to create portal session', error as Error, {
        customerId: params.customerId,
      })
      throw error
    }
  }

  /**
   * Handle successful checkout completion
   */
  static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const organizationId = session.metadata?.organizationId
      const planId = session.metadata?.planId

      if (!organizationId || !planId) {
        throw new Error('Missing metadata in checkout session')
      }

      const subscription = session.subscription as string
      const stripeSubscription = await stripe.subscriptions.retrieve(subscription)

      // Update or create subscription record
      await db.subscriptions.upsert({
        where: { organizationId },
        update: {
          planId,
          status: stripeSubscription.status === 'trialing' ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
          stripeSubscriptionId: subscription,
          stripeCustomerId: session.customer as string,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          updatedAt: new Date(),
        },
        create: {
          organizationId,
          planId,
          status: stripeSubscription.status === 'trialing' ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
          stripeSubscriptionId: subscription,
          stripeCustomerId: session.customer as string,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        },
      })

      logger.info('Subscription created/updated after successful checkout', {
        organizationId,
        planId,
        stripeSubscriptionId: subscription,
      })
    } catch (error) {
      logger.error('Failed to handle checkout completion', error as Error, {
        sessionId: session.id,
      })
      throw error
    }
  }

  /**
   * Handle subscription updates from webhooks
   */
  static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const organizationId = subscription.metadata?.organizationId

      if (!organizationId) {
        throw new Error('Missing organizationId in subscription metadata')
      }

      await db.subscriptions.update({
        where: { organizationId },
        data: {
          status: this.mapStripeStatusToLocal(subscription.status),
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          updatedAt: new Date(),
        },
      })

      logger.info('Subscription updated from webhook', {
        organizationId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
      })
    } catch (error) {
      logger.error('Failed to handle subscription update', error as Error, {
        subscriptionId: subscription.id,
      })
      throw error
    }
  }

  /**
   * Handle subscription cancellation
   */
  static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      const organizationId = subscription.metadata?.organizationId

      if (!organizationId) {
        throw new Error('Missing organizationId in subscription metadata')
      }

      await db.subscriptions.update({
        where: { organizationId },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelAtPeriodEnd: true,
          updatedAt: new Date(),
        },
      })

      logger.info('Subscription cancelled from webhook', {
        organizationId,
        stripeSubscriptionId: subscription.id,
      })
    } catch (error) {
      logger.error('Failed to handle subscription cancellation', error as Error, {
        subscriptionId: subscription.id,
      })
      throw error
    }
  }

  /**
   * Map Stripe subscription status to local enum
   */
  private static mapStripeStatusToLocal(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
        return SubscriptionStatus.ACTIVE
      case 'trialing':
        return SubscriptionStatus.TRIALING
      case 'past_due':
        return SubscriptionStatus.PAST_DUE
      case 'canceled':
      case 'cancelled':
        return SubscriptionStatus.CANCELLED
      case 'incomplete':
      case 'incomplete_expired':
        return SubscriptionStatus.INCOMPLETE
      default:
        return SubscriptionStatus.INCOMPLETE
    }
  }

  /**
   * Get subscription usage for billing
   */
  static async getSubscriptionUsage(organizationId: string): Promise<{
    apiCalls: number
    restaurants: number
    products: number
  }> {
    try {
      const currentPeriodStart = new Date()
      currentPeriodStart.setMonth(currentPeriodStart.getMonth() - 1)

      const [apiCallsUsage, restaurantCount, productCount] = await Promise.all([
        // Get API calls usage for current period
        db.usage_tracking.aggregate({
          _sum: { count: true },
          where: {
            organizationId,
            metricType: 'api_calls',
            periodStart: { gte: currentPeriodStart },
          },
        }),
        // Get restaurant count
        db.restaurants.count({
          where: { organizationId },
        }),
        // Get product count across all restaurants
        db.products.count({
          where: {
            menus: {
              restaurants: {
                organizationId,
              },
            },
          },
        }),
      ])

      return {
        apiCalls: apiCallsUsage._sum.count || 0,
        restaurants: restaurantCount,
        products: productCount,
      }
    } catch (error) {
      logger.error('Failed to get subscription usage', error as Error, {
        organizationId,
      })
      throw error
    }
  }

  /**
   * Record API usage for billing
   */
  static async recordApiUsage(organizationId: string, count: number = 1): Promise<void> {
    try {
      const now = new Date()
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1) // First of current month
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0) // Last day of current month

      await db.usage_tracking.upsert({
        where: {
          organizationId_metricType_periodStart: {
            organizationId,
            metricType: 'api_calls',
            periodStart,
          },
        },
        update: {
          count: { increment: count },
        },
        create: {
          organizationId,
          metricType: 'api_calls',
          count,
          periodStart,
          periodEnd,
        },
      })
    } catch (error) {
      logger.error('Failed to record API usage', error as Error, {
        organizationId,
        count,
      })
    }
  }
}