import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db as db } from '@/lib/db'
import { StripeService } from '@/lib/services/stripe'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with organization
    const user = await db.users.findUnique({
      where: { id: session.user.id },
      include: {
        organizations: true,
      },
    })

    if (!user?.organizations) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get usage data
    const usage = await StripeService.getSubscriptionUsage(user.organizations.id)

    logger.info('Usage data retrieved', {
      userId: user.id,
      organizationId: user.organizations.id,
      usage,
    })

    return NextResponse.json(usage)
  } catch (error) {
    logger.error('Failed to fetch usage', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    )
  }
}