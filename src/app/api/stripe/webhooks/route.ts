import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe, StripeService } from '@/lib/services/stripe'
import { DunningService } from '@/lib/services/dunning'
import { logger } from '@/lib/logger'
import { captureError, ErrorCategory } from '@/lib/sentry'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (error) {
    logger.error('Webhook signature verification failed', error as Error, {
      signature: signature.substring(0, 50) + '...',
    })
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  logger.info('Stripe webhook received', {
    eventType: event.type,
    eventId: event.id,
  })

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer)
        break

      default:
        logger.info('Unhandled webhook event type', { eventType: event.type })
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('Webhook handler error', error as Error, {
      eventType: event.type,
      eventId: event.id,
    })

    captureError(
      error as Error,
      ErrorCategory.WEBHOOK,
      {
        eventType: event.type,
        eventId: event.id,
      }
    )

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  logger.info('Processing checkout completion', { sessionId: session.id })
  await StripeService.handleCheckoutCompleted(session)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  logger.info('Processing subscription update', {
    subscriptionId: subscription.id,
    status: subscription.status,
  })
  await StripeService.handleSubscriptionUpdated(subscription)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  logger.info('Processing subscription deletion', {
    subscriptionId: subscription.id,
  })
  await StripeService.handleSubscriptionDeleted(subscription)
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  logger.info('Processing successful invoice payment', {
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
    amount: invoice.amount_paid,
  })

  // Check if this was a recovery after failed payments
  if (invoice.attempt_count && invoice.attempt_count > 1) {
    await DunningService.handlePaymentRecovered(invoice)
  }

  // Could trigger email notifications, update internal accounting, etc.
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  logger.info('Processing failed invoice payment', {
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
    amount: invoice.amount_due,
    attemptCount: invoice.attempt_count,
  })

  // Handle failed payments with dunning management
  await DunningService.handlePaymentFailed(invoice)
}

async function handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
  logger.info('Processing customer update', {
    customerId: customer.id,
    email: customer.email,
  })

  // Update customer information in local database if needed
  // For now, Stripe is the source of truth for customer data
}