import { logger } from '@/lib/logger'
import { db } from '@/lib/db'
import Stripe from 'stripe'

/**
 * Dunning Management Service
 * 
 * Stripe automatically handles most dunning management:
 * - Smart Retries (retry failed payments automatically)
 * - Dunning emails (configurable in Stripe dashboard)
 * - Subscription pausing/cancellation
 * 
 * This service handles additional business logic around failed payments
 */
export class DunningService {
  /**
   * Handle failed invoice payment
   * This is called from the webhook handler when invoice.payment_failed is received
   */
  static async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      const subscriptionId = invoice.subscription as string
      const customerId = invoice.customer as string
      const attemptCount = invoice.attempt_count || 0

      logger.info('Processing payment failure', {
        invoiceId: invoice.id,
        subscriptionId,
        customerId,
        attemptCount,
        amountDue: invoice.amount_due,
        nextPaymentAttempt: invoice.next_payment_attempt,
      })

      // Find the organization associated with this customer
      const subscription = await db.subscriptions.findFirst({
        where: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
        },
        include: {
          organizations: {
            include: {
              users: {
                where: { role: 'OWNER' },
                take: 1,
              },
            },
          },
        },
      })

      if (!subscription?.organizations) {
        logger.warn('No subscription found for failed payment', {
          customerId,
          subscriptionId,
        })
        return
      }

      const organization = subscription.organizations
      const owner = organization.users[0]

      // Update subscription status if it's not already marked as past due
      if (subscription.status !== 'PAST_DUE') {
        await db.subscriptions.update({
          where: { id: subscription.id },
          data: { status: 'PAST_DUE' },
        })
      }

      // Handle different attempt counts
      switch (attemptCount) {
        case 1:
          // First failure - just log, Stripe will retry
          logger.info('First payment failure, Stripe will retry', {
            organizationId: organization.id,
            ownerEmail: owner?.email,
          })
          break

        case 2:
          // Second failure - could send additional notification
          logger.warn('Second payment failure', {
            organizationId: organization.id,
            ownerEmail: owner?.email,
          })
          // TODO: Send additional notification email
          break

        case 3:
          // Third failure - more urgent notification
          logger.error('Third payment failure, subscription at risk', {
            organizationId: organization.id,
            ownerEmail: owner?.email,
          })
          // TODO: Send urgent notification
          break

        default:
          // Multiple failures - subscription may be cancelled by Stripe
          logger.error('Multiple payment failures', {
            organizationId: organization.id,
            ownerEmail: owner?.email,
            attemptCount,
          })
          break
      }

      // If this is the final attempt failure (no next_payment_attempt)
      if (!invoice.next_payment_attempt) {
        logger.error('Final payment attempt failed, subscription will be cancelled', {
          organizationId: organization.id,
          subscriptionId,
        })

        // The subscription will be automatically cancelled by Stripe
        // We'll handle the cancellation in the subscription.deleted webhook
      }
    } catch (error) {
      logger.error('Error handling payment failure', error as Error, {
        invoiceId: invoice.id,
      })
      throw error
    }
  }

  /**
   * Handle successful payment after failures
   * This is called when a payment succeeds after previous failures
   */
  static async handlePaymentRecovered(invoice: Stripe.Invoice): Promise<void> {
    try {
      const subscriptionId = invoice.subscription as string
      const customerId = invoice.customer as string

      logger.info('Payment recovered after failures', {
        invoiceId: invoice.id,
        subscriptionId,
        customerId,
        amountPaid: invoice.amount_paid,
      })

      // Find the organization
      const subscription = await db.subscriptions.findFirst({
        where: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
        },
        include: {
          organizations: {
            include: {
              users: {
                where: { role: 'OWNER' },
                take: 1,
              },
            },
          },
        },
      })

      if (!subscription?.organizations) {
        logger.warn('No subscription found for recovered payment', {
          customerId,
          subscriptionId,
        })
        return
      }

      // Update subscription status back to active
      if (subscription.status === 'PAST_DUE') {
        await db.subscriptions.update({
          where: { id: subscription.id },
          data: { status: 'ACTIVE' },
        })

        logger.info('Subscription reactivated after payment recovery', {
          organizationId: subscription.organizationId,
          subscriptionId: subscription.id,
        })
      }

      // TODO: Send payment success/reactivation email
    } catch (error) {
      logger.error('Error handling payment recovery', error as Error, {
        invoiceId: invoice.id,
      })
      throw error
    }
  }

  /**
   * Get organizations with past due subscriptions
   * Useful for admin dashboard and monitoring
   */
  static async getPastDueSubscriptions(): Promise<any[]> {
    try {
      const pastDueSubscriptions = await db.subscriptions.findMany({
        where: {
          status: 'PAST_DUE',
        },
        include: {
          organizations: {
            include: {
              users: {
                where: { role: 'OWNER' },
                take: 1,
              },
            },
          },
          subscriptionPlan: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })

      return pastDueSubscriptions.map(sub => ({
        organizationId: sub.organizationId,
        organizationName: sub.organizations.name,
        ownerEmail: sub.organizations.users[0]?.email,
        planName: sub.subscriptionPlan?.name || sub.plan,
        stripeCustomerId: sub.stripeCustomerId,
        stripeSubscriptionId: sub.stripeSubscriptionId,
        currentPeriodEnd: sub.currentPeriodEnd,
        updatedAt: sub.updatedAt,
      }))
    } catch (error) {
      logger.error('Error fetching past due subscriptions', error as Error)
      throw error
    }
  }

  /**
   * Manual retry payment (admin function)
   * This can be used by admins to manually retry a payment
   */
  static async retryPayment(stripeSubscriptionId: string): Promise<void> {
    try {
      // This would require the Stripe instance
      // For now, just log the action
      logger.info('Manual payment retry requested', {
        stripeSubscriptionId,
      })

      // In a full implementation, you might:
      // 1. Get the latest unpaid invoice
      // 2. Use stripe.invoices.pay() to retry payment
      // 3. Handle the result

      // TODO: Implement manual payment retry via Stripe API
    } catch (error) {
      logger.error('Error retrying payment', error as Error, {
        stripeSubscriptionId,
      })
      throw error
    }
  }
}