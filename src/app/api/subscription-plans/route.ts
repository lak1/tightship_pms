import { NextRequest, NextResponse } from 'next/server'
import { db as db } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const plans = await db.subscription_plans.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    })

    return NextResponse.json(plans)
  } catch (error) {
    logger.error('Failed to fetch subscription plans', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    )
  }
}