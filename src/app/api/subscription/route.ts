import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db as db } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with organization and subscription
    const user = await db.users.findUnique({
      where: { id: session.user.id },
      include: {
        organizations: {
          include: {
            subscriptions: {
              include: {
                subscriptionPlan: true,
              },
            },
          },
        },
      },
    })

    if (!user?.organizations) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const subscription = user.organizations.subscriptions

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    logger.info('Subscription data retrieved', {
      userId: user.id,
      organizationId: user.organizations.id,
      subscriptionId: subscription.id,
    })

    return NextResponse.json(subscription)
  } catch (error) {
    logger.error('Failed to fetch subscription', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}