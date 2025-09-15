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
    const { returnUrl } = body

    // Get user with organization and subscription
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

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 })
    }

    // Create portal session
    const portalSession = await StripeService.createPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    })

    logger.info('Customer portal session created', {
      userId: user.id,
      organizationId: organization.id,
      customerId: subscription.stripeCustomerId,
      sessionId: portalSession.id,
    })

    return NextResponse.json({
      sessionUrl: portalSession.url,
    })
  } catch (error) {
    captureError(
      error as Error,
      ErrorCategory.PAYMENT,
      {
        operation: 'create_portal_session',
        userId: (await getServerSession(authOptions))?.user?.id,
      }
    )

    logger.error('Failed to create customer portal session', error as Error)
    
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}