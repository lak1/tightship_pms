import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

// Readiness check - ensures the app is ready to handle traffic
export async function GET(request: NextRequest) {
  const timer = logger.time('readiness_check')
  
  try {
    // Check database connectivity
    await db.$queryRaw`SELECT 1 as test`
    
    // Check that critical tables exist
    const userCount = await db.user.count()
    
    timer.end()
    
    return NextResponse.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
        tables: 'ok',
      },
    })
  } catch (error) {
    logger.error('Readiness check failed', error)
    timer.end()
    
    return NextResponse.json(
      {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: 'Service not ready',
      },
      { status: 503 }
    )
  }
}