import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db as db } from '@/lib/db'
import { StripeService } from '@/lib/services/stripe'
import { captureError, ErrorCategory } from '@/lib/sentry'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { planId, successUrl, cancelUrl } = body

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }

    // Get user with organization
    const user = await db.users.findUnique({
      where: { id: session.user.id },
      include: {
        organizations: {
          include: {
            subscriptions: true,
          },
        },
      },
    })

    if (!user?.organizations) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const organization = user.organizations
    const subscription = organization.subscriptions

    // Check if organization already has a Stripe customer
    let stripeCustomerId = subscription?.stripeCustomerId

    if (!stripeCustomerId) {
      // Create Stripe customer if doesn't exist
      const stripeCustomer = await StripeService.createCustomer({
        email: user.email,
        name: user.name || organization.name,
        organizationId: organization.id,
        organizationName: organization.name,
      })
      stripeCustomerId = stripeCustomer.id

      // Update subscription with Stripe customer ID
      if (subscription) {
        await db.subscriptions.update({
          where: { organizationId: organization.id },
          data: { stripeCustomerId },
        })
      }
    }

    // Validate plan exists
    const plan = await db.subscription_plans.findUnique({
      where: { id: planId },
    })

    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Create checkout session
    const checkoutSession = await StripeService.createCheckoutSession({
      customerId: stripeCustomerId,
      planId,
      successUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
      organizationId: organization.id,
    })

    logger.info('Checkout session created', {
      userId: user.id,
      organizationId: organization.id,
      planId,
      sessionId: checkoutSession.id,
    })

    return NextResponse.json({
      sessionId: checkoutSession.id,
      sessionUrl: checkoutSession.url,
    })
  } catch (error) {
    captureError(
      error as Error,
      ErrorCategory.PAYMENT,
      {
        operation: 'create_checkout_session',
        userId: (await getServerSession(authOptions))?.user?.id,
      }
    )

    logger.error('Failed to create checkout session', error as Error)
    
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}